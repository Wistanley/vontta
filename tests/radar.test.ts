import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import handler from '../api/radar';
import {
  canonicalPost,
  normalizeReference,
  noMetrics,
  scoreContent,
  analysisMode,
  enforceAnalysisEvidence,
  radarDefaults,
  type RadarContent,
  type MediaEvidence,
} from '../lib/radar';
import { normalizeApify, fillInput } from '../server/radar/apify';
import { publicAddress, downloadPublic } from '../server/radar/media';
const source: any = { id: randomUUID(), platform: 'instagram', username: 'exemplo' };
function content(views: number | null, id = randomUUID()): RadarContent {
  return {
    id,
    platform: 'instagram',
    external_id: id,
    permalink: null,
    source_id: source.id,
    created_at: '2026-10-25T12:00:00Z',
    published_at: '2026-10-24T12:00:00Z',
    title: 'Exemplo',
    caption: null,
    media_path: null,
    payload: {
      author: 'exemplo',
      mediaUrl: null,
      thumbnailUrl: null,
      duration: 30,
      hashtags: [],
      sourceActor: null,
      metrics: { ...noMetrics(), views },
      contentType: 'video',
      availability: [],
    },
  };
}
test('referências e links são normalizados sem aceitar origens privadas ou links encurtados', () => {
  assert.equal(
    normalizeReference('https://www.instagram.com/EuSouWill.Dev/', 'instagram'),
    'eusouwill.dev',
  );
  assert.equal(normalizeReference('@Exemplo', 'tiktok'), 'exemplo');
  assert.throws(() => normalizeReference('https://evil.test/pessoa', 'instagram'));
  assert.throws(() => normalizeReference('https://instagram.com/reel/abc', 'instagram'));
  assert.equal(
    canonicalPost('https://instagram.com/reel/AbC123/?utm_source=x').permalink,
    'https://www.instagram.com/reel/AbC123/',
  );
  for (const url of [
    'http://instagram.com/reel/AbC/',
    'https://vm.tiktok.com/abc',
    'https://127.0.0.1/reel/x',
    'https://instagram.com:444/p/x/',
    'https://user@instagram.com/p/x/',
  ])
    assert.throws(() => canonicalPost(url));
});
test('baseline exige cinco comparáveis, usa mediana, exclui vídeo e outro perfil/plataforma', () => {
  const target = content(300);
  const peers = [100, 100, 100, 100, 10000].map((v) => content(v));
  const now = new Date('2026-10-25T12:00:00Z');
  assert.equal(scoreContent(target, peers.slice(0, 4), [], now).ratio, null);
  const score = scoreContent(
    target,
    [target, ...peers, { ...content(1), source_id: randomUUID() }],
    [],
    now,
  );
  assert.equal(score.median, 100);
  assert.equal(score.samples, 5);
  assert.equal(score.ratio, 3);
  assert.equal(score.breakout, true);
  assert.equal(
    scoreContent(
      target,
      peers.map((p) => ({ ...p, platform: 'tiktok' })),
      [],
      now,
    ).ratio,
    null,
  );
  assert.equal(
    scoreContent(
      target,
      peers.map((p) => ({ ...p, payload: { ...p.payload, contentType: 'image' } })),
      [],
      now,
    ).ratio,
    null,
  );
});
test('métricas ausentes ficam null e velocidade exige dois snapshots válidos', () => {
  const c = content(null);
  const now = new Date('2026-10-25T12:00:00Z');
  assert.equal(scoreContent(c, [], [], now).engagement, null);
  const s: any = {
    ...noMetrics(),
    content_id: c.id,
    source: 'apify',
    followers: null,
    views: 10,
    recorded_at: '2026-10-25T10:00:00Z',
  };
  assert.equal(scoreContent(c, [], [s], now).velocity, null);
  assert.equal(
    scoreContent(c, [], [s, { ...s, views: 30, recorded_at: '2026-10-25T12:00:00Z' }], now)
      .velocity,
    10,
  );
  assert.equal(
    scoreContent(c, [], [s, { ...s, views: 0, recorded_at: '2026-10-25T12:00:00Z' }], now).velocity,
    null,
  );
});
test('normalização Apify preserva ausência, rejeita erros e outro autor e preenche templates recursivos', () => {
  const row = normalizeApify(
    {
      url: 'https://www.instagram.com/reel/abc/',
      ownerUsername: 'exemplo',
      likesCount: 0,
      videoViewCount: 42,
    },
    source,
    'a/b',
  )!;
  assert.equal(row.payload.metrics.views, 42);
  assert.equal(row.payload.metrics.likes, 0);
  assert.equal(row.payload.metrics.shares, null);
  assert.equal(row.published_at, null);
  assert.equal(
    normalizeApify(
      { url: 'https://www.instagram.com/reel/abc/', ownerUsername: 'outro' },
      source,
      'a/b',
    ),
    null,
  );
  assert.equal(normalizeApify({ error: 'private' }, source, 'a/b'), null);
  assert.deepEqual(
    fillInput({ usernames: ['{{username}}'], limit: '{{limit}}', url: '{{url}}' }, source, 30),
    { usernames: ['exemplo'], limit: 30, url: 'https://www.instagram.com/exemplo/' },
  );
});
test('modos parciais são determinados pelo material e não pelo modelo', () => {
  const evidence: MediaEvidence = { transcript: null, frames: [], duration: 10, warnings: [] };
  assert.equal(analysisMode(evidence, false), 'UNAVAILABLE');
  assert.equal(analysisMode(evidence, true), 'METADATA_ONLY');
  const audio = {
    ...evidence,
    transcript: { text: 'fala real', segments: [], language: 'pt', model: 'x' },
  };
  assert.equal(analysisMode(audio, true), 'AUDIO_ONLY');
  const video = { ...evidence, frames: [{ timestamp: 0, path: 'x', expiresAt: '2026-10-26' }] };
  assert.equal(analysisMode(video, true), 'VISUAL_ONLY');
  assert.equal(analysisMode({ ...audio, frames: video.frames }, true), 'FULL');
  const analysis: any = {
    opening_hook: { evidence: [] },
    cta: { evidence: [] },
    narrative_beats: [],
    hypotheses: [],
    visual_techniques: ['câmera'],
    screen_text: [],
    editing_notes: [],
  };
  assert.throws(() => enforceAnalysisEvidence(analysis, evidence, true));
  assert.throws(() =>
    enforceAnalysisEvidence(
      {
        ...analysis,
        visual_techniques: [],
        opening_hook: { evidence: [{ source_type: 'transcript', timestamp_s: 0 }] },
      },
      evidence,
      true,
    ),
  );
});
test('download bloqueia IPv4 e IPv6 privados, mapeados e reservados', () => {
  for (const ip of [
    '127.0.0.1',
    '0.0.0.0',
    '10.1.2.3',
    '172.17.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
    '224.0.0.1',
  ])
    assert.equal(publicAddress(ip), false, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])
    assert.equal(publicAddress(ip), true, ip);
  assert.equal(radarDefaults().collectionEnabled, false);
  assert.equal(radarDefaults().monthlyBudget, 5);
});
test('API do Radar exige sessão e download rejeita a resolução local antes da conexão', async () => {
  const server = createServer(handler);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  try {
    const port = (server.address() as { port: number }).port;
    const response = await fetch(`http://127.0.0.1:${port}`);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }
  await assert.rejects(
    downloadPublic('https://localhost/test.mp4', 'never-created.mp4', 1024),
    /privado ou reservado/,
  );
});
