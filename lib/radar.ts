import { z } from 'zod';

export const radarPlatform = z.enum(['instagram', 'tiktok', 'manual']);
export const analysisModes = [
  'FULL',
  'AUDIO_ONLY',
  'VISUAL_ONLY',
  'METADATA_ONLY',
  'UNAVAILABLE',
] as const;
export const modeLabels: Record<(typeof analysisModes)[number], string> = {
  FULL: 'Áudio e imagens',
  AUDIO_ONLY: 'Somente áudio',
  VISUAL_ONLY: 'Somente imagens',
  METADATA_ONLY: 'Somente metadados',
  UNAVAILABLE: 'Material indisponível',
};
export const radarSettingsSchema = z.object({
  profileId: z.string().uuid().or(z.literal('')).default(''),
  timezone: z.literal('America/Sao_Paulo').default('America/Sao_Paulo'),
  collectionEnabled: z.boolean().default(false),
  collectionHour: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .default('08:00'),
  maxProfiles: z.number().int().min(1).max(100).default(10),
  historyLimit: z.number().int().min(5).max(50).default(30),
  deepDailyLimit: z.number().int().min(0).max(50).default(5),
  autoAnalyze: z.boolean().default(false),
  autoScript: z.boolean().default(false),
  maxDuration: z.number().int().min(10).max(600).default(180),
  maxFileMb: z.number().int().min(5).max(150).default(100),
  maxFrames: z.number().int().min(4).max(16).default(12),
  retentionHours: z.number().int().min(1).max(168).default(24),
  monthlyBudget: z.number().min(0).max(1000).default(5),
  collectionReserve: z.number().min(0.01).max(10).default(0.1),
  analysisReserve: z.number().min(0.01).max(10).default(0.25),
  scriptReserve: z.number().min(0.01).max(10).default(0.1),
  transcriptionModel: z.string().max(150).default(''),
  analysisModel: z.string().max(150).default(''),
  scriptModel: z.string().max(150).default(''),
  instagramActor: z
    .string()
    .regex(/^[\w~-]+(?:\/[\w~-]+)?$|^$/)
    .default(''),
  tiktokActor: z
    .string()
    .regex(/^[\w~-]+(?:\/[\w~-]+)?$|^$/)
    .default(''),
  instagramInput: z.record(z.string(), z.unknown()).default({}),
  tiktokInput: z.record(z.string(), z.unknown()).default({}),
  keywords: z
    .array(z.string().trim().min(1).max(80))
    .max(30)
    .default(['software', 'IA nas empresas', 'automação']),
  voiceNotes: z.string().max(4000).default(''),
});
export type RadarSettings = z.infer<typeof radarSettingsSchema>;
export const radarDefaults = () => radarSettingsSchema.parse({});

export function normalizeReference(input: string, platform: 'instagram' | 'tiktok') {
  let username = input.trim().replace(/^@/, '');
  if (/^https?:\/\//i.test(username)) {
    const url = new URL(username);
    const allowed =
      platform === 'instagram'
        ? ['instagram.com', 'www.instagram.com']
        : ['tiktok.com', 'www.tiktok.com'];
    if (
      url.protocol !== 'https:' ||
      !allowed.includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new Error('Use a URL pública do perfil na plataforma selecionada.');
    username = url.pathname.split('/').filter(Boolean)[0]?.replace(/^@/, '') || '';
    if (['reel', 'p', 'reels', 'explore', 'stories', 'video'].includes(username))
      throw new Error('Informe o perfil, não uma publicação.');
  }
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) throw new Error('Confira o @ do perfil.');
  return username.toLowerCase();
}
export function canonicalPost(input: string) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.port)
    throw new Error('Use um link HTTPS público de Instagram ou TikTok.');
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const path = url.pathname.replace(/\/+$/, '');
  if (host === 'instagram.com' && /^\/(p|reel)\/[\w-]+$/.test(path))
    return {
      platform: 'instagram' as const,
      permalink: `https://www.instagram.com${path}/`,
      externalId: path.split('/').at(-1)!,
    };
  if (host === 'tiktok.com' && /^\/@[\w.]+\/video\/\d+$/.test(path))
    return {
      platform: 'tiktok' as const,
      permalink: `https://www.tiktok.com${path}`,
      externalId: path.split('/').at(-1)!,
    };
  throw new Error(
    'Use o link completo da publicação do Instagram ou TikTok. Links encurtados não são aceitos.',
  );
}
export const metricsSchema = z.object({
  views: z.number().nonnegative().nullable(),
  likes: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable(),
  saves: z.number().nonnegative().nullable(),
});
export type RadarMetrics = z.infer<typeof metricsSchema>;
export const noMetrics = (): RadarMetrics => ({
  views: null,
  likes: null,
  comments: null,
  shares: null,
  saves: null,
});
export interface RadarContent {
  id: string;
  owner_id?: string;
  source_id: string | null;
  platform: z.infer<typeof radarPlatform>;
  external_id: string;
  permalink: string | null;
  created_at: string;
  published_at: string | null;
  title: string;
  caption: string | null;
  media_path: string | null;
  payload: {
    author: string | null;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    duration: number | null;
    hashtags: string[];
    sourceActor: string | null;
    metrics: RadarMetrics;
    rightsConfirmed?: boolean;
    contentType?: string;
    availability: string[];
    favorite?: boolean;
    notes?: string;
    followers?: number | null;
    mediaExpiresAt?: string | null;
  };
}
export interface RadarSource {
  id: string;
  platform: 'instagram' | 'tiktok';
  username: string;
  name: string;
  enabled: boolean;
  tags: string[];
  group_name: string;
  last_collected_at: string | null;
  last_error: string | null;
  created_at: string;
}
export interface MetricSnapshot extends RadarMetrics {
  content_id: string;
  recorded_at: string;
  source: string;
  followers: number | null;
}
export const evidenceSchema = z.object({
  source_type: z.enum(['transcript', 'frame', 'caption', 'metric']),
  timestamp_s: z.number().nonnegative().nullable(),
  description: z.string().min(1).max(1200),
});
const evidenceList = z.array(evidenceSchema).max(20);
export const videoAnalysisSchema = z.object({
  summary: z.string().max(3000),
  topic: z.string().max(180),
  subtopics: z.array(z.string().max(100)).max(10),
  format: z.string().max(100),
  opening_hook: z.object({
    text: z.string().max(1500),
    type: z.string().max(100),
    evidence: evidenceList,
  }),
  narrative_beats: z
    .array(
      z.object({
        start_s: z.number().nonnegative().nullable(),
        end_s: z.number().nonnegative().nullable(),
        role: z.string().max(80),
        description: z.string().max(1200),
        evidence: evidenceList,
      }),
    )
    .max(15),
  visual_techniques: z.array(z.string().max(700)).max(15),
  editing_notes: z.array(z.string().max(700)).max(15),
  screen_text: z
    .array(
      z.object({
        timestamp_s: z.number().nonnegative(),
        text: z.string().max(1000),
        legible: z.boolean(),
      }),
    )
    .max(20),
  cta: z.object({ present: z.boolean(), text: z.string().max(1000), evidence: evidenceList }),
  hypotheses: z
    .array(
      z.object({
        statement: z.string().max(1200),
        confidence: z.number().min(0).max(1),
        evidence: evidenceList,
      }),
    )
    .max(10),
  adaptation_opportunities: z.array(z.string().max(1200)).max(10),
  limitations: z.array(z.string().max(1000)).max(20),
  confidence: z.number().min(0).max(1),
});
export interface MediaEvidence {
  transcript: {
    text: string;
    segments: { text: string; startSecond: number; endSecond: number }[];
    language: string | null;
    model: string | null;
  } | null;
  frames: { timestamp: number; path: string; expiresAt: string }[];
  duration: number | null;
  warnings: string[];
}
export type VideoAnalysis = z.infer<typeof videoAnalysisSchema> & {
  mode: (typeof analysisModes)[number];
  model: string;
  promptVersion: string;
  evidence: MediaEvidence;
  sourceUrl: string | null;
};
export const scriptSchema = z.object({
  title: z.string().min(1).max(180),
  objective: z.string().max(1200),
  audience: z.string().max(1000),
  hooks: z
    .array(
      z.object({
        type: z.enum(['curiosidade', 'afirmação', 'identificação']),
        text: z.string().max(1000),
      }),
    )
    .length(3),
  spoken: z.string().max(12000),
  scenes: z
    .array(
      z.object({
        start: z.number().nonnegative(),
        end: z.number().nonnegative(),
        speech: z.string().max(2000),
        visual: z.string().max(1200),
        screenText: z.string().max(500),
        editing: z.string().max(1000),
      }),
    )
    .max(20),
  cta: z.string().max(1000),
  caption: z.string().max(3000),
  cover: z.string().max(300),
  keywords: z.array(z.string().max(80)).max(20),
  takeFromFormat: z.array(z.string().max(1000)).max(8),
  changeForOriginality: z.array(z.string().max(1000)).max(8),
  factualChecks: z.array(z.string().max(1000)).max(10),
});
export type RadarScriptData = z.infer<typeof scriptSchema> & {
  references: { id: string; url: string | null; mode: string }[];
  model: string;
  promptVersion: string;
  duration: number;
};
export interface RadarScript {
  id: string;
  content_id: string;
  profile_id: string;
  version: number;
  status: 'idea' | 'draft' | 'approved' | 'recorded' | 'published';
  favorite: boolean;
  data: RadarScriptData;
  created_at: string;
}
export interface RadarJob {
  id: string;
  owner_id?: string;
  kind: 'collect' | 'analyze' | 'script' | 'report' | 'trends';
  status: 'queued' | 'running' | 'waiting' | 'succeeded' | 'failed' | 'cancelled';
  payload: Record<string, any>;
  attempts: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  reserved_usd: number;
  actual_usd: number | null;
}
export function analysisMode(
  evidence: MediaEvidence,
  hasMetadata: boolean,
): (typeof analysisModes)[number] {
  const audio = Boolean(evidence.transcript?.text.trim());
  const visual = evidence.frames.length > 0;
  return audio && visual
    ? 'FULL'
    : audio
      ? 'AUDIO_ONLY'
      : visual
        ? 'VISUAL_ONLY'
        : hasMetadata
          ? 'METADATA_ONLY'
          : 'UNAVAILABLE';
}
export function enforceAnalysisEvidence(
  analysis: z.infer<typeof videoAnalysisSchema>,
  evidence: MediaEvidence,
  hasMetadata: boolean,
  metadata: { caption: boolean; metric: boolean } = { caption: hasMetadata, metric: hasMetadata },
) {
  const mode = analysisMode(evidence, hasMetadata);
  const types = new Set([
    ...(metadata.caption ? ['caption'] : []),
    ...(metadata.metric ? ['metric'] : []),
    ...(evidence.transcript?.text ? ['transcript'] : []),
    ...(evidence.frames.length ? ['frame'] : []),
  ]);
  const all = [
    ...analysis.opening_hook.evidence,
    ...analysis.cta.evidence,
    ...analysis.narrative_beats.flatMap((b) => b.evidence),
    ...analysis.hypotheses.flatMap((h) => h.evidence),
  ];
  if (all.some((item) => !types.has(item.source_type)))
    throw new Error('A análise atribuiu evidência a uma modalidade indisponível.');
  if (
    !evidence.frames.length &&
    (analysis.visual_techniques.length ||
      analysis.screen_text.length ||
      analysis.editing_notes.length)
  )
    throw new Error('A análise descreveu imagens sem ter recebido frames.');
  if (
    evidence.duration &&
    [
      ...all.map((item) => item.timestamp_s),
      ...analysis.narrative_beats.flatMap((b) => [b.start_s, b.end_s]),
      ...analysis.screen_text.map((s) => s.timestamp_s),
    ].some((t) => t !== null && t > evidence.duration! + 1)
  )
    throw new Error('Timestamp de evidência fora do vídeo.');
  if (
    analysis.narrative_beats.some(
      (b) => b.start_s !== null && b.end_s !== null && b.end_s < b.start_s,
    )
  )
    throw new Error('Timestamp final anterior ao início da cena.');
  return mode;
}

export function scoreContent(
  content: RadarContent,
  peers: RadarContent[],
  snapshots: MetricSnapshot[],
  now = new Date(),
) {
  const metric = content.payload.metrics;
  // Compare the same creator/platform and comparable publication ages; never the video itself.
  const age = content.published_at
    ? Math.max(0, (now.getTime() - Date.parse(content.published_at)) / 86400000)
    : null;
  const cohort = (days: number | null) =>
    days === null ? 'unknown' : days < 7 ? 'recent' : days < 30 ? 'month' : 'older';
  const values = peers
    .filter(
      (p) =>
        p.id !== content.id &&
        p.source_id &&
        p.source_id === content.source_id &&
        p.platform === content.platform &&
        p.payload.contentType === content.payload.contentType &&
        p.payload.metrics.views !== null &&
        p.published_at &&
        age !== null &&
        cohort(Math.max(0, (now.getTime() - Date.parse(p.published_at)) / 86400000)) ===
          cohort(age),
    )
    .sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''))
    .slice(0, 30)
    .map((p) => p.payload.metrics.views!)
    .sort((a, b) => a - b);
  const median =
    values.length >= 5
      ? (values[Math.floor((values.length - 1) / 2)] + values[Math.ceil((values.length - 1) / 2)]) /
        2
      : null;
  const ratio =
    metric.views !== null && median !== null && median > 0 ? metric.views / median : null;
  const known = (['likes', 'comments', 'shares'] as const).filter((key) => metric[key] !== null);
  const engagement =
    metric.views !== null && metric.views > 0 && known.length
      ? known.reduce((sum, key) => sum + metric[key]!, 0) / metric.views
      : null;
  const history = snapshots
    .filter((s) => s.content_id === content.id && s.views !== null)
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const previous = history.at(-2),
    last = history.at(-1);
  const hours =
    last && previous
      ? (Date.parse(last.recorded_at) - Date.parse(previous.recorded_at)) / 3600000
      : 0;
  const velocity =
    previous && last && hours > 0 && last.views! >= previous.views!
      ? (last.views! - previous.views!) / hours
      : null;
  const parts = [
    { v: ratio === null ? null : Math.min(ratio / 5, 1), w: 0.4 },
    {
      v:
        velocity === null || median === null || median <= 0
          ? null
          : Math.min(velocity / (median / 24), 1),
      w: 0.25,
    },
    { v: engagement === null ? null : Math.min(engagement / 0.1, 1), w: 0.2 },
    { v: age === null ? null : Math.exp(-age / 14), w: 0.15 },
  ];
  const weight = parts.reduce((n, p) => n + (p.v === null ? 0 : p.w), 0);
  const score = weight
    ? Math.round((100 * parts.reduce((n, p) => n + (p.v === null ? 0 : p.v * p.w), 0)) / weight)
    : null;
  return {
    median,
    samples: values.length,
    ratio,
    engagement,
    engagementFields: known,
    velocity,
    score,
    confidence: weight,
    breakout: ratio !== null && ratio >= 3,
    viewsToFollowers:
      metric.views !== null && (content.payload.followers || 0) > 0
        ? metric.views / content.payload.followers!
        : null,
  };
}

export function scriptMarkdown(script: RadarScript) {
  const d = script.data;
  return `# ${d.title}\n\n${d.objective}\n\n## Três ganchos\n${d.hooks.map((h) => `- **${h.type}:** ${h.text}`).join('\n')}\n\n## Roteiro falado\n${d.spoken}\n\n## Cenas\n${d.scenes.map((s) => `### ${s.start}–${s.end}s\n${s.speech}\n\nVisual: ${s.visual}\nTexto na tela: ${s.screenText}\nEdição: ${s.editing}`).join('\n\n')}\n\n## CTA\n${d.cta}\n\n## Legenda\n${d.caption}\n\n## Referências\n${d.references.map((r) => `- ${r.url || 'Vídeo enviado pelo usuário'} (${r.mode})`).join('\n')}\n\n## Verificar antes de gravar\n${d.factualChecks.map((x) => `- ${x}`).join('\n')}`;
}
