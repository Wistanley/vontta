import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { encryptKey, decryptKey, storageReady, resolveAIConfig } from '../server/ai-settings';
import type { SupabaseClient } from '@supabase/supabase-js';
import handler from '../api/ai-settings';
test('chaves são cifradas com autenticação e vinculadas à conta e ao provedor', () => {
  const original = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  process.env.AI_SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  try {
    const secret = 'chave-ficticia-apenas-para-testes';
    const encrypted = encryptKey(secret, 'owner-a', 'openai');
    assert(!encrypted.includes(secret));
    assert.equal(decryptKey(encrypted, 'owner-a', 'openai'), secret);
    assert.throws(() => decryptKey(encrypted, 'owner-b', 'openai'));
    assert.throws(() => decryptKey(encrypted, 'owner-a', 'anthropic'));
    const changed = encrypted.slice(0, -3) + 'abc';
    assert.throws(() => decryptKey(changed, 'owner-a', 'openai'));
    assert.notEqual(encryptKey(secret, 'owner-a', 'openai'), encrypted);
    delete process.env.AI_SETTINGS_ENCRYPTION_KEY;
    assert.equal(storageReady(), false);
    assert.throws(() => encryptKey(secret, 'owner-a', 'openai'));
  } finally {
    if (original === undefined) delete process.env.AI_SETTINGS_ENCRYPTION_KEY;
    else process.env.AI_SETTINGS_ENCRYPTION_KEY = original;
  }
});
test('configurações de IA exigem autenticação para ler e alterar credenciais', async () => {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    for (const method of ['GET', 'PUT', 'DELETE']) {
      const response = await fetch(url, { method });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    const unsupported = await fetch(url, { method: 'POST' });
    assert.equal(unsupported.status, 405);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test('assistente usa provedor padrão e modelo pessoais sem depender de chaves do ambiente', async () => {
  const original = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  process.env.AI_SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  try {
    const owner = 'test-owner';
    const personal = {
      openai: {
        model: 'test-openai-model',
        encryptedKey: encryptKey('fake-openai-secret', owner, 'openai'),
      },
      anthropic: {
        model: 'test-anthropic-model',
        encryptedKey: encryptKey('fake-anthropic-secret', owner, 'anthropic'),
        workspaceId: 'workspace-test',
      },
    };
    const db = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { providers: personal, default_provider: 'anthropic' },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
    assert.deepEqual(await resolveAIConfig(db, owner, 'auto'), {
      provider: 'anthropic',
      model: 'test-anthropic-model',
      key: 'fake-anthropic-secret',
      workspaceId: 'workspace-test',
    });
    assert.deepEqual(await resolveAIConfig(db, owner, 'openai'), {
      provider: 'openai',
      model: 'test-openai-model',
      key: 'fake-openai-secret',
    });
    await assert.rejects(resolveAIConfig(db, 'another-owner', 'auto'));
  } finally {
    if (original === undefined) delete process.env.AI_SETTINGS_ENCRYPTION_KEY;
    else process.env.AI_SETTINGS_ENCRYPTION_KEY = original;
  }
});
