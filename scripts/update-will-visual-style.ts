import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { willProfile, willVisualStyle } from '../content/eusouwill-dev';
import { profileSchema } from '../lib/post-creator';

const project = 'xkkppfljodsrudzvxsip';
const owner = 'bbac8532-39f8-404f-88ab-933a1ff1a7b5';
const profileId = 'fef72e17-756f-579f-a8d4-095fbe5fb995';
const apply = process.argv.includes('--apply');
const keys = JSON.parse(
  execFileSync('supabase', ['projects', 'api-keys', '--project-ref', project, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const key = keys.find((entry: { name: string }) => entry.name === 'service_role')?.api_key;
if (!key) throw new Error('Credencial administrativa não encontrada na CLI autenticada.');
const db = createClient(`https://${project}.supabase.co`, key, {
  auth: { persistSession: false },
});
const { data: account, error: accountError } = await db.auth.admin.getUserById(owner);
if (accountError || account.user.user_metadata?.name !== 'Will')
  throw new Error('A conta não corresponde ao titular confirmado.');
const { data: profile, error } = await db
  .from('post_profiles')
  .select('id,spec')
  .eq('owner_id', owner)
  .eq('id', profileId)
  .single();
if (error || profile?.spec.handle !== '@eusouwill.dev')
  throw new Error('Perfil confirmado não encontrado. Nenhuma alteração executada.');
const current = profileSchema.parse(profile.spec);
const marker = '\n\n[Padrão visual 22/10/2026]\n';
const appendStyle = (text: string, instruction: string) =>
  `${text.split(marker)[0]}${marker}${instruction}`;
const next = profileSchema.parse({
  ...current,
  imagePrompt: willProfile.imagePrompt,
  preferences: appendStyle(current.preferences, willVisualStyle),
  reviewPrompt: appendStyle(
    current.reviewPrompt,
    'Conferir Poppins Semibold 600 nos títulos, Medium 500 no apoio, Regular 400 no corpo, respiro e paleta do piloto. Fotos precisam ser reais, com fonte e licença registradas; não aceitar fotografia sintética como foto real nem banco de imagens apresentado como bastidor próprio.',
  ),
});
if (apply) {
  mkdirSync('artifacts/diagnostics', { recursive: true });
  const backup = `artifacts/diagnostics/will-visual-style-before-${Date.now()}.json`;
  writeFileSync(backup, JSON.stringify(profile, null, 2));
  const saved = await db
    .from('post_profiles')
    .update({ spec: next })
    .eq('owner_id', owner)
    .eq('id', profileId)
    .eq('spec', JSON.stringify(profile.spec))
    .select('id,spec')
    .single();
  if (saved.error || !saved.data)
    throw new Error(
      'O perfil foi alterado durante a operação ou a gravação falhou. Tente novamente.',
    );
  if (!isDeepStrictEqual(saved.data.spec, next))
    throw new Error('Divergência ao conferir os valores salvos no perfil.');
}
console.log(
  JSON.stringify({
    handle: current.handle,
    applied: apply,
    fields: ['imagePrompt', 'preferences', 'reviewPrompt'],
    approval: next.approval,
    schedules: next.schedules.length,
  }),
);
