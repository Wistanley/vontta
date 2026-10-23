import { supabase } from '../lib/supabaseClient';
import type { CreatorPost, PostProfile } from '../lib/post-creator';
export interface CreatorState {
  profiles: PostProfile[];
  posts: CreatorPost[];
  feedback: {
    id: string;
    profile_id: string;
    post_id: string;
    instruction: string;
    created_at: string;
  }[];
  connection: { configured: boolean; chatId: string };
  worker: { configured: boolean; lastRun: string | null };
}
export async function creatorRequest<T>(body?: unknown): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Entre na sua conta para usar as APIs do criador.');
  const response = await fetch('/api/post-creator', {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(240000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Não foi possível acessar o criador.');
  return result as T;
}
