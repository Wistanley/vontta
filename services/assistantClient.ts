import { supabase } from '../lib/supabaseClient';
export async function askAssistant(prompt: string): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch('/api/assistant', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token || ''}`,
    },
    body: JSON.stringify({ action: 'chat', prompt: prompt.slice(-4000), provider: 'auto' }),
    signal: AbortSignal.timeout(90000),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Não foi possível consultar a IA.');
  return body.text;
}
