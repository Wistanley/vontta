import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { willPlan, willProfile, cycle } from '../content/eusouwill-dev';
import { profileSchema, newPost } from '../lib/post-creator';
import type { CreatorPost } from '../lib/post-creator';

const apply = process.argv.includes('--apply');
const project = 'xkkppfljodsrudzvxsip';
const keys = JSON.parse(
  execFileSync('supabase', ['projects', 'api-keys', '--project-ref', project, '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }),
);
const db = createClient(
  `https://${project}.supabase.co`,
  keys.find((k: { name: string }) => k.name === 'service_role').api_key,
  { auth: { persistSession: false } },
);
const accounts = await db.from('user_ai_settings').select('owner_id');
if (accounts.error || accounts.data.length !== 1)
  throw new Error('Esperada uma única conta com configuração de IA. Nenhuma escrita executada.');
const owner = accounts.data[0].owner_id;
const account = await db.auth.admin.getUserById(owner);
if (
  account.error ||
  account.data.user.user_metadata?.name !== 'Will' ||
  owner !== 'bbac8532-39f8-404f-88ab-933a1ff1a7b5'
)
  throw new Error('A conta não corresponde ao titular confirmado.');
function stableId(name: string) {
  const h = createHash('sha256').update(`vontta:${owner}:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
const existing = await db.from('post_profiles').select('*').eq('owner_id', owner);
if (existing.error) throw existing.error;
const matching = existing.data.filter((p) => p.spec.handle?.toLowerCase() === '@eusouwill.dev');
if (matching.length > 1) throw new Error('Há mais de um perfil com este identificador.');
const profileId = matching[0]?.id || stableId('profile:@eusouwill.dev');
const spec = profileSchema.parse(willProfile);
const oldPosts = await db
  .from('creator_posts')
  .select('*')
  .eq('owner_id', owner)
  .eq('profile_id', profileId);
if (oldPosts.error) throw oldPosts.error;
const oldEntries = await db
  .from('workspace_entries')
  .select('id,payload')
  .eq('owner_id', owner)
  .eq('kind', 'content');
if (oldEntries.error) throw oldEntries.error;
const now = Date.now();
const posts: (CreatorPost & { owner_id: string; slot: string })[] = willPlan.map((plan, index) => {
  const post = newPost(
    profileId,
    `Fase 1 · Semana ${Math.floor(index / 3) + 1}. Tema: ${plan.title}. ${index < 3 ? `Fixado ${index + 1}: compor a vitrine do perfil.` : ''} Referência original: ${plan.original}. ${plan.needs ? 'Estrutura: Antes → Problema → O que construímos → Depois → Resultado, somente com o material real fornecido.' : 'Preservar as mensagens do roteiro preparado; revisar as artes e legenda antes da aprovação humana.'} CTA: ${plan.cta}`,
    'Carrossel',
    plan.slides.length || 6,
  );
  post.id = stableId(`${cycle}:feed:${index + 1}`);
  post.created_at = new Date(now - index * 1000).toISOString();
  Object.assign(post.data, {
    title: plan.title,
    caption: plan.caption,
    slides: plan.slides,
    stage: plan.slides.length ? 'images' : 'text',
    scheduledFor: `${plan.date}T12:00:00.000Z`,
    ...(plan.needs ? { materialNeeded: plan.needs } : {}),
    editorial: {
      cycle,
      week: Math.floor(index / 3) + 1,
      originalFormat: plan.original,
      pinned: index < 3,
      pillar: plan.pillar,
      stories: plan.stories,
    },
  });
  return { ...post, owner_id: owner, slot: `${cycle}:feed:${index + 1}` };
});
const stories = [0, 3, 6, 9, 12].map((offset, index) => {
  const plan = willPlan[offset];
  const post = newPost(
    profileId,
    `Stories manuais de apoio à semana ${index + 1} do ciclo. ${plan.stories} Use linguagem espontânea e pouco texto. Quando uma tela depender de foto, vídeo, trabalho real ou opinião pessoal de Will, não invente essa evidência: indique o material necessário. Não gerar um bastidor fictício.`,
    'Stories',
    3,
  );
  post.id = stableId(`${cycle}:stories:${index + 1}`);
  post.created_at = new Date(now - (16 + index) * 1000).toISOString();
  post.data.title = `Stories · Semana ${index + 1} · ${plan.title}`;
  post.data.editorial = {
    cycle,
    week: index + 1,
    originalFormat: 'Stories de apoio · criação manual',
    pinned: false,
    pillar: plan.pillar,
    stories: plan.stories,
  };
  return { ...post, owner_id: owner, slot: `${cycle}:stories:${index + 1}` };
});
const reels = willPlan
  .filter((p) => p.original.includes('Reel'))
  .map((plan) => {
    const id = stableId(`${cycle}:reel:${plan.date}`);
    return {
      owner_id: owner,
      id,
      kind: 'content',
      payload: {
        id,
        kind: 'content',
        title: plan.title,
        createdAt: new Date(now).toISOString(),
        format: 'Reels',
        status: plan.needs ? 'Ideia' : 'Roteiro',
        pillar: 'IA nos negócios',
        date: plan.date,
        hook: plan.slides[0]?.heading || plan.title,
        script:
          plan.script ||
          `AGUARDANDO MATERIAL REAL\n${plan.needs}\n\nGravação: mostrar o problema, explicar a funcionalidade real, os dados e limites do agente e uma decisão de arquitetura autorizada. Não preencher com informação inventada.`,
        caption: plan.caption,
        cta: plan.cta,
        checklist: [],
        profileHandle: '@eusouwill.dev',
        cycle,
        recordingNotes: `Publicação editorial prevista para ${plan.date}. Versão em carrossel preparada no Criador de posts. Escolher o formato a publicar; não duplicar a frequência automaticamente.`,
      },
    };
  });
const report = {
  ownerName: 'Will',
  profileId,
  handle: spec.handle,
  firstCreation: posts[0].data.scheduledFor,
  lastCreation: posts.at(-1)!.data.scheduledFor,
  timezone: 'America/Sao_Paulo',
  cadence: 'segunda, quarta e sexta às 09:00',
  approval: spec.approval,
  scheduledPosts: posts.length,
  readyScripts: posts.filter((p) => p.data.slides.length).length,
  awaitingRealMaterial: posts.filter((p) => p.data.materialNeeded).map((p) => p.data.title),
  manualStories: stories.length,
  recordingScripts: reels.length,
  imageModel: spec.imageModel,
  applied: false,
};
mkdirSync('artifacts/diagnostics', { recursive: true });
if (apply) {
  writeFileSync(
    'artifacts/diagnostics/eusouwill-before-config.json',
    JSON.stringify(
      {
        profiles: matching,
        posts: oldPosts.data,
        existingContentIds: oldEntries.data.map((e) => e.id),
      },
      null,
      2,
    ),
  );
  // Existing profile edits are preserved on repeat runs. Every seed row has a stable ID.
  if (!matching.length) {
    const saved = await db.from('post_profiles').insert({ id: profileId, owner_id: owner, spec });
    if (saved.error) throw saved.error;
  }
  const postIds = new Set(oldPosts.data.map((p) => p.id));
  const additions = [...posts, ...stories].filter((p) => !postIds.has(p.id));
  if (additions.length) {
    const saved = await db.from('creator_posts').insert(additions);
    if (saved.error) throw saved.error;
  }
  const entryIds = new Set(oldEntries.data.map((p) => p.id));
  const newReels = reels.filter((r) => !entryIds.has(r.id));
  if (newReels.length) {
    const saved = await db.from('workspace_entries').insert(newReels);
    if (saved.error) throw saved.error;
  }
  report.applied = true;
}
writeFileSync(
  'artifacts/diagnostics/eusouwill-configuration.json',
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
