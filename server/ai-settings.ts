import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { PublicError } from './http.js';
export const providerSchema = z.enum(['openai', 'anthropic', 'google']);
export type Provider = z.infer<typeof providerSchema>;
export const providers: Provider[] = ['openai', 'anthropic', 'google'];
const storedSchema = z.object({
  model: z.string().min(1).max(150),
  encryptedKey: z.string().min(1).max(5000),
  workspaceId: z.string().trim().max(150).optional(),
});
export const settingsSchema = z.object({
  openai: storedSchema.optional(),
  anthropic: storedSchema.optional(),
  google: storedSchema.optional(),
});
export type StoredSettings = z.infer<typeof settingsSchema>;
function masterKey() {
  const value = process.env.AI_SETTINGS_ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value))
    throw new PublicError(
      503,
      'O armazenamento protegido de chaves precisa ser habilitado pelo administrador.',
    );
  return Buffer.from(value, 'hex');
}
export function storageReady() {
  try {
    masterKey();
    return true;
  } catch {
    return false;
  }
}
export function encryptKey(secret: string, owner: string, provider: Provider) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', masterKey(), iv);
  cipher.setAAD(Buffer.from(`vontta:${owner}:${provider}`));
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}
export function decryptKey(packet: string, owner: string, provider: Provider) {
  const [version, iv, tag, data] = packet.split('.');
  if (version !== 'v1' || !iv || !tag || !data)
    throw new PublicError(503, 'Cadastre novamente a chave deste provedor nas preferências.');
  try {
    const decipher = createDecipheriv('aes-256-gcm', masterKey(), Buffer.from(iv, 'base64'));
    decipher.setAAD(Buffer.from(`vontta:${owner}:${provider}`));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]).toString(
      'utf8',
    );
  } catch (error) {
    if (error instanceof PublicError) throw error;
    throw new PublicError(
      503,
      'Não foi possível abrir a chave salva. Cadastre-a novamente nas preferências.',
    );
  }
}
export async function loadSettings(db: SupabaseClient, owner: string) {
  const { data, error } = await db
    .from('user_ai_settings')
    .select('providers,default_provider')
    .eq('owner_id', owner)
    .maybeSingle();
  if (error)
    throw new PublicError(
      503,
      'Não foi possível carregar a configuração de IA. Confira a conexão e a migração de configurações.',
    );
  const parsed = settingsSchema.safeParse(data?.providers || {});
  if (!parsed.success)
    throw new PublicError(
      503,
      'A configuração de IA está inválida. Salve novamente suas preferências.',
    );
  return {
    settings: parsed.data,
    defaultProvider: providerSchema.safeParse(data?.default_provider).success
      ? (data.default_provider as Provider)
      : null,
  };
}
export function environmentConfig(provider: Provider) {
  const keyNames = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    google: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };
  return {
    key: process.env[keyNames[provider]],
    model:
      process.env[`AI_MODEL_${provider.toUpperCase()}`] ||
      (provider === (process.env.AI_PROVIDER || 'openai') ? process.env.AI_MODEL : undefined),
  };
}
export async function resolveAIConfig(
  db: SupabaseClient,
  owner: string,
  requested: 'auto' | Provider,
) {
  const { settings, defaultProvider } = await loadSettings(db, owner);
  const provider =
    requested === 'auto'
      ? defaultProvider || providerSchema.parse(process.env.AI_PROVIDER || 'openai')
      : requested;
  const stored = settings[provider];
  if (stored)
    return {
      provider,
      key: decryptKey(stored.encryptedKey, owner, provider),
      model: stored.model,
      ...(provider === 'anthropic' && stored.workspaceId
        ? { workspaceId: stored.workspaceId }
        : {}),
    };
  const env = environmentConfig(provider);
  if (!env.key || !env.model)
    throw new PublicError(
      503,
      'Configure a chave e o modelo de IA em Preferências → Conexão de IA.',
    );
  return {
    provider,
    key: env.key,
    model: env.model,
    ...(provider === 'anthropic' && process.env.ANTHROPIC_WORKSPACE_ID
      ? { workspaceId: process.env.ANTHROPIC_WORKSPACE_ID }
      : {}),
  };
}
