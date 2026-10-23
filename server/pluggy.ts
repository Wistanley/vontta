import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { PublicError } from './http.js';
import type { BankAccount } from '../lib/pluggy.js';
import type { Transaction } from '../lib/workspace.js';

const origin = 'https://api.pluggy.ai';
export const credentialsSchema = z.object({
  clientId: z.string().trim().min(1).max(300),
  clientSecret: z.string().trim().min(1).max(2000).optional(),
  itemIds: z
    .array(z.string().uuid())
    .min(1)
    .max(5)
    .transform((ids) => [...new Set(ids)]),
});
function masterKey() {
  const value = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!value || !/^[a-f\d]{64}$/i.test(value))
    throw new PublicError(
      503,
      'O armazenamento protegido de credenciais precisa ser habilitado no servidor.',
    );
  return Buffer.from(value, 'hex');
}
export function pluggyStorageReady() {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}
export function encryptPluggy(secret: string, owner: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  cipher.setAAD(Buffer.from(`vontta:pluggy:${owner}`));
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    data.toString('base64'),
  ].join('.');
}
export function decryptPluggy(packet: string, owner: string) {
  try {
    const [version, iv, tag, data] = packet.split('.');
    if (version !== 'v1' || !iv || !tag || !data) throw new Error();
    const cipher = createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(iv, 'base64'));
    cipher.setAAD(Buffer.from(`vontta:pluggy:${owner}`));
    cipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([cipher.update(Buffer.from(data, 'base64')), cipher.final()]).toString(
      'utf8',
    );
  } catch {
    throw new PublicError(
      503,
      'Não foi possível abrir a credencial Pluggy. Salve o Client Secret novamente.',
    );
  }
}
const remoteAccountSchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['BANK', 'CREDIT']),
  number: z.string().nullish(),
  balance: z.number().finite(),
  currencyCode: z.string(),
  creditData: z
    .object({
      creditLimit: z.number().nullish(),
      availableCreditLimit: z.number().nullish(),
      balanceDueDate: z.string().nullish(),
      balanceCloseDate: z.string().nullish(),
    })
    .nullish(),
});
export function normalizeAccount(input: unknown, institution: string): BankAccount {
  const a = remoteAccountSchema.parse(input);
  return {
    id: a.id,
    itemId: a.itemId,
    name: a.name,
    institution,
    type: a.type,
    number: (a.number || '').replace(/\D/g, '').slice(-4),
    balance: a.balance,
    currencyCode: a.currencyCode,
    creditLimit: a.creditData?.creditLimit ?? undefined,
    availableCreditLimit: a.creditData?.availableCreditLimit ?? undefined,
    balanceDueDate: a.creditData?.balanceDueDate ?? undefined,
    balanceCloseDate: a.creditData?.balanceCloseDate ?? undefined,
  };
}
const transactionSchema = z.object({
  id: z.string().uuid(),
  accountId: z.string().uuid(),
  description: z.string(),
  amount: z.number().finite(),
  amountInAccountCurrency: z.number().finite().nullish(),
  currencyCode: z.string(),
  date: z.string().datetime({ offset: true }),
  status: z.enum(['PENDING', 'POSTED']),
  category: z.string().nullish(),
  operationType: z.string().nullish(),
  creditCardMetadata: z
    .object({
      installmentNumber: z.number().int().positive().nullish(),
      totalInstallments: z.number().int().positive().nullish(),
      billForecastDate: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .nullish(),
    })
    .nullish(),
});
export function bankEntryId(owner: string, accountId: string, transactionId: string) {
  const hex = createHash('sha256')
    .update(`pluggy:${owner}:${accountId}:${transactionId}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function brazilDate(value: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function normalizeTransaction(
  input: unknown,
  account: BankAccount,
  owner: string,
  syncedAt: string,
): Transaction {
  const t = transactionSchema.parse(input);
  if (t.accountId !== account.id)
    throw new PublicError(502, 'O Pluggy retornou uma transação de outra conta.');
  const amount = t.currencyCode === account.currencyCode ? t.amount : t.amountInAccountCurrency;
  if (account.currencyCode !== 'BRL' || amount == null)
    throw new PublicError(
      422,
      'A importação financeira requer valores em reais. A conta não foi alterada.',
    );
  const card = account.type === 'CREDIT';
  const expense = card ? amount >= 0 : amount < 0;
  const local = brazilDate(t.date);
  const forecast = t.creditCardMetadata?.billForecastDate;
  return {
    id: bankEntryId(owner, account.id, t.id),
    kind: 'transaction',
    createdAt: syncedAt,
    title: t.description || 'Movimentação bancária',
    type: expense ? 'expense' : 'income',
    amount: Math.round(Math.abs(amount) * 100) / 100,
    date:
      card && forecast && t.status === 'PENDING' && forecast !== local.slice(0, 7)
        ? `${forecast}-01`
        : local,
    // POSTED is an effective bank entry, not proof a credit-card bill was paid.
    paid: !card && t.status === 'POSTED',
    category: t.category || 'Sem categoria',
    projectId: '',
    recurrence: 'none',
    excludedFromTotals: /^(PAGAMENTO_FATURA|CREDIT_CARD_PAYMENT|BILL_PAYMENT_CREDIT_CARD)$/.test(
      t.operationType || '',
    ),
    bank: {
      provider: 'pluggy',
      accountId: account.id,
      transactionId: t.id,
      accountName: `${account.institution} · ${account.name}`,
      accountType: account.type,
      status: t.status,
      originalDate: t.date,
      syncedAt,
      installmentNumber: t.creditCardMetadata?.installmentNumber ?? undefined,
      totalInstallments: t.creditCardMetadata?.totalInstallments ?? undefined,
      billForecastDate: forecast ?? undefined,
      operationType: t.operationType ?? undefined,
    },
  };
}
export class PluggyClient {
  constructor(
    private apiKey: string,
    private request: typeof fetch = fetch,
  ) {}
  static async connect(clientId: string, clientSecret: string, request: typeof fetch = fetch) {
    const result = await PluggyClient.call('/auth', undefined, request, { clientId, clientSecret });
    const auth = z.object({ apiKey: z.string().min(1) }).parse(result);
    return new PluggyClient(auth.apiKey, request);
  }
  private static async call(
    path: string,
    key: string | undefined,
    request: typeof fetch,
    body?: unknown,
  ): Promise<unknown> {
    try {
      const response = await request(origin + path, {
        method: body ? 'POST' : 'GET',
        redirect: 'error',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'X-API-KEY': key } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) {
        const status = response.status;
        throw new PublicError(
          status === 429 ? 429 : status === 401 || status === 403 ? 400 : 502,
          status === 401 || status === 403
            ? 'Acesso recusado pelo Pluggy. Confira as credenciais, o conector MeuPluggy e as autorizações.'
            : status === 404
              ? 'Conexão não encontrada no Pluggy. Confira o itemId.'
              : status === 429
                ? 'Limite do Pluggy atingido. Aguarde antes de sincronizar novamente.'
                : 'O Pluggy está indisponível. Seus registros foram preservados.',
        );
      }
      return await response.json();
    } catch (error) {
      if (error instanceof PublicError) throw error;
      throw new PublicError(502, 'Não foi possível concluir a leitura do Pluggy. Tente novamente.');
    }
  }
  get(path: string) {
    return PluggyClient.call(path, this.apiKey, this.request);
  }
  async item(id: string) {
    const item = z
      .object({
        id: z.string().uuid(),
        status: z.string(),
        consentExpiresAt: z.string().nullish(),
        connector: z.object({ name: z.string() }),
        error: z.object({ code: z.string().optional() }).nullish(),
      })
      .parse(await this.get(`/items/${id}`));
    if (item.id !== id) throw new PublicError(502, 'O Pluggy retornou outra conexão.');
    if (
      (item.consentExpiresAt && new Date(item.consentExpiresAt).getTime() <= Date.now()) ||
      item.error?.code === 'USER_AUTHORIZATION_EXPIRED'
    )
      throw new PublicError(
        409,
        'A autorização do Meu Pluggy expirou. Reconecte no Dashboard, escolha MeuPluggy e confira o novo itemId.',
      );
    if (item.status !== 'UPDATED')
      throw new PublicError(
        409,
        'Esta conexão ainda não está pronta. Confira o estado e a autorização no Meu Pluggy e tente novamente.',
      );
    return item;
  }
  async accounts(itemId: string) {
    const item = await this.item(itemId);
    const page = z
      .object({ results: z.array(z.unknown()), totalPages: z.number().optional() })
      .parse(await this.get(`/accounts?itemId=${itemId}`));
    if ((page.totalPages || 1) > 1)
      throw new PublicError(
        502,
        'O Pluggy retornou uma lista incompleta de contas. Nenhum lançamento foi alterado.',
      );
    return page.results.map((a) => normalizeAccount(a, item.connector.name));
  }
  async transactions(account: BankAccount, owner: string, syncedAt: string, dateFrom: string) {
    let query = `?accountId=${account.id}&dateFrom=${dateFrom}`;
    const seen = new Set<string>();
    const entries = new Map<string, Transaction>();
    const started = Date.now();
    for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
      if (Date.now() - started > 220000)
        throw new PublicError(
          504,
          'A leitura do histórico demorou demais. Seus registros foram preservados. Tente novamente.',
        );
      if (seen.has(query))
        throw new PublicError(
          502,
          'A paginação do Pluggy se repetiu. Seus registros foram preservados.',
        );
      seen.add(query);
      const page = z
        .object({ results: z.array(z.unknown()), next: z.string().nullable() })
        .parse(await this.get('/v2/transactions' + query));
      for (const raw of page.results) {
        const entry = normalizeTransaction(raw, account, owner, syncedAt);
        entries.set(entry.id, entry);
      }
      if (page.next === null) return [...entries.values()];
      // Only accept query strings for this account; never follow arbitrary webhook/response URLs.
      const params = new URLSearchParams(page.next.startsWith('?') ? page.next.slice(1) : '');
      if (
        !page.next.startsWith('?') ||
        params.get('accountId') !== account.id ||
        !params.get('after') ||
        (params.has('dateFrom') && params.get('dateFrom') !== dateFrom)
      )
        throw new PublicError(
          502,
          'O Pluggy retornou um cursor inválido. Seus registros foram preservados.',
        );
      query = page.next;
    }
    throw new PublicError(
      422,
      'O histórico excede o limite desta importação. Nenhum lançamento foi alterado.',
    );
  }
}
