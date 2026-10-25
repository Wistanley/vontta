import { supabase } from '../lib/supabaseClient';
export async function radarRequest<T = any>(body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Entre na sua conta para usar o Radar.');
  const response = await fetch('/api/radar', {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(60000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Não foi possível acessar o Radar.');
  return result as T;
}
