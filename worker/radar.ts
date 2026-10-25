import { createClient } from '@supabase/supabase-js';
import { createServer } from 'node:http';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { RadarProcessor, safeJobError } from '../server/radar/processor.js';
import { checked, enqueue, event } from '../server/radar/store.js';
import { radarSettingsSchema } from '../lib/radar.js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || !process.env.AI_SETTINGS_ENCRYPTION_KEY)
  throw new Error('Configure o ambiente privado do worker Radar.');
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const processor = new RadarProcessor(db);
const token = randomUUID();
let stopping = false,
  lastSchedule = 0,
  lastCleanup = 0;
const localDay = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const localHour = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
async function schedule() {
  const rows = checked(await db.from('radar_settings').select('owner_id,spec'));
  for (const row of rows) {
    const spec = radarSettingsSchema.parse(row.spec);
    if (spec.collectionEnabled && localHour() >= spec.collectionHour)
      await enqueue(db, row.owner_id, 'collect', {}, `scheduled:${localDay()}`);
    if (localHour() >= '09:00')
      await enqueue(db, row.owner_id, 'report', { period: 'daily' }, `daily:${localDay()}`);
    if (
      localHour() >= '09:00' &&
      ['Monday', 'Wednesday', 'Friday'].includes(
        new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(
          new Date(),
        ),
      )
    )
      await queueScript(row.owner_id, spec);
    if (
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(
        new Date(),
      ) === 'Monday' &&
      localHour() >= '09:00'
    )
      await enqueue(db, row.owner_id, 'report', { period: 'weekly' }, `weekly:${localDay()}`);
  }
}
async function queueScript(owner: string, spec: ReturnType<typeof radarSettingsSchema.parse>) {
  if (!spec.autoScript || !spec.profileId) return { paused: true };
  const analyses = checked(
    await db
      .from('radar_analyses')
      .select('content_id,mode')
      .eq('owner_id', owner)
      .in('mode', ['FULL', 'AUDIO_ONLY', 'VISUAL_ONLY'])
      .order('created_at', { ascending: false })
      .limit(30),
  );
  const scripts = checked(
    await db
      .from('radar_scripts')
      .select('content_id')
      .eq('owner_id', owner)
      .eq('profile_id', spec.profileId),
  );
  const next = analyses.find((a: any) => !scripts.some((s: any) => s.content_id === a.content_id));
  if (!next) return { available: false };
  return enqueue(
    db,
    owner,
    'script',
    {
      contentId: next.content_id,
      profileId: spec.profileId,
      duration: 45,
      instruction: 'Roteiro original para o calendário do perfil.',
      part: 'all',
    },
    `scheduled-script:${localDay()}`,
  );
}
async function cleanup() {
  const settings = checked(await db.from('radar_settings').select('owner_id,spec'));
  for (const row of settings) {
    const spec = radarSettingsSchema.parse(row.spec);
    const before = Date.now() - spec.retentionHours * 3600000;
    let inspected = 0;
    const walk = async (prefix: string, depth = 0): Promise<void> => {
      if (depth > 3 || inspected > 1000) return;
      const result = await db.storage.from('radar-media').list(prefix, { limit: 1000 });
      checked(result);
      for (const object of result.data || []) {
        inspected++;
        const path = `${prefix}/${object.name}`;
        if (!object.id) await walk(path, depth + 1);
        else if (Date.parse(object.created_at) < before)
          checked(await db.storage.from('radar-media').remove([path]));
      }
    };
    await walk(row.owner_id);
  }
  const rows = checked(
    await db
      .from('radar_contents')
      .select('id,owner_id,media_path,payload')
      .not('media_path', 'is', null)
      .limit(500),
  );
  for (const c of rows)
    if (c.payload.mediaExpiresAt && Date.parse(c.payload.mediaExpiresAt) < Date.now()) {
      if (c.media_path.startsWith(`${c.owner_id}/${c.id}/`)) {
        checked(await db.storage.from('radar-media').remove([c.media_path]));
        checked(
          await db
            .from('radar_contents')
            .update({ media_path: null })
            .eq('id', c.id)
            .eq('owner_id', c.owner_id),
        );
      }
    }
  const analyses = checked(
    await db.from('radar_analyses').select('id,owner_id,content_id,data').limit(2000),
  );
  for (const a of analyses) {
    const expired =
      a.data.evidence?.frames?.filter(
        (f: any) =>
          Date.parse(f.expiresAt) < Date.now() &&
          f.path.startsWith(`${a.owner_id}/${a.content_id}/`),
      ) || [];
    if (expired.length)
      checked(await db.storage.from('radar-media').remove(expired.map((f: any) => f.path)));
  }
}
async function loop() {
  while (!stopping) {
    try {
      if (Date.now() - lastSchedule > 60000) {
        checked(
          await db.from('radar_worker_state').upsert({
            id: 'vps',
            last_run: new Date().toISOString(),
            capabilities: { ffmpeg: true, transcription: true, version: 1 },
          }),
        );
        // Expired final attempts must become visible failures instead of remaining running forever.
        checked(
          await db
            .from('radar_jobs')
            .update({
              status: 'failed',
              error:
                'A execução foi interrompida após três tentativas. Confira a tarefa antes de retomar.',
              lease_until: null,
            })
            .eq('status', 'running')
            .lt('lease_until', new Date().toISOString())
            .gte('attempts', 3),
        );
        await schedule();
        lastSchedule = Date.now();
      }
      if (Date.now() - lastCleanup > 3600000) {
        await cleanup();
        lastCleanup = Date.now();
      }
      const jobs = checked(await db.rpc('claim_radar_job', { p_token: token }));
      const job = jobs?.[0];
      if (!job) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      // Heartbeats protect long operations; all updates are fenced by the lease token.
      const heartbeat = setInterval(() => {
        void db
          .from('radar_jobs')
          .update({
            lease_until: new Date(Date.now() + 600000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id)
          .eq('lease_token', token)
          .eq('status', 'running')
          .then(() => {});
      }, 60000);
      try {
        if (job.payload.startPending && !job.payload.apifyRunId)
          throw new Error(
            'Não foi possível confirmar o início no Apify. Confira as execuções antes de coletar novamente.',
          );
        await processor.process(job);
        if (job.status === 'running')
          await processor.patch(job, { status: 'succeeded', lease_until: null, error: null });
      } catch (e) {
        const error = safeJobError(e);
        // Model/budget/media errors require intervention; do not automatically repeat paid calls.
        await processor.patch(job, { status: 'failed', lease_until: null, error });
        await event(db, job.owner_id, 'error', error, job.id);
        console.error(JSON.stringify({ job: job.id, status: 'failed', error }));
      } finally {
        clearInterval(heartbeat);
      }
    } catch {
      console.error('Radar: falha temporária de conexão. Nova tentativa em 15 segundos.');
      await new Promise((r) => setTimeout(r, 15000));
    }
  }
}
function authorized(header: string | undefined) {
  const expected = process.env.RADAR_INTERNAL_TOKEN;
  if (!expected) return false;
  const received = header?.replace(/^Bearer /, '') || '';
  const receivedBytes = Buffer.from(received),
    expectedBytes = Buffer.from(expected);
  return (
    receivedBytes.length === expectedBytes.length && timingSafeEqual(receivedBytes, expectedBytes)
  );
}
const server = createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'vontta-radar' }));
    return;
  }
  if (
    req.url !== '/internal/radar' ||
    req.method !== 'POST' ||
    !authorized(req.headers.authorization)
  ) {
    res.statusCode = 401;
    res.end('{"error":"Unauthorized"}');
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 16000) throw new Error('limit');
    }
    const b = JSON.parse(body);
    const owner = process.env.RADAR_OWNER_ID;
    if (
      !owner ||
      !['collect', 'rank', 'analyze', 'scripts', 'daily', 'weekly', 'operations'].includes(b.action)
    )
      throw new Error('action');
    let result;
    if (b.action === 'operations') {
      await cleanup();
      await schedule();
      result = { ok: true };
    } else if (b.action === 'analyze') {
      result = await enqueue(db, owner, 'trends', {}, `auto-analysis:${localDay()}`);
    } else if (b.action === 'scripts') {
      const row = checked(
        await db.from('radar_settings').select('spec').eq('owner_id', owner).single(),
      );
      result = await queueScript(owner, radarSettingsSchema.parse(row.spec));
    } else if (b.action === 'collect') {
      const row = checked(
        await db.from('radar_settings').select('spec').eq('owner_id', owner).single(),
      );
      const spec = radarSettingsSchema.parse(row.spec);
      result = spec.collectionEnabled
        ? await enqueue(db, owner, 'collect', {}, `scheduled:${localDay()}`)
        : { paused: true };
    } else {
      const kind = b.action === 'rank' ? 'trends' : 'report';
      result = await enqueue(
        db,
        owner,
        kind,
        kind === 'report' ? { period: b.action === 'weekly' ? 'weekly' : 'daily' } : {},
        `${b.action === 'collect' ? 'scheduled' : b.action}:${localDay()}`,
      );
    }
    res.statusCode = 202;
    res.end(JSON.stringify({ ok: true, result }));
  } catch {
    res.statusCode = 400;
    res.end('{"error":"Invalid request"}');
  }
});
server.listen(Number(process.env.RADAR_PORT || 8795), '0.0.0.0', () =>
  console.log('Radar worker iniciado.'),
);
process.on('SIGTERM', () => {
  stopping = true;
  server.close();
});
process.on('SIGINT', () => {
  stopping = true;
  server.close();
});
void loop();
