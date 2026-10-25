import type { RadarContent, RadarSource } from '../../lib/radar.js';
import { canonicalPost, noMetrics } from '../../lib/radar.js';

export function fillInput(template: Record<string, unknown>, source: RadarSource, limit: number) {
  const url =
    source.platform === 'instagram'
      ? `https://www.instagram.com/${source.username}/`
      : `https://www.tiktok.com/@${source.username}`;
  function walk(v: unknown): any {
    if (typeof v === 'string')
      return v === '{{limit}}'
        ? limit
        : v
            .replaceAll('{{username}}', source.username)
            .replaceAll('{{url}}', url)
            .replaceAll('{{limit}}', String(limit));
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object')
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  }
  if (!Object.keys(template).length)
    throw new Error('Configure o JSON de entrada do Actor Apify em Conexões.');
  return walk(template);
}
export async function apify(token: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://api.apify.com/v2/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      `Apify respondeu ${response.status}. Confira o Actor, entrada, permissões e saldo.`,
    );
  return data;
}
const metric = (...values: unknown[]) => {
  for (const v of values)
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return Math.round(v);
  return null;
};
export function normalizeApify(
  row: any,
  source: RadarSource,
  actor: string,
): Omit<RadarContent, 'id' | 'created_at'> | null {
  if (!row || row.error) return null;
  let link;
  try {
    link = canonicalPost(
      row.url ||
        row.postUrl ||
        row.webVideoUrl ||
        row.inputUrl ||
        `https://www.instagram.com/reel/${row.shortCode}/`,
    );
  } catch {
    return null;
  }
  if (link.platform !== source.platform) return null;
  const author = row.ownerUsername || row.authorMeta?.name || row.author?.uniqueId || row.username;
  if (author && String(author).replace(/^@/, '').toLowerCase() !== source.username.toLowerCase())
    return null;
  const rawDate =
    row.timestamp || row.takenAtTimestamp || row.createTimeISO || row.createTime || row.createdAt;
  const date = rawDate
    ? new Date(typeof rawDate === 'number' ? rawDate * (rawDate < 1e12 ? 1000 : 1) : rawDate)
    : null;
  const caption = String(row.caption || row.text || row.desc || row.description || '').slice(
    0,
    10000,
  );
  const metrics = {
    ...noMetrics(),
    views: metric(
      row.videoViewCount,
      row.videoPlayCount,
      row.playCount,
      row.stats?.playCount,
      row.viewCount,
    ),
    likes: metric(row.likesCount, row.diggCount, row.stats?.diggCount, row.likeCount),
    comments: metric(row.commentsCount, row.commentCount, row.stats?.commentCount),
    shares: metric(row.shareCount, row.stats?.shareCount),
    saves: metric(row.collectCount, row.stats?.collectCount, row.saveCount),
  };
  const mediaUrl =
    row.videoUrl ||
    row.videoMeta?.downloadAddr ||
    row.downloadAddr ||
    row.video?.downloadAddr ||
    null;
  return {
    source_id: source.id,
    platform: link.platform,
    external_id: link.externalId,
    permalink: link.permalink,
    title: (caption.split('\n')[0] || `Vídeo de @${source.username}`).slice(0, 180),
    caption,
    published_at: date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    media_path: null,
    payload: {
      author: source.username,
      mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : null,
      thumbnailUrl: row.displayUrl || row.coverUrl || row.videoMeta?.coverUrl || null,
      duration: metric(row.videoDuration, row.videoMeta?.duration, row.video?.duration),
      hashtags: Array.isArray(row.hashtags)
        ? row.hashtags
            .map((x: any) => (typeof x === 'string' ? x : x.name))
            .filter(Boolean)
            .slice(0, 40)
        : [],
      sourceActor: actor,
      metrics,
      contentType:
        mediaUrl || /video|reel/i.test(row.type || row.productType || '') ? 'video' : 'unknown',
      followers: metric(row.ownerFollowersCount, row.authorMeta?.fans, row.author?.followerCount),
      availability: Object.entries(metrics)
        .filter(([, v]) => v === null)
        .map(([k]) => `${k}: não fornecido pelo Actor`),
    },
  };
}
