import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { authenticateRequest, PublicError, readBody, reply } from '../server/http.js';
import {
  credentialsSchema,
  decryptPluggy,
  encryptPluggy,
  PluggyClient,
  pluggyStorageReady,
} from '../server/pluggy.js';
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  if (!['GET', 'PUT', 'POST', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PUT, POST, DELETE');
    return reply(res, 405, { error: 'Método não permitido.' });
  }
  try {
    const { db, user } = await authenticateRequest(req);
    const { data: settings, error } = await db
      .from('user_pluggy_settings')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (error)
      throw new PublicError(
        503,
        'A conexão Pluggy precisa da migração de banco 20261022_personal_projects_pluggy.sql.',
      );
    if (req.method === 'GET') {
      const { data: accounts, error: accountError } = await db
        .from('pluggy_accounts')
        .select('payload,synced_at')
        .eq('owner_id', user.id);
      if (accountError)
        throw new PublicError(503, 'Não foi possível carregar suas contas conectadas.');
      return reply(res, 200, {
        configured: !!settings,
        storageReady: pluggyStorageReady(),
        clientId: settings?.client_id || '',
        itemIds: settings?.item_ids || [],
        accounts: (accounts || [])
          .filter((a) => settings?.item_ids?.includes(a.payload.itemId))
          .map((a) => ({ ...a.payload, syncedAt: a.synced_at || undefined })),
      });
    }
    if (req.method === 'DELETE') {
      const { error } = await db.from('user_pluggy_settings').delete().eq('owner_id', user.id);
      if (error) throw new PublicError(503, 'Não foi possível remover a conexão.');
      return reply(res, 200, { disconnected: true });
    }
    const input = await readBody(req, 8000);
    const { data: allowed, error: quotaError } = await db.rpc('consume_pluggy_quota');
    if (quotaError)
      throw new PublicError(503, 'Não foi possível validar o limite de sincronização.');
    if (!allowed)
      throw new PublicError(429, 'Limite de consultas atingido. Tente novamente em uma hora.');
    if (req.method === 'PUT') {
      const parsed = credentialsSchema.safeParse(input);
      if (!parsed.success)
        throw new PublicError(
          400,
          'Informe Client ID, Client Secret no primeiro cadastro e de 1 a 5 itemIds válidos.',
        );
      const { clientId, clientSecret, itemIds } = parsed.data;
      if (!pluggyStorageReady())
        throw new PublicError(
          503,
          'Habilite o armazenamento protegido de credenciais no servidor.',
        );
      if (!clientSecret && (!settings || settings.client_id !== clientId))
        throw new PublicError(400, 'Informe o Client Secret para esta aplicação.');
      const secret = clientSecret || decryptPluggy(settings.encrypted_secret, user.id);
      const client = await PluggyClient.connect(clientId, secret);
      for (const itemId of itemIds) await client.item(itemId);
      const { error: saveError } = await db.from('user_pluggy_settings').upsert({
        owner_id: user.id,
        client_id: clientId,
        encrypted_secret: encryptPluggy(secret, user.id),
        item_ids: itemIds,
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw new PublicError(503, 'Não foi possível salvar a conexão Pluggy.');
      return reply(res, 200, { saved: true });
    }
    const action = z
      .discriminatedUnion('action', [
        z.object({ action: z.literal('discover') }),
        z.object({ action: z.literal('sync'), accountId: z.string().uuid() }),
      ])
      .safeParse(input);
    if (!action.success) throw new PublicError(400, 'Escolha uma conta e uma operação válida.');
    if (!settings) throw new PublicError(400, 'Configure sua conexão Pluggy primeiro.');
    const startedAt = new Date().toISOString();
    const client = await PluggyClient.connect(
      settings.client_id,
      decryptPluggy(settings.encrypted_secret, user.id),
    );
    if (action.data.action === 'discover') {
      const groups = await Promise.all(
        (settings.item_ids as string[]).map((id) => client.accounts(id)),
      );
      const accounts = groups.flat();
      if (!accounts.length)
        throw new PublicError(
          409,
          'Nenhuma conta disponível. Vincule cada banco ao conector MeuPluggy na aplicação e confira o consentimento e os itemIds.',
        );
      const { error: saveError } = await db.from('pluggy_accounts').upsert(
        accounts.map((a) => ({ owner_id: user.id, id: a.id, payload: a })),
        { onConflict: 'owner_id,id' },
      );
      if (saveError) throw new PublicError(503, 'Não foi possível salvar as contas encontradas.');
      return reply(res, 200, { discovered: accounts.length });
    }
    const accountId = action.data.accountId;
    const { data: saved, error: accountError } = await db
      .from('pluggy_accounts')
      .select('payload')
      .eq('owner_id', user.id)
      .eq('id', accountId)
      .maybeSingle();
    if (accountError || !saved || !settings.item_ids.includes(saved.payload.itemId))
      throw new PublicError(404, 'Conta não vinculada à sua conexão. Atualize a lista de contas.');
    const accounts = await client.accounts(saved.payload.itemId);
    const account = accounts.find((a) => a.id === accountId);
    if (!account)
      throw new PublicError(
        409,
        'Esta conta não está disponível no Pluggy. Seus registros foram preservados.',
      );
    const dateFrom = new Date();
    dateFrom.setUTCFullYear(dateFrom.getUTCFullYear() - 1);
    const from = dateFrom.toISOString().slice(0, 10);
    const entries = await client.transactions(account, user.id, startedAt, from);
    if (!entries.length)
      throw new PublicError(
        409,
        'O Pluggy retornou o histórico vazio. Por segurança, os lançamentos existentes foram preservados. Confira o consentimento no Meu Pluggy.',
      );
    const { data: result, error: syncError } = await db.rpc('sync_pluggy_account', {
      p_account: account,
      p_entries: entries,
      p_date_from: from,
      p_started_at: startedAt,
      p_config_version: settings.updated_at,
    });
    if (syncError)
      throw new PublicError(
        409,
        'Não foi possível concluir a sincronização. A conexão pode ter mudado; atualize e tente novamente. Seus registros foram preservados.',
      );
    return reply(res, 200, { imported: entries.length, removed: result?.removed || 0 });
  } catch (error) {
    if (error instanceof PublicError) return reply(res, error.status, { error: error.message });
    // Never log provider payloads, credentials, balances or transaction descriptions.
    console.error('pluggy_failed', { name: error instanceof Error ? error.name : 'UnknownError' });
    return reply(res, 502, {
      error:
        'Não foi possível processar os dados do Pluggy. Nenhum histórico parcial foi importado.',
    });
  }
}
