import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  bankEntryId,
  brazilDate,
  decryptPluggy,
  encryptPluggy,
  normalizeAccount,
  normalizeTransaction,
  PluggyClient,
} from '../server/pluggy';
import {
  financialSummary,
  newEntry,
  personalProject,
  projectExpenses,
  type Transaction,
} from '../lib/workspace';
import handler from '../api/pluggy';
const account = normalizeAccount(
  {
    id: randomUUID(),
    itemId: randomUUID(),
    name: 'Cartão de teste',
    type: 'CREDIT',
    number: '1234567812345678',
    balance: 420,
    currencyCode: 'BRL',
    creditData: { creditLimit: 3000, availableCreditLimit: 2580 },
  },
  'Banco fictício',
);
const raw = () => ({
  id: randomUUID(),
  accountId: account.id,
  description: 'Fornecedor',
  amount: 120.5,
  currencyCode: 'BRL',
  date: '2026-10-22T01:30:00.000Z',
  status: 'POSTED',
  creditCardMetadata: { installmentNumber: 2, totalInstallments: 6 },
});
const now = '2026-10-22T15:00:00.000Z';
test('projetos pessoais calculam gastos próprios, pendências e estouro sem misturar receitas ou transferências', () => {
  const project = { ...personalProject('wedding'), budget: 1000 };
  assert.equal(project.projectType, 'personal');
  assert.equal(project.clientId, '');
  assert.equal(personalProject('home').stages.length, 4);
  const expense = (amount: number, paid: boolean): Transaction => ({
    ...(newEntry('transaction') as Transaction),
    type: 'expense',
    projectId: project.id,
    amount,
    paid,
    category: 'Cerimônia',
  });
  const items = [
    expense(300.1, true),
    expense(800.2, false),
    { ...expense(500, true), excludedFromTotals: true },
    { ...expense(600, true), type: 'income' as const },
    { ...expense(200, true), projectId: 'other' },
  ];
  const summary = projectExpenses(project, items);
  assert.equal(summary.expenses, 1100.3);
  assert.equal(summary.paid, 300.1);
  assert.equal(summary.payable, 800.2);
  assert.equal(Math.round(summary.remaining * 100), -10030);
  assert.equal(summary.categories[0].amount, 1100.3);
  assert.equal(financialSummary([{ ...expense(500, true), excludedFromTotals: true }]).expenses, 0);
});
test('importação mascara conta, converte fuso e sinais e não confunde cartão efetivado com fatura paga', () => {
  assert.equal(account.number, '5678');
  assert.equal(brazilDate(raw().date), '2026-10-21');
  const card = normalizeTransaction(raw(), account, 'owner', now);
  assert.equal(card.type, 'expense');
  assert.equal(card.paid, false);
  assert.equal(card.bank?.installmentNumber, 2);
  const bank = { ...account, type: 'BANK' as const };
  assert.equal(normalizeTransaction({ ...raw(), amount: -50 }, bank, 'owner', now).type, 'expense');
  assert.equal(normalizeTransaction(raw(), bank, 'owner', now).type, 'income');
  assert.equal(normalizeTransaction(raw(), bank, 'owner', now).paid, true);
  assert.equal(
    normalizeTransaction({ ...raw(), status: 'PENDING' }, bank, 'owner', now).paid,
    false,
  );
  const payment = normalizeTransaction(
    { ...raw(), amount: -120.5, operationType: 'PAGAMENTO_FATURA' },
    account,
    'owner',
    now,
  );
  assert.equal(payment.type, 'income');
  assert.equal(payment.excludedFromTotals, true);
  const pending = normalizeTransaction(
    { ...raw(), status: 'PENDING', creditCardMetadata: { billForecastDate: '2026-12' } },
    account,
    'owner',
    now,
  );
  assert.equal(pending.date, '2026-12-01');
  assert.equal(pending.paid, false);
  assert.throws(() =>
    normalizeTransaction({ ...raw(), accountId: randomUUID() }, account, 'owner', now),
  );
  assert.throws(() =>
    normalizeTransaction({ ...raw(), currencyCode: 'USD' }, account, 'owner', now),
  );
  assert.equal(
    normalizeTransaction(
      { ...raw(), currencyCode: 'USD', amountInAccountCurrency: 650 },
      account,
      'owner',
      now,
    ).amount,
    650,
  );
  assert.throws(() =>
    normalizeTransaction(raw(), { ...account, currencyCode: 'USD' }, 'owner', now),
  );
});
test('identidade da importação é estável e isolada por conta e usuário', () => {
  const input = raw();
  const one = normalizeTransaction(input, account, 'owner-a', now);
  assert.equal(one.id, normalizeTransaction(input, account, 'owner-a', now).id);
  assert.notEqual(one.id, normalizeTransaction(input, account, 'owner-b', now).id);
  assert.notEqual(one.id, bankEntryId('owner-a', randomUUID(), input.id));
});
test('credencial Pluggy é cifrada, autenticada e vinculada ao proprietário', () => {
  const previous = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  process.env.AI_SETTINGS_ENCRYPTION_KEY = randomBytes(32).toString('hex');
  try {
    const encrypted = encryptPluggy('secret-ficticio', 'owner-a');
    assert(!encrypted.includes('secret-ficticio'));
    assert.equal(decryptPluggy(encrypted, 'owner-a'), 'secret-ficticio');
    assert.throws(() => decryptPluggy(encrypted, 'owner-b'));
    assert.throws(() => decryptPluggy(encrypted.slice(0, -5) + 'xxxxx', 'owner-a'));
  } finally {
    if (previous === undefined) delete process.env.AI_SETTINGS_ENCRYPTION_KEY;
    else process.env.AI_SETTINGS_ENCRYPTION_KEY = previous;
  }
});
test('paginação segue next completo, deduplica e rejeita cursor externo, circular e leitura parcial', async () => {
  const one = raw(),
    two = raw();
  const next = `?accountId=${account.id}&dateFrom=2025-10-22&after=YWJj%2B%3D`;
  const urls: string[] = [];
  const request = async (input: string | URL | Request) => {
    const url = String(input);
    urls.push(url);
    return Response.json(
      url.endsWith(next) ? { results: [one, two], next: null } : { results: [one], next },
    );
  };
  const entries = await new PluggyClient('test', request as typeof fetch).transactions(
    account,
    'owner',
    now,
    '2025-10-22',
  );
  assert.equal(entries.length, 2);
  assert.equal(urls[1], 'https://api.pluggy.ai/v2/transactions' + next);
  for (const badNext of [
    'https://evil.test/secret',
    `?accountId=${randomUUID()}&after=x`,
    `?accountId=${account.id}&after=x`,
  ]) {
    let calls = 0;
    const bad = new PluggyClient('test', (async () => {
      calls++;
      return Response.json({ results: [one], next: badNext });
    }) as typeof fetch);
    await assert.rejects(() => bad.transactions(account, 'owner', now, '2025-10-22'));
    assert(calls <= 2);
  }
  let calls = 0;
  const partial = new PluggyClient('test', (async () =>
    ++calls === 1
      ? Response.json({ results: [one], next })
      : new Response('secret-provider-body', { status: 500 })) as typeof fetch);
  await assert.rejects(
    () => partial.transactions(account, 'owner', now, '2025-10-22'),
    (e: Error) => !e.message.includes('secret-provider-body'),
  );
});
test('consentimento expirado e conexão com erro bloqueiam leitura e preservam histórico', async () => {
  for (const item of [
    { status: 'UPDATED', consentExpiresAt: '2020-01-01' },
    { status: 'LOGIN_ERROR' },
  ]) {
    const client = new PluggyClient('test', (async () =>
      Response.json({
        id: account.itemId,
        connector: { name: 'MeuPluggy' },
        ...item,
      })) as typeof fetch);
    await assert.rejects(() => client.accounts(account.itemId));
  }
});
test('API Pluggy bloqueia operações sem autenticação e não permite cache', async () => {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  try {
    for (const method of ['GET', 'PUT', 'POST', 'DELETE']) {
      const response = await fetch(`http://127.0.0.1:${address.port}`, { method });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(
      (await fetch(`http://127.0.0.1:${address.port}`, { method: 'PATCH' })).status,
      405,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
