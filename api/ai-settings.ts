import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { authenticateRequest, readBody, reply, PublicError } from '../server/http.js';
import {
  providerSchema,
  providers,
  loadSettings,
  encryptKey,
  storageReady,
  environmentConfig,
} from '../server/ai-settings.js';
const updateSchema = z.object({
  provider: providerSchema,
  model: z.string().trim().min(1).max(150),
  apiKey: z.string().trim().min(10).max(2000).optional(),
  workspaceId: z
    .string()
    .trim()
    .max(150)
    .regex(/^[a-zA-Z0-9_-]*$/)
    .optional(),
});
export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  if (!['GET', 'PUT', 'DELETE'].includes(req.method || '')) {
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return reply(res, 405, { error: 'Método não permitido.' });
  }
  try {
    const { db, user } = await authenticateRequest(req);
    const { settings, defaultProvider } = await loadSettings(db, user.id);
    if (req.method === 'GET')
      return reply(res, 200, {
        storageReady: storageReady(),
        defaultProvider,
        providers: Object.fromEntries(
          providers.map((provider) => {
            const own = settings[provider];
            const env = environmentConfig(provider);
            return [
              provider,
              {
                configured: Boolean(own || (env.key && env.model)),
                personal: Boolean(own),
                model: own?.model || env.model || '',
                workspaceId: provider === 'anthropic' ? own?.workspaceId || '' : '',
              },
            ];
          }),
        ),
      });
    const input = await readBody(req, 8000);
    let nextDefault = defaultProvider;
    if (req.method === 'DELETE') {
      const parsed = z.object({ provider: providerSchema }).safeParse(input);
      if (!parsed.success) throw new PublicError(400, 'Escolha um provedor válido.');
      delete settings[parsed.data.provider];
      if (nextDefault === parsed.data.provider)
        nextDefault = providers.find((provider) => settings[provider]) || null;
    } else {
      if (!storageReady())
        throw new PublicError(
          503,
          'O armazenamento protegido de chaves precisa ser habilitado pelo administrador.',
        );
      const parsed = updateSchema.safeParse(input);
      if (!parsed.success)
        throw new PublicError(
          400,
          'Preencha o modelo e uma chave válida (quando estiver cadastrando uma nova conexão).',
        );
      const { provider, model, apiKey, workspaceId } = parsed.data;
      const encryptedKey = apiKey
        ? encryptKey(apiKey, user.id, provider)
        : settings[provider]?.encryptedKey;
      if (!encryptedKey)
        throw new PublicError(400, 'Informe uma chave de API para conectar este provedor.');
      settings[provider] = {
        model,
        encryptedKey,
        ...(provider === 'anthropic'
          ? { workspaceId: workspaceId ?? settings[provider]?.workspaceId }
          : {}),
      };
      nextDefault = provider;
    }
    const { error } = await db.from('user_ai_settings').upsert({
      owner_id: user.id,
      providers: settings,
      default_provider: nextDefault,
      updated_at: new Date().toISOString(),
    });
    if (error)
      throw new PublicError(503, 'Não foi possível salvar a configuração. Tente novamente.');
    return reply(res, 200, { saved: true });
  } catch (error) {
    if (error instanceof PublicError) return reply(res, error.status, { error: error.message });
    console.error('ai_settings_failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return reply(res, 500, { error: 'Não foi possível atualizar a conexão de IA.' });
  }
}
