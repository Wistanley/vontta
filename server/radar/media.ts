import { spawn } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';
import { createWriteStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import type { RadarSettings } from '../../lib/radar.js';

export function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || b === 2)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0) ||
      a >= 224
    );
  }
  // Accept only global-unicast IPv6. Mapped IPv4, local, multicast and special ranges are rejected.
  return (
    isIP(address) === 6 &&
    /^[23]/i.test(address) &&
    !address.toLowerCase().startsWith('2001:db8') &&
    !address.toLowerCase().startsWith('2001:0:')
  );
}
export async function downloadPublic(
  url: string,
  destination: string,
  maxBytes: number,
  redirects = 0,
): Promise<void> {
  if (redirects > 3) throw new Error('Muitos redirecionamentos no download.');
  const u = new URL(url);
  if (u.protocol !== 'https:' || (u.port && u.port !== '443') || u.username || u.password)
    throw new Error('URL de mídia não permitida.');
  const addresses = await lookup(u.hostname, { all: true });
  if (!addresses.length || addresses.some((x) => !publicAddress(x.address)))
    throw new Error('Endereço de mídia privado ou reservado.');
  const selected = addresses[0];
  await new Promise<void>((resolve, reject) => {
    const req = https.get(
      u,
      {
        timeout: 30000,
        lookup: (_host, _opts, cb: any) => cb(null, selected.address, selected.family),
        headers: { 'User-Agent': 'VonttaRadar/1.0' },
      },
      async (response) => {
        try {
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            response.resume();
            await downloadPublic(
              new URL(response.headers.location, u).toString(),
              destination,
              maxBytes,
              redirects + 1,
            );
            resolve();
            return;
          }
          if (response.statusCode !== 200) {
            response.resume();
            throw new Error('A plataforma não disponibilizou o arquivo de mídia.');
          }
          if (Number(response.headers['content-length'] || 0) > maxBytes) {
            response.destroy();
            throw new Error('Mídia acima do limite de tamanho.');
          }
          let total = 0;
          const limiter = new Transform({
            transform(chunk, _enc, cb) {
              total += chunk.length;
              cb(total > maxBytes ? new Error('Mídia acima do limite de tamanho.') : null, chunk);
            },
          });
          const timer = setTimeout(
            () => response.destroy(new Error('Tempo limite de download.')),
            90000,
          );
          try {
            await pipeline(response, limiter, createWriteStream(destination, { flags: 'wx' }));
          } finally {
            clearTimeout(timer);
          }
          resolve();
        } catch (e) {
          reject(e);
        }
      },
    );
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('Tempo limite de conexão.')));
  });
}
export async function runMedia(program: string, args: string[], timeout = 45000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '',
      err = '';
    child.stdout.on('data', (b) => {
      out += b;
      if (out.length > 2000000) child.kill('SIGKILL');
    });
    child.stderr.on('data', (b) => {
      err = (err + b).slice(-8000);
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      code === 0
        ? resolve(out)
        : reject(new Error('Não foi possível processar este arquivo de mídia.'));
    });
  });
}
export async function extractMedia(file: string, dir: string, spec: RadarSettings) {
  if ((await stat(file)).size > spec.maxFileMb * 1024 * 1024)
    throw new Error('Arquivo acima do limite configurado.');
  const protocol = [
    '-protocol_whitelist',
    'file,pipe',
    '-format_whitelist',
    'mov,matroska,webm,mp3,wav',
  ];
  const probe = JSON.parse(
    await runMedia(process.env.FFPROBE_PATH || 'ffprobe', [
      ...protocol,
      '-v',
      'error',
      '-show_format',
      '-show_streams',
      '-of',
      'json',
      file,
    ]),
  );
  const duration = Number(probe.format?.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > spec.maxDuration)
    throw new Error(`O vídeo deve ter até ${spec.maxDuration} segundos e duração identificável.`);
  const video = probe.streams?.find((s: any) => s.codec_type === 'video');
  const audio = probe.streams?.find((s: any) => s.codec_type === 'audio');
  const warnings: string[] = [];
  const frames: { timestamp: number; file: string }[] = [];
  let audioFile: string | null = null;
  if (audio)
    try {
      audioFile = join(dir, 'audio.mp3');
      await runMedia(process.env.FFMPEG_PATH || 'ffmpeg', [
        '-y',
        ...protocol,
        '-i',
        file,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-b:a',
        '48k',
        '-t',
        String(spec.maxDuration),
        audioFile,
      ]);
    } catch {
      audioFile = null;
      warnings.push('Não foi possível extrair áudio.');
    }
  if (video) {
    const points = new Set([0, 1, 2, 3].filter((t) => t < duration));
    for (let i = 1; i <= spec.maxFrames - 4; i++)
      points.add(Math.round((((duration - 0.1) * i) / (spec.maxFrames - 4)) * 10) / 10);
    for (const timestamp of [...points].sort((a, b) => a - b).slice(0, spec.maxFrames))
      try {
        const frame = join(dir, `frame-${timestamp}.jpg`);
        await runMedia(
          process.env.FFMPEG_PATH || 'ffmpeg',
          [
            '-y',
            '-ss',
            String(timestamp),
            ...protocol,
            '-i',
            file,
            '-frames:v',
            '1',
            '-vf',
            'scale=720:720:force_original_aspect_ratio=decrease',
            '-q:v',
            '4',
            frame,
          ],
          20000,
        );
        if ((await stat(frame)).size) frames.push({ timestamp, file: frame });
      } catch {
        warnings.push(`Frame ${timestamp}s indisponível.`);
      }
  }
  if (!video) warnings.push('Arquivo sem faixa de vídeo.');
  if (!audio) warnings.push('Arquivo sem faixa de áudio.');
  return { duration, frames, audioFile, warnings };
}
