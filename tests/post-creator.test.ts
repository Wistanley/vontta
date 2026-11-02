import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
  defaultProfile,
  newPost,
  allReviewsPassed,
  scheduleSlot,
  profileSchema,
  isPostDue,
} from '../lib/post-creator';
import { processPost, enqueueSchedules, withPostLock } from '../server/post-creator';
import { encryptKey } from '../server/ai-settings';
import handler from '../api/post-creator';
import worker from '../api/post-worker';
import { willPlan, willProfile } from '../content/eusouwill-dev';
import { nextRetry, recoveryDue, MAX_CORRECTIONS } from '../lib/post-recovery';

test('retentativas aguardam o prazo, têm limite e não repetem cobrança, credenciais ou entrega incerta', () => {
  const post = newPost(randomUUID(), 'Tema', 'Post', 1);
  post.status = 'failed';
  const now = Date.parse('2026-11-01T12:00:00Z');
  post.data.retry = nextRetry(0, 502, 'provider_request_failed', now);
  assert.equal(recoveryDue(post, now), false);
  assert.equal(recoveryDue(post, now + 60000), true);
  for (const code of [
    'provider_billing',
    'provider_key_invalid',
    'provider_access_denied',
    'provider_model_unavailable',
  ])
    assert.equal(nextRetry(0, 502, code, now).nextAt, undefined);
  assert.equal(nextRetry(4, 503, 'stage_failed', now).nextAt, undefined);
  post.status = 'delivery_unknown';
  assert.equal(recoveryDue(post, now + 60000), false);
  assert.equal(MAX_CORRECTIONS, 3);
});

test('plano do Will contém 15 pautas em cinco semanas, primeiros fixados completos e cases sem evidência bloqueados', () => {
  assert(profileSchema.safeParse(willProfile).success);
  assert.equal(willPlan.length, 15);
  assert.equal(willPlan[0].slides.length, 10);
  assert.equal(willProfile.approval, 'human');
  assert.equal(willPlan.filter((p) => p.needs).length, 3);
  assert.equal(willPlan.filter((p) => p.original.includes('Reel')).length, 7);
  for (const [index, plan] of willPlan.entries()) {
    assert.equal(new Date(`${plan.date}T12:00:00Z`).getUTCDay(), [1, 3, 5][index % 3]);
    assert(plan.slides.length <= 10);
    if (index < 3) assert(plan.original.includes('Fixado'));
    for (const slide of plan.slides) {
      assert(slide.heading.length <= 180);
      assert(slide.body.length <= 800);
    }
  }
});

class Store {
  tables: Record<string, any[]> = {
    post_profiles: [],
    creator_posts: [],
    post_connections: [],
    post_feedback: [],
    user_ai_settings: [],
  };
  files = new Map<string, Buffer>();
  quota = true;
  from(table: string) {
    const store = this;
    let filters: ((r: any) => boolean)[] = [],
      op = 'select',
      payload: any,
      one = false,
      max = 1000,
      conflict = false;
    const query: any = {
      select() {
        return query;
      },
      eq(key: string, value: unknown) {
        filters.push((r) => r[key] === value);
        return query;
      },
      order() {
        return query;
      },
      limit(n: number) {
        max = n;
        return query;
      },
      single() {
        one = true;
        return query;
      },
      maybeSingle() {
        one = true;
        return query;
      },
      update(value: unknown) {
        op = 'update';
        payload = value;
        return query;
      },
      insert(value: unknown) {
        op = 'insert';
        payload = value;
        return query;
      },
      upsert(value: unknown, options?: any) {
        op = 'insert';
        payload = value;
        conflict = options?.ignoreDuplicates;
        return query;
      },
      then(resolve: (value: any) => unknown) {
        let rows = (store.tables[table] || []).filter((r) => filters.every((f) => f(r)));
        if (op === 'update') rows.forEach((r) => Object.assign(r, structuredClone(payload)));
        if (op === 'insert') {
          const exists =
            conflict &&
            store.tables[table].some(
              (r) => r.profile_id === payload.profile_id && r.slot === payload.slot,
            );
          if (exists) rows = [];
          else {
            store.tables[table].push(structuredClone(payload));
            rows = [payload];
          }
        }
        rows = structuredClone(rows.slice(0, max));
        return Promise.resolve(resolve({ data: one ? rows[0] || null : rows, error: null }));
      },
    };
    return query;
  }
  async rpc(name: string, args: any) {
    if (name === 'consume_post_quota') return { data: this.quota, error: null };
    const post = this.tables.creator_posts.find((p) => p.id === args.post_id);
    if (!post || post.lease_token) return { data: false, error: null };
    post.lease_token = args.token;
    return { data: true, error: null };
  }
  storage = {
    from: () => ({
      upload: async (name: string, bytes: Buffer) => {
        this.files.set(name, bytes);
        return { error: null };
      },
      download: async (name: string) => ({
        data: new Blob([new Uint8Array(this.files.get(name)!)]),
        error: null,
      }),
    }),
  };
}
const fixture = (approval: 'human' | 'automatic' = 'human') => {
  const owner = randomUUID(),
    profileId = randomUUID(),
    store = new Store();
  store.tables.post_profiles.push({
    id: profileId,
    owner_id: owner,
    spec: {
      ...defaultProfile(),
      name: 'Teste',
      audience: 'Gestores',
      imageModel: 'gpt-image-1',
      approval,
    },
  });
  const post = newPost(profileId, 'Organização de processos', 'Carrossel', 2);
  store.tables.creator_posts.push({ ...post, owner_id: owner });
  return { owner, profileId, store, db: store as unknown as SupabaseClient, post };
};
test('agendas respeitam fuso, dias e horário; slots são estáveis e perfis inválidos são rejeitados', async () => {
  const schedule = {
    id: randomUUID(),
    enabled: true,
    days: [4],
    time: '23:00',
    timezone: 'America/Sao_Paulo',
    format: 'Post' as const,
    slides: 1,
    brief: 'Tema do dia',
  };
  assert.equal(scheduleSlot(schedule, new Date('2026-10-23T01:59:00Z')), null);
  assert.equal(
    scheduleSlot(schedule, new Date('2026-10-23T02:00:00Z')),
    `${schedule.id}:2026-10-22`,
  );
  assert.equal(scheduleSlot(schedule, new Date('2026-10-23T03:00:00Z')), null);
  assert.equal(
    profileSchema.safeParse({
      ...defaultProfile(),
      name: 'Teste',
      audience: 'A',
      imageModel: 'm',
      schedules: [{ ...schedule, timezone: 'Inválido' }],
    }).success,
    false,
  );
  const { store, db } = fixture();
  store.tables.post_profiles[0].spec.schedules = [schedule];
  assert.equal(await enqueueSchedules(db, new Date('2026-10-23T02:00:00Z')), 1);
  assert.equal(store.tables.creator_posts[1].status, 'generating');
  assert.equal(await enqueueSchedules(db, new Date('2026-10-23T02:01:00Z')), 0);
  store.tables.post_profiles[0].spec.enabled = false;
  assert.equal(await enqueueSchedules(db, new Date('2026-10-30T02:01:00Z')), 0);
});
test('produção retoma etapas, revisa imagens reais, bloqueia reprovação, respeita aprovação e reconcilia Telegram', async () => {
  const originalFetch = globalThis.fetch;
  const oldEnv = {
    key: process.env.AI_SETTINGS_ENCRYPTION_KEY,
    api: process.env.OPENAI_API_KEY,
    model: process.env.AI_MODEL_OPENAI,
  };
  process.env.AI_SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  process.env.OPENAI_API_KEY = 'fake-key';
  process.env.AI_MODEL_OPENAI = 'test-model';
  const png = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#b3c49b' } })
    .png()
    .toBuffer();
  let rejectReview = false,
    transient = false,
    rejectImage = false,
    failDelivery = false,
    messages = 0,
    visualReceived = false,
    lastPrompt = '';
  globalThis.fetch = (async (input: any, options: any) => {
    const url = String(input);
    if (url.endsWith('/images/generations')) {
      if (rejectImage)
        return Response.json(
          {
            error: {
              message: 'private-provider-secret',
              type: 'billing',
              code: 'insufficient_quota',
            },
          },
          { status: 402 },
        );
      return Response.json({ created: 0, data: [{ b64_json: png.toString('base64') }] });
    }
    if (url.endsWith('/responses')) {
      if (transient)
        return Response.json({ error: { message: 'temporary upstream error' } }, { status: 503 });
      const body = JSON.parse(options.body);
      lastPrompt = options.body;
      const isScript = body.text?.format?.schema?.properties?.slides;
      const isCorrection = body.text?.format?.schema?.properties?.replaceImages;
      const isVisual = options.body.includes('Examine TODAS');
      if (isVisual) visualReceived = options.body.includes('data:image/png;base64,');
      const output = isScript
        ? {
            title: isCorrection ? 'Processos revisados' : 'Processos claros',
            ...(isCorrection ? { replaceImages: [] } : {}),
            caption: 'Organize uma etapa por vez.',
            slides: [1, 2].map((n) => ({
              heading: `Etapa ${n}`,
              body: 'Comece pelo processo.',
              imagePrompt: 'Arte clara e didática.',
            })),
          }
        : {
            approved: !rejectReview,
            notes: rejectReview ? 'Corrija o tom antes de publicar.' : 'Revisão concluída.',
          };
      return Response.json({
        id: 'response-test',
        model: 'test-model',
        created_at: 0,
        output: [
          {
            id: 'msg-test',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: JSON.stringify(output), annotations: [] }],
          },
        ],
        usage: { input_tokens: 10, output_tokens: 10 },
      });
    }
    if (url.startsWith('https://api.telegram.org')) {
      messages++;
      if (failDelivery) throw new Error('network private-token');
      return Response.json({ ok: true, result: { message_id: messages } });
    }
    throw new Error(`Unexpected external request: ${new URL(url).hostname}`);
  }) as typeof fetch;
  try {
    const rejected = fixture();
    await processPost(rejected.db, rejected.owner, rejected.post.id);
    rejectReview = true;
    const rejectedText = await processPost(rejected.db, rejected.owner, rejected.post.id);
    assert.equal(rejectedText.status, 'changes');
    assert.equal(rejectedText.data.reviews[0].reviewer, 'Português');
    assert.equal(rejected.store.files.size, 0);
    rejectReview = false;
    const recovering = fixture('automatic');
    transient = true;
    await assert.rejects(processPost(recovering.db, recovering.owner, recovering.post.id));
    const failed = recovering.store.tables.creator_posts[0];
    assert.equal(failed.status, 'failed');
    assert(failed.data.retry.nextAt);
    assert.equal(
      (await processPost(recovering.db, recovering.owner, recovering.post.id)).status,
      'failed',
    );
    failed.data.retry.nextAt = new Date(0).toISOString();
    transient = false;
    assert.equal(
      (await processPost(recovering.db, recovering.owner, recovering.post.id)).data.stage,
      'text_review',
    );
    rejectReview = true;
    await processPost(recovering.db, recovering.owner, recovering.post.id);
    const correction = recovering.store.tables.creator_posts[0];
    assert.equal(correction.data.autoCorrection.pending, true);
    assert.equal(
      (await processPost(recovering.db, recovering.owner, recovering.post.id)).status,
      'changes',
    );
    correction.data.autoCorrection.nextAt = new Date(0).toISOString();
    rejectReview = false;
    const corrected = await processPost(recovering.db, recovering.owner, recovering.post.id);
    assert.equal(corrected.status, 'generating');
    assert.equal(corrected.data.autoCorrection?.attempts, 1);
    assert.equal(corrected.data.reviews.length, 0);
    assert.equal(corrected.data.version, 2);
    for (let i = 0; i < 5; i++)
      await processPost(recovering.db, recovering.owner, recovering.post.id);
    assert.equal(recovering.store.tables.creator_posts[0].status, 'approved');
    const exhausted = recovering.store.tables.creator_posts[0];
    exhausted.status = 'changes';
    exhausted.data.autoCorrection = {
      attempts: MAX_CORRECTIONS,
      pending: true,
      nextAt: new Date(0).toISOString(),
      reviewer: 'Editorial',
      notes: 'Limite atingido',
    };
    assert.equal(
      (await processPost(recovering.db, recovering.owner, recovering.post.id)).status,
      'changes',
    );
    assert.equal(exhausted.data.autoCorrection.pending, false);
    const { store, db, owner, post } = fixture();
    store.tables.post_feedback.push({
      owner_id: owner,
      profile_id: post.profile_id,
      instruction: 'Use frases curtas.',
    });
    let result = await processPost(db, owner, post.id);
    assert.equal(result.data.stage, 'text_review');
    assert(lastPrompt.includes('Use frases curtas.'));
    result = await processPost(db, owner, post.id);
    assert.equal(result.data.reviews[0].reviewer, 'Português');
    assert.equal(store.files.size, 0);
    result = await processPost(db, owner, post.id);
    assert.equal(result.data.stage, 'images');
    assert.equal(store.files.size, 0);
    result = await processPost(db, owner, post.id);
    assert.equal(result.data.slides.filter((s) => s.asset).length, 1);
    rejectImage = true;
    await assert.rejects(processPost(db, owner, post.id), /créditos|cobrança/);
    assert.equal(store.tables.creator_posts[0].status, 'failed');
    assert.equal(store.files.size, 1);
    assert(!store.tables.creator_posts[0].data.error.includes('private-provider-secret'));
    rejectImage = false;
    store.tables.creator_posts[0].status = 'generating';
    result = await processPost(db, owner, post.id);
    assert.equal(result.data.stage, 'review');
    assert.equal(store.files.size, 2);
    for (const bytes of store.files.values()) {
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.width, 1080);
      assert.equal(meta.height, 1350);
    }
    rejectReview = true;
    result = await processPost(db, owner, post.id);
    assert.equal(result.status, 'changes');
    assert.equal(allReviewsPassed(result), false);
    assert.equal((await processPost(db, owner, post.id)).status, 'changes');
    assert.equal(messages, 0);
    rejectReview = false;
    store.tables.creator_posts[0].status = 'generating';
    delete store.tables.creator_posts[0].data.autoCorrection;
    store.tables.creator_posts[0].data.reviews = store.tables.creator_posts[0].data.reviews.filter(
      (review: any) => review.reviewer !== 'Visual',
    );
    result = await processPost(db, owner, post.id);
    assert.equal(result.status, 'awaiting_approval');
    assert.equal(visualReceived, true);
    assert.equal(allReviewsPassed(result), true);
    assert.equal((await processPost(db, owner, post.id)).status, 'awaiting_approval');
    assert.equal(messages, 0);
    const saved = store.tables.creator_posts[0];
    saved.status = 'approved';
    saved.data.approvedAt = new Date().toISOString();
    saved.data.approvedBy = 'human';
    store.tables.post_connections.push({
      owner_id: owner,
      chat_id: '1',
      encrypted_token: encryptKey('123:telegram-test', `telegram:${owner}`, 'openai'),
    });
    result = await processPost(db, owner, post.id);
    assert.equal(result.data.delivery.index, 1);
    failDelivery = true;
    await assert.rejects(processPost(db, owner, post.id), /Telegram/);
    assert.equal(saved.status, 'delivery_unknown');
    assert.equal(saved.data.delivery.index, 1);
    assert.equal((await processPost(db, owner, post.id)).status, 'delivery_unknown');
    assert.equal(messages, 2);
    // Operator confirms the uncertain second image arrived. Continue only with caption.
    saved.data.delivery.index = 2;
    saved.status = 'approved';
    failDelivery = false;
    result = await processPost(db, owner, post.id);
    assert.equal(result.status, 'sent');
    assert.equal(messages, 3);
    await processPost(db, owner, post.id);
    assert.equal(messages, 3);
    const automatic = fixture('automatic');
    let autoResult;
    for (let i = 0; i < 6; i++)
      autoResult = await processPost(automatic.db, automatic.owner, automatic.post.id);
    assert.equal(autoResult?.status, 'approved');
    assert.equal(autoResult?.data.approvedBy, 'automatic');
    automatic.store.tables.post_profiles[0].spec.approval = 'human';
    autoResult = await processPost(automatic.db, automatic.owner, automatic.post.id);
    assert.equal(autoResult.status, 'awaiting_approval');
    assert.equal(autoResult.data.approvedAt, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      AI_SETTINGS_ENCRYPTION_KEY: oldEnv.key,
      OPENAI_API_KEY: oldEnv.api,
      AI_MODEL_OPENAI: oldEnv.model,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
test('lease impede concorrência, quota bloqueia chamadas externas e propriedade é conferida', async () => {
  const { store, db, owner, post } = fixture();
  await withPostLock(db, owner, post.id, async () => {
    await assert.rejects(
      withPostLock(db, owner, post.id, async () => {}),
      /processado/,
    );
  });
  assert.equal(store.tables.creator_posts[0].lease_token, null);
  store.quota = false;
  await assert.rejects(processPost(db, owner, post.id), /60 etapas/);
  assert.equal(store.tables.creator_posts[0].status, 'draft');
  const saved = store.tables.creator_posts[0];
  saved.data.scheduledFor = '2099-10-26T12:00:00.000Z';
  assert.equal(isPostDue(saved, new Date('2099-10-26T11:59:59Z')), false);
  assert.equal(isPostDue(saved, new Date('2099-10-26T12:00:00Z')), true);
  await assert.rejects(processPost(db, owner, post.id), /horário agendado/);
  await assert.rejects(processPost(db, owner, post.id, true), /60 etapas/);
  saved.data.materialNeeded = 'Informe um caso real.';
  await assert.rejects(processPost(db, owner, post.id, true), /material real/);
  assert.equal(saved.status, 'draft');
  await assert.rejects(processPost(db, randomUUID(), post.id), /não encontrado/);
});
test('APIs do criador e worker bloqueiam chamadas sem autenticação', async () => {
  for (const api of [handler, worker]) {
    const server = createServer(api);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address() as { port: number };
      const response = await fetch(`http://127.0.0.1:${address.port}`);
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
});
