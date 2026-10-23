import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { authenticateRequest, readBody, reply, PublicError } from '../server/http.js';
import { encryptKey } from '../server/ai-settings.js';
import { profileSchema, postFormat, newPost, allReviewsPassed } from '../lib/post-creator.js';
import {
  checkDB,
  getProfile,
  withPostLock,
  savePost,
  signPost,
  processPost,
  telegramCall,
} from '../server/post-creator.js';

export const config = { maxDuration: 300 };
const idSchema = z.string().uuid();
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('profile'), id: idSchema, spec: profileSchema }),
  z.object({
    action: z.literal('create'),
    profileId: idSchema,
    brief: z.string().trim().min(1).max(4000),
    format: postFormat,
    slides: z.number().int().min(1).max(10),
    scheduledFor: z.iso.datetime().optional(),
  }),
  z.object({ action: z.literal('process'), id: idSchema, startNow: z.boolean().optional() }),
  z.object({
    action: z.literal('schedule'),
    id: idSchema,
    scheduledFor: z.iso.datetime().nullable(),
  }),
  z.object({ action: z.literal('approve'), id: idSchema }),
  z.object({ action: z.literal('retry'), id: idSchema }),
  z.object({
    action: z.literal('material'),
    id: idSchema,
    evidence: z.string().trim().min(1).max(6000),
  }),
  z.object({
    action: z.literal('revise'),
    id: idSchema,
    instruction: z.string().trim().min(1).max(4000),
  }),
  z.object({
    action: z.literal('edit'),
    id: idSchema,
    caption: z.string().trim().min(1).max(3000),
    slides: z
      .array(
        z.object({
          heading: z.string().max(180),
          body: z.string().max(800),
          imagePrompt: z.string().min(1).max(3000),
        }),
      )
      .min(1)
      .max(10),
  }),
  z.object({ action: z.literal('reconcile'), id: idSchema, received: z.boolean() }),
  z.object({
    action: z.literal('connection'),
    token: z
      .string()
      .trim()
      .regex(/^\d+:[A-Za-z0-9_-]{20,150}$/)
      .optional(),
    chatId: z
      .string()
      .trim()
      .regex(/^(-?\d+|@[a-zA-Z0-9_]{5,})$/),
  }),
  z.object({ action: z.literal('disconnect') }),
]);
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, POST');
    return reply(res, 405, { error: 'Método não permitido.' });
  }
  try {
    const { db, user } = await authenticateRequest(req);
    const owner = user.id;
    if (req.method === 'GET') {
      const [profiles, posts, connections, feedback, worker] = await Promise.all([
        db
          .from('post_profiles')
          .select('id,spec,created_at')
          .eq('owner_id', owner)
          .order('created_at'),
        db
          .from('creator_posts')
          .select('id,profile_id,status,data,created_at')
          .eq('owner_id', owner)
          .order('created_at', { ascending: false })
          .limit(100),
        db
          .from('post_connections')
          .select('chat_id,encrypted_token')
          .eq('owner_id', owner)
          .maybeSingle(),
        db
          .from('post_feedback')
          .select('id,profile_id,post_id,instruction,created_at')
          .eq('owner_id', owner)
          .order('created_at', { ascending: false })
          .limit(200),
        db.from('post_worker_state').select('last_run').eq('id', true).maybeSingle(),
      ]);
      for (const result of [profiles, posts, connections, feedback, worker]) checkDB(result.error);
      return reply(res, 200, {
        profiles: profiles.data,
        posts: await Promise.all((posts.data || []).map((p) => signPost(db, owner, p))),
        feedback: feedback.data,
        connection: {
          configured: Boolean(connections.data?.encrypted_token),
          chatId: connections.data?.chat_id || '',
        },
        worker: {
          configured: Boolean(process.env.CRON_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY),
          lastRun: worker.data?.last_run || null,
        },
      });
    }
    const parsed = actionSchema.safeParse(await readBody(req, 100000));
    if (!parsed.success)
      throw new PublicError(
        400,
        'Confira os campos obrigatórios, limites de texto e configuração do perfil.',
      );
    const input = parsed.data;
    if (input.action === 'profile') {
      const result = await db
        .from('post_profiles')
        .upsert({ id: input.id, owner_id: owner, spec: input.spec }, { onConflict: 'id' });
      checkDB(result.error);
      return reply(res, 200, { saved: true });
    }
    if (input.action === 'connection') {
      const { data, error } = await db
        .from('post_connections')
        .select('encrypted_token')
        .eq('owner_id', owner)
        .maybeSingle();
      checkDB(error);
      const { decryptKey } = await import('../server/ai-settings.js');
      const token =
        input.token ||
        (data?.encrypted_token
          ? decryptKey(data.encrypted_token, `telegram:${owner}`, 'openai')
          : '');
      if (!token) throw new PublicError(400, 'Informe o token do bot.');
      await telegramCall(token, 'getChat', { chat_id: input.chatId });
      const saved = await db.from('post_connections').upsert({
        owner_id: owner,
        encrypted_token: encryptKey(token, `telegram:${owner}`, 'openai'),
        chat_id: input.chatId,
        updated_at: new Date().toISOString(),
      });
      checkDB(saved.error);
      return reply(res, 200, { saved: true });
    }
    if (input.action === 'disconnect') {
      checkDB((await db.from('post_connections').delete().eq('owner_id', owner)).error);
      return reply(res, 200, { saved: true });
    }
    if (input.action === 'create') {
      await getProfile(db, owner, input.profileId);
      const post = newPost(input.profileId, input.brief, input.format, input.slides);
      if (input.scheduledFor) post.data.scheduledFor = input.scheduledFor;
      checkDB((await db.from('creator_posts').insert({ ...post, owner_id: owner })).error);
      return reply(res, 200, { post });
    }
    if (input.action === 'process') {
      const post = await processPost(db, owner, input.id, input.startNow);
      return reply(res, 200, { post: await signPost(db, owner, post) });
    }
    const post = await withPostLock(db, owner, input.id, async (post) => {
      if (input.action === 'material') {
        if (post.status !== 'draft')
          throw new PublicError(409, 'O material deve ser informado antes da produção.');
        post.data.evidence = input.evidence;
        delete post.data.materialNeeded;
      } else if (input.action === 'schedule') {
        if (post.status !== 'draft')
          throw new PublicError(409, 'Só rascunhos podem receber um horário de início.');
        if (input.scheduledFor) post.data.scheduledFor = input.scheduledFor;
        else delete post.data.scheduledFor;
      } else if (input.action === 'approve') {
        if (post.status !== 'awaiting_approval' || !allReviewsPassed(post))
          throw new PublicError(
            409,
            'A publicação precisa passar por todos os revisores antes da aprovação.',
          );
        post.status = 'approved';
        post.data.approvedAt = new Date().toISOString();
        post.data.approvedBy = 'human';
      } else if (input.action === 'retry') {
        if (post.status !== 'failed')
          throw new PublicError(
            409,
            'Esta publicação não possui uma etapa com falha para retomar.',
          );
        post.status = 'generating';
        delete post.data.error;
      } else if (input.action === 'reconcile') {
        if (post.status !== 'delivery_unknown')
          throw new PublicError(409, 'Não há entrega pendente de conferência.');
        if (input.received) {
          if (post.data.delivery.index < post.data.slides.length) post.data.delivery.index++;
          else post.data.delivery.captionSent = true;
        }
        post.status =
          post.data.delivery.index === post.data.slides.length && post.data.delivery.captionSent
            ? 'sent'
            : 'approved';
        delete post.data.error;
      } else if (input.action === 'revise' || input.action === 'edit') {
        if (
          ['sending', 'delivery_unknown', 'sent'].includes(post.status) ||
          post.data.delivery.index > 0
        )
          throw new PublicError(
            409,
            'Uma publicação com entrega iniciada não pode ser alterada. Crie outra publicação.',
          );
        if (input.action === 'revise') {
          checkDB(
            (
              await db.from('post_feedback').insert({
                owner_id: owner,
                profile_id: post.profile_id,
                post_id: post.id,
                instruction: input.instruction,
                snapshot: post.data,
              })
            ).error,
          );
        } else {
          if (input.slides.length !== post.data.slideCount)
            throw new PublicError(400, 'Mantenha a quantidade original de slides.');
          checkDB(
            (
              await db.from('post_feedback').insert({
                owner_id: owner,
                profile_id: post.profile_id,
                post_id: post.id,
                instruction:
                  `Edição humana aprovada como preferência para este perfil: ${JSON.stringify({ caption: input.caption, slides: input.slides.map(({ heading, body }) => ({ heading, body })) })}`.slice(
                    0,
                    4000,
                  ),
                snapshot: post.data,
              })
            ).error,
          );
        }
        post.data = {
          brief: post.data.brief,
          scheduledFor: post.data.scheduledFor,
          editorial: post.data.editorial,
          materialNeeded: post.data.materialNeeded,
          evidence: post.data.evidence,
          format: post.data.format,
          slideCount: post.data.slideCount,
          version: post.data.version + 1,
          stage: input.action === 'edit' ? 'images' : 'text',
          slides: input.action === 'edit' ? input.slides : [],
          title: post.data.title,
          caption: input.action === 'edit' ? input.caption : undefined,
          reviews: [],
          delivery: { index: 0, captionSent: false, messageIds: [] },
        };
        post.status = 'draft';
      }
      await savePost(db, owner, post);
      return post;
    });
    return reply(res, 200, { post: await signPost(db, owner, post) });
  } catch (error) {
    if (error instanceof PublicError) return reply(res, error.status, { error: error.message });
    console.error('post_creator_failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return reply(res, 500, { error: 'Não foi possível concluir a operação do criador.' });
  }
}
