import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { radarSettingsSchema, type RadarJob } from '../../lib/radar.js';
import { PublicError } from '../http.js';

export function checked<T extends { error: any; data?: any }>(result: T): T['data'] {
  if (result.error)
    throw new PublicError(
      503,
      'Não foi possível salvar ou carregar o Radar. Confira a conexão e as migrações.',
    );
  return result.data;
}
export async function getSettings(db: SupabaseClient, owner: string) {
  const row = checked(
    await db.from('radar_settings').select('*').eq('owner_id', owner).maybeSingle(),
  );
  return {
    spec: radarSettingsSchema.parse(row?.spec || {}),
    encryptedToken: row?.encrypted_apify_token as string | null,
  };
}
export async function owned(db: SupabaseClient, table: string, owner: string, id: string) {
  const row = checked(
    await db.from(table).select('*').eq('owner_id', owner).eq('id', id).maybeSingle(),
  );
  if (!row) throw new PublicError(404, 'Registro não encontrado neste espaço.');
  return row;
}
export async function enqueue(
  db: SupabaseClient,
  owner: string,
  kind: RadarJob['kind'],
  payload: Record<string, unknown>,
  key: string = randomUUID(),
) {
  const row = { owner_id: owner, kind, payload, idempotency_key: `${kind}:${key}` };
  const result = await db.from('radar_jobs').insert(row).select('*').single();
  if (result.error?.code === '23505')
    return checked(
      await db
        .from('radar_jobs')
        .select('*')
        .eq('owner_id', owner)
        .eq('idempotency_key', row.idempotency_key)
        .single(),
    );
  return checked(result);
}
export async function event(
  db: SupabaseClient,
  owner: string,
  kind: string,
  message: string,
  jobId?: string,
) {
  checked(
    await db
      .from('radar_events')
      .insert({ owner_id: owner, kind, message: message.slice(0, 1500), job_id: jobId || null }),
  );
}
