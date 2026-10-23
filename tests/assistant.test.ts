import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import handler from '../api/assistant';
import { APICallError, RetryError } from 'ai';
import { describeAIError } from '../server/ai-errors';

test('falhas do provedor mostram uma solução sem expor respostas ou credenciais', () => {
  const failure = (statusCode: number, message: string) =>
    new APICallError({
      statusCode,
      message,
      url: 'https://provider.invalid?key=secret',
      requestBodyValues: { secret: 'private-context' },
      responseBody: message + ' secret',
    });
  const billing = describeAIError(failure(402, 'Your prepayment credits are depleted'), 'google');
  assert.equal(billing.status, 402);
  assert.equal(billing.code, 'provider_billing');
  assert.match(billing.message, /Google.*créditos/);
  const quota = describeAIError(
    new RetryError({
      reason: 'maxRetriesExceeded',
      message: 'secret',
      errors: [failure(429, 'insufficient_quota')],
    }),
    'openai',
  );
  assert.equal(quota.code, 'provider_billing');
  const workspace = describeAIError(
    failure(400, 'include the anthropic-workspace-id header'),
    'anthropic',
  );
  assert.equal(workspace.code, 'provider_workspace_required');
  assert.match(workspace.message, /ID do workspace/);
  assert.equal(describeAIError(failure(401, 'bad key'), 'openai').code, 'provider_key_invalid');
  assert.equal(describeAIError(failure(429, 'rate limit'), 'google').code, 'provider_rate_limit');
  assert.equal(
    describeAIError(failure(404, 'model not found'), 'google').code,
    'provider_model_unavailable',
  );
  for (const result of [billing, quota, workspace, describeAIError(new Error('secret'))]) {
    assert(!JSON.stringify(result).includes('secret'));
    assert(!JSON.stringify(result).includes('private-context'));
  }
});
test('API bloqueia métodos incorretos e chamadas sem autenticação', async () => {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const get = await fetch(url);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    const post = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'ideias', action: 'ideas' }),
    });
    assert.equal(post.status, 401);
    assert.match((await post.json()).error, /conta/);
    assert.equal(post.headers.get('cache-control'), 'no-store');
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
