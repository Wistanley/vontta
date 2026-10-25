import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { authenticateRequest, PublicError, readBody, reply } from '../server/http.js';
import { checked, enqueue, getSettings, owned } from '../server/radar/store.js';
import { encryptKey, loadSettings } from '../server/ai-settings.js';
import {
  canonicalPost,
  noMetrics,
  normalizeReference,
  radarSettingsSchema,
  scriptSchema,
  scriptMarkdown,
} from '../lib/radar.js';
import { newPost } from '../lib/post-creator.js';

export const config = { maxDuration: 60 };
const uuid = z.string().uuid();
const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('settings'),
    spec: radarSettingsSchema,
    token: z.string().trim().min(10).max(500).optional(),
    disconnect: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('source'),
    id: uuid.optional(),
    platform: z.enum(['instagram', 'tiktok']),
    username: z.string().max(400),
    name: z.string().max(150),
    tags: z.array(z.string().max(80)).max(20).default([]),
    group: z.string().max(100).default(''),
    enabled: z.boolean().default(true),
  }),
  z.object({ action: z.literal('removeSource'), id: uuid }),
  z.object({ action: z.literal('collect'), sourceId: uuid.optional(), key: uuid }),
  z.object({
    action: z.literal('import'),
    url: z.string().max(1000),
    title: z.string().max(180),
    caption: z.string().max(10000).default(''),
  }),
  z.object({
    action: z.literal('upload'),
    name: z.string().min(1).max(240),
    size: z.number().int().positive(),
    mime: z.enum(['video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav']),
    rights: z.literal(true),
  }),
  z.object({
    action: z.literal('finalizeUpload'),
    id: uuid,
    path: z.string().max(500),
    title: z.string().min(1).max(180),
    mime: z.string().max(100),
  }),
  z.object({ action: z.literal('analyze'), id: uuid, key: uuid }),
  z.object({
    action: z.literal('script'),
    id: uuid,
    profileId: uuid,
    duration: z.number().int().min(30).max(60),
    instruction: z.string().max(4000).default(''),
    key: uuid,
    scriptId: uuid.optional(),
    part: z.enum(['hooks', 'spoken', 'scenes', 'cta', 'caption', 'cover', 'all']).default('all'),
  }),
  z.object({
    action: z.literal('editScript'),
    id: uuid,
    version: z.number().int().positive(),
    data: scriptSchema,
    status: z.enum(['idea', 'draft', 'approved', 'recorded', 'published']),
    favorite: z.boolean(),
  }),
  z.object({ action: z.literal('handoff'), id: uuid, target: z.enum(['studio', 'carousel']) }),
  z.object({
    action: z.literal('favorite'),
    id: uuid,
    favorite: z.boolean(),
    notes: z.string().max(4000).optional(),
  }),
  z.object({ action: z.literal('retry'), id: uuid }),
  z.object({ action: z.literal('report'), period: z.enum(['daily', 'weekly']) }),
  z.object({ action: z.literal('detail'), id: uuid }),
  z.object({ action: z.literal('history'), id: uuid }),
]);
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  if (!['GET', 'POST'].includes(req.method || ''))
    return reply(res, 405, { error: 'Método não permitido.' });
  try {
    const { db, user } = await authenticateRequest(req);
    const owner = user.id;
    if (req.method === 'GET') {
      const tables = [
        'radar_sources',
        'radar_contents',
        'radar_jobs',
        'radar_scripts',
        'radar_reports',
        'radar_usage',
        'radar_events',
      ] as const;
      const data = await Promise.all(
        tables.map((table) => {
          let q = db
            .from(table)
            .select('*')
            .eq('owner_id', owner)
            .order('created_at', { ascending: false })
            .limit(table === 'radar_contents' ? 500 : table === 'radar_usage' ? 1000 : 100);
          if (table === 'radar_usage')
            q = q.gte('created_at', new Date().toISOString().slice(0, 7) + '-01T00:00:00-03:00');
          return q;
        }),
      );
      const [settings, worker, ai, analyses, snapshots] = await Promise.all([
        getSettings(db, owner),
        db.from('radar_worker_state').select('*').eq('id', 'vps').maybeSingle(),
        loadSettings(db, owner),
        db
          .from('radar_analyses')
          .select('content_id,mode,created_at')
          .eq('owner_id', owner)
          .order('created_at', { ascending: false })
          .limit(500),
        db
          .from('radar_metric_snapshots')
          .select('content_id,recorded_at,views,likes,comments,shares,saves,followers,source')
          .eq('owner_id', owner)
          .order('recorded_at', { ascending: false })
          .limit(1000),
      ]);
      return reply(res, 200, {
        ...Object.fromEntries(data.map((r, i) => [tables[i].replace('radar_', ''), checked(r)])),
        analyses: checked(analyses),
        snapshots: checked(snapshots),
        settings: settings.spec,
        apifyConfigured: !!settings.encryptedToken,
        worker: checked(worker),
        ai: { openai: !!ai.settings.openai, defaultProvider: ai.defaultProvider },
        serverTime: new Date().toISOString(),
      });
    }
    const parsed = input.safeParse(await readBody(req, 150000));
    if (!parsed.success)
      throw new PublicError(
        400,
        'Confira os campos: ' +
          parsed.error.issues
            .slice(0, 3)
            .map((x) => x.path.join('.') + ' ' + x.message)
            .join('; '),
      );
    const b = parsed.data;
    const settings = await getSettings(db, owner);
    if (b.action === 'settings') {
      if (b.spec.profileId) await owned(db, 'post_profiles', owner, b.spec.profileId);
      checked(
        await db.from('radar_settings').upsert({
          owner_id: owner,
          spec: b.spec,
          encrypted_apify_token: b.disconnect
            ? null
            : b.token
              ? encryptKey(b.token, `radar:${owner}`, 'openai')
              : settings.encryptedToken,
          updated_at: new Date().toISOString(),
        }),
      );
      return reply(res, 200, { ok: true });
    }
    if (b.action === 'source') {
      const username = normalizeReference(b.username, b.platform);
      if (b.id) await owned(db, 'radar_sources', owner, b.id);
      else {
        const count = await db
          .from('radar_sources')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', owner);
        checked(count);
        if ((count.count || 0) >= settings.spec.maxProfiles)
          throw new PublicError(
            400,
            'Limite de referências atingido. Ajuste o limite em Conexões.',
          );
      }
      const values = {
        platform: b.platform,
        username,
        name: b.name || `@${username}`,
        tags: b.tags,
        group_name: b.group,
        enabled: b.enabled,
      };
      checked(
        b.id
          ? await db.from('radar_sources').update(values).eq('id', b.id).eq('owner_id', owner)
          : await db
              .from('radar_sources')
              .upsert(
                { ...values, owner_id: owner },
                { onConflict: 'owner_id,platform,username', ignoreDuplicates: true },
              ),
      );
    } else if (b.action === 'removeSource') {
      // Preserve collected videos and their provenance; disabling is reversible.
      checked(
        await db
          .from('radar_sources')
          .update({ enabled: false })
          .eq('owner_id', owner)
          .eq('id', b.id),
      );
    } else if (b.action === 'collect') {
      if (!settings.encryptedToken)
        throw new PublicError(400, 'Cadastre o token Apify em Radar → Conexões.');
      if (b.sourceId) await owned(db, 'radar_sources', owner, b.sourceId);
      return reply(res, 202, {
        job: await enqueue(db, owner, 'collect', { sourceId: b.sourceId }, b.key),
      });
    } else if (b.action === 'import') {
      let link;
      try {
        link = canonicalPost(b.url);
      } catch (e) {
        throw new PublicError(400, (e as Error).message);
      }
      const content = checked(
        await db.from('radar_contents').upsert(
          {
            owner_id: owner,
            platform: link.platform,
            external_id: link.externalId,
            permalink: link.permalink,
            title: b.title || 'Referência salva',
            caption: b.caption,
            payload: {
              author: null,
              mediaUrl: null,
              thumbnailUrl: null,
              duration: null,
              hashtags: [],
              sourceActor: null,
              metrics: noMetrics(),
              availability: ['Link salvo manualmente; áudio e imagens ainda não analisados.'],
            },
          },
          { onConflict: 'owner_id,platform,external_id', ignoreDuplicates: true },
        ),
      );
      return reply(res, 200, { ok: true });
    } else if (b.action === 'upload') {
      if (b.size > settings.spec.maxFileMb * 1024 * 1024)
        throw new PublicError(400, `O limite deste perfil é ${settings.spec.maxFileMb} MB.`);
      const id = randomUUID();
      const ext = {
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
        'audio/mpeg': 'mp3',
        'audio/wav': 'wav',
      }[b.mime];
      const path = `${owner}/${id}/original.${ext}`;
      const signed = checked(await db.storage.from('radar-media').createSignedUploadUrl(path));
      return reply(res, 200, { id, path, url: signed.signedUrl });
    } else if (b.action === 'finalizeUpload') {
      if (!new RegExp(`^${owner}/${b.id}/original\\.(mp4|webm|mov|mp3|wav)$`).test(b.path))
        throw new PublicError(400, 'Caminho de arquivo inválido.');
      const info = await db.storage.from('radar-media').info(b.path);
      checked(info);
      if (Number(info.data.size) > settings.spec.maxFileMb * 1024 * 1024)
        throw new PublicError(400, 'Arquivo acima do limite.');
      checked(
        await db.from('radar_contents').insert({
          id: b.id,
          owner_id: owner,
          platform: 'manual',
          external_id: b.id,
          title: b.title,
          media_path: b.path,
          payload: {
            author: null,
            mediaUrl: null,
            thumbnailUrl: null,
            duration: null,
            hashtags: [],
            sourceActor: null,
            metrics: noMetrics(),
            availability: [],
            rightsConfirmed: true,
            contentType: 'video',
            mediaExpiresAt: new Date(
              Date.now() + settings.spec.retentionHours * 3600000,
            ).toISOString(),
          },
        }),
      );
      return reply(res, 202, {
        job: await enqueue(db, owner, 'analyze', { contentId: b.id }, `upload:${b.id}`),
      });
    } else if (b.action === 'analyze') {
      await owned(db, 'radar_contents', owner, b.id);
      return reply(res, 202, {
        job: await enqueue(db, owner, 'analyze', { contentId: b.id }, b.key),
      });
    } else if (b.action === 'script') {
      await owned(db, 'radar_contents', owner, b.id);
      await owned(db, 'post_profiles', owner, b.profileId);
      if (b.scriptId) {
        const s = await owned(db, 'radar_scripts', owner, b.scriptId);
        if (s.content_id !== b.id || s.profile_id !== b.profileId)
          throw new PublicError(400, 'O roteiro pertence a outra referência ou perfil.');
        if (b.instruction.trim())
          checked(
            await db
              .from('radar_script_feedback')
              .insert({
                owner_id: owner,
                profile_id: b.profileId,
                script_id: b.scriptId,
                instruction: b.instruction,
              }),
          );
      }
      return reply(res, 202, {
        job: await enqueue(
          db,
          owner,
          'script',
          {
            contentId: b.id,
            profileId: b.profileId,
            duration: b.duration,
            instruction: b.instruction,
            scriptId: b.scriptId,
            part: b.part,
          },
          b.key,
        ),
      });
    } else if (b.action === 'editScript') {
      const s = await owned(db, 'radar_scripts', owner, b.id);
      const next = { ...s.data, ...b.data };
      checked(
        await db.rpc('save_radar_script', {
          p_id: b.id,
          p_owner: owner,
          p_version: b.version,
          p_data: next,
          p_status: b.status,
          p_favorite: b.favorite,
        }),
      );
    } else if (b.action === 'favorite') {
      const c = await owned(db, 'radar_contents', owner, b.id);
      checked(
        await db
          .from('radar_contents')
          .update({
            payload: {
              ...c.payload,
              favorite: b.favorite,
              ...(b.notes !== undefined ? { notes: b.notes } : {}),
            },
          })
          .eq('owner_id', owner)
          .eq('id', b.id),
      );
    } else if (b.action === 'handoff') {
      const s = await owned(db, 'radar_scripts', owner, b.id);
      const hash = createHash('sha256')
        .update(`${owner}:${s.id}:${s.version}:${b.target}`)
        .digest('hex')
        .slice(0, 32);
      const handoffId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
      if (b.target === 'carousel') {
        const data = newPost(
          s.profile_id,
          `Crie um carrossel original a partir deste roteiro. Preserve o padrão visual do perfil, revise português e evidências. Não copie a referência.\n\n${scriptMarkdown(s)}`.slice(
            0,
            30000,
          ),
          'Carrossel',
          7,
        );
        const exists = checked(
          await db
            .from('creator_posts')
            .select('id')
            .eq('id', handoffId)
            .eq('owner_id', owner)
            .maybeSingle(),
        );
        if (!exists)
          checked(
            await db.from('creator_posts').insert({ ...data, id: handoffId, owner_id: owner }),
          );
        return reply(res, 200, { ok: true, id: handoffId, target: 'carousel' });
      }
      const id = handoffId;
      const payload = {
        id,
        kind: 'content',
        title: s.data.title,
        createdAt: new Date().toISOString(),
        status: 'Roteiro',
        format: 'Reels',
        pillar: 'Radar de referências',
        date: '',
        hook: s.data.hooks[0]?.text || '',
        script: scriptMarkdown(s),
        caption: s.data.caption,
        cta: s.data.cta,
        checklist: [],
      };
      checked(
        await db
          .from('workspace_entries')
          .upsert(
            { id, owner_id: owner, kind: 'content', payload },
            { onConflict: 'owner_id,id', ignoreDuplicates: true },
          ),
      );
      return reply(res, 200, { ok: true, id, target: 'studio' });
    } else if (b.action === 'retry') {
      const j = await owned(db, 'radar_jobs', owner, b.id);
      if (j.status !== 'failed')
        throw new PublicError(400, 'Somente tarefas com falha podem ser retomadas.');
      return reply(res, 202, {
        job: await enqueue(
          db,
          owner,
          j.kind,
          { ...j.payload, retryOf: j.id, apifyRunId: undefined },
          randomUUID(),
        ),
      });
    } else if (b.action === 'report') {
      return reply(res, 202, {
        job: await enqueue(
          db,
          owner,
          'report',
          { period: b.period },
          `${b.period}:${new Date().toISOString().slice(0, 10)}`,
        ),
      });
    } else if (b.action === 'detail') {
      const content = await owned(db, 'radar_contents', owner, b.id);
      const analyses = checked(
        await db
          .from('radar_analyses')
          .select('*')
          .eq('owner_id', owner)
          .eq('content_id', b.id)
          .order('version', { ascending: false })
          .limit(10),
      );
      for (const analysis of analyses) {
        analysis.data.evidence.frames = await Promise.all(
          analysis.data.evidence.frames.map(async (f: any) => ({
            ...f,
            url:
              Date.parse(f.expiresAt) > Date.now()
                ? (await db.storage.from('radar-media').createSignedUrl(f.path, 600)).data
                    ?.signedUrl || null
                : null,
          })),
        );
      }
      const snapshots = checked(
        await db
          .from('radar_metric_snapshots')
          .select('*')
          .eq('owner_id', owner)
          .eq('content_id', b.id)
          .order('recorded_at')
          .limit(100),
      );
      return reply(res, 200, { content, analyses, snapshots });
    } else if (b.action === 'history') {
      await owned(db, 'radar_scripts', owner, b.id);
      return reply(res, 200, {
        versions: checked(
          await db
            .from('radar_script_versions')
            .select('*')
            .eq('owner_id', owner)
            .eq('script_id', b.id)
            .order('version', { ascending: false })
            .limit(50),
        ),
      });
    }
    return reply(res, 200, { ok: true });
  } catch (e) {
    return reply(res, e instanceof PublicError ? e.status : 500, {
      error: e instanceof PublicError ? e.message : 'Não foi possível concluir esta ação no Radar.',
    });
  }
}
