import { supabase } from '../lib/supabaseClient';
export async function pluggyRequest<T>(
  method = 'GET',
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Entre na sua conta para conectar seus bancos.');
  const response = await fetch('/api/pluggy', {
    method,
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: signal || AbortSignal.timeout(260000),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Não foi possível acessar a conexão Pluggy.');
  return result as T;
}
