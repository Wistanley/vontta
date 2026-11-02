import type { IncomingMessage, ServerResponse } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { reply, PublicError } from '../server/http.js';
import { enqueueSchedules, processPost, checkDB } from '../server/post-creator.js';
import { recoveryDue } from '../lib/post-recovery.js';

export const config = { maxDuration: 300 };
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!['GET', 'POST'].includes(req.method || ''))
    return reply(res, 405, { error: 'Método não permitido.' });
  const secret = process.env.CRON_SECRET;
  const expected = Buffer.from(`Bearer ${secret || ''}`);
  const actual = Buffer.from(req.headers.authorization || '');
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return reply(res, 401, { error: 'Acesso não autorizado.' });
  try {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new PublicError(503, 'Configure o worker no servidor.');
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    checkDB(
      (await db.from('post_worker_state').upsert({ id: true, last_run: new Date().toISOString() }))
        .error,
    );
    const enqueued = await enqueueSchedules(db);
    const [pending, scheduled, recovery, corrections] = await Promise.all([
      db
        .from('creator_posts')
        .select('id,owner_id,profile_id,lease_until,updated_at')
        .in('status', ['generating', 'approved', 'sending'])
        .order('updated_at')
        .limit(100),
      db
        .from('creator_posts')
        .select('id,owner_id,profile_id,lease_until,updated_at')
        .eq('status', 'draft')
        .lte('data->>scheduledFor', new Date().toISOString())
        .order('updated_at')
        .limit(100),
      db
        .from('creator_posts')
        .select('id,owner_id,profile_id,lease_until,updated_at,status,data')
        .eq('status', 'failed')
        .lte('data->retry->>nextAt', new Date().toISOString())
        .order('updated_at')
        .limit(100),
      db
        .from('creator_posts')
        .select('id,owner_id,profile_id,lease_until,updated_at,status,data')
        .eq('status', 'changes')
        .eq('data->autoCorrection->>pending', 'true')
        .lte('data->autoCorrection->>nextAt', new Date().toISOString())
        .order('updated_at')
        .limit(100),
    ]);
    checkDB(pending.error);
    checkDB(scheduled.error);
    checkDB(recovery.error);
    checkDB(corrections.error);
    const limitedOwners = new Set<string>();
    const candidates = [
      ...(pending.data || []),
      ...(scheduled.data || []),
      ...(recovery.data || []).filter((p) => recoveryDue(p)),
      ...(corrections.data || []).filter((p) => recoveryDue(p)),
    ].sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    for (const post of candidates) {
      if (
        limitedOwners.has(post.owner_id) ||
        (post.lease_until && new Date(post.lease_until).getTime() > Date.now())
      )
        continue;
      const profile = await db
        .from('post_profiles')
        .select('spec')
        .eq('id', post.profile_id)
        .eq('owner_id', post.owner_id)
        .single();
      if (!profile.data?.spec?.enabled) continue;
      try {
        const result = await processPost(db, post.owner_id, post.id);
        return reply(res, 200, { enqueued, processed: result.id, status: result.status });
      } catch (error) {
        if (error instanceof PublicError && error.status === 429) {
          limitedOwners.add(post.owner_id);
          continue;
        }
        if (error instanceof PublicError && error.status === 409) continue;
        const latest = await db.from('creator_posts').select('data').eq('id', post.id).single();
        if (latest.data)
          await db
            .from('creator_posts')
            .update({
              data: {
                ...latest.data.data,
                error:
                  error instanceof PublicError
                    ? error.message
                    : 'Falha ao executar a etapa. Retome pela interface.',
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', post.id);
        // processPost persists a bounded retry schedule for transient failures.
        return reply(res, 200, { enqueued, failed: post.id });
      }
    }
    return reply(res, 200, { enqueued, processed: null });
  } catch (error) {
    return reply(res, error instanceof PublicError ? error.status : 500, {
      error: error instanceof PublicError ? error.message : 'Falha no worker de publicações.',
    });
  }
}
