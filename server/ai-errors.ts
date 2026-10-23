import { APICallError, NoObjectGeneratedError, RetryError } from 'ai';
import type { Provider } from './ai-settings.js';

const names = { google: 'Google', openai: 'OpenAI', anthropic: 'Anthropic' };

// Return only our own messages: upstream errors can contain credentials or user context.
export function describeAIError(error: unknown, provider?: Provider) {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const name = provider ? names[provider] : 'O provedor de IA';
  const upstreamStatus = APICallError.isInstance(cause) ? cause.statusCode : undefined;
  const details = APICallError.isInstance(cause)
    ? `${cause.message} ${cause.responseBody || ''}`.toLowerCase()
    : '';
  const result = (status: number, code: string, message: string) => ({
    status,
    code,
    message,
    upstreamStatus,
  });
  if (
    upstreamStatus === 402 ||
    /insufficient_quota|credit balance|prepayment credits|billing_hard_limit/.test(details)
  )
    return result(
      402,
      'provider_billing',
      `${name} está sem créditos ou com a cobrança bloqueada. Confira o saldo e o faturamento no provedor ou escolha outra conexão de IA cadastrada.`,
    );
  if (provider === 'anthropic' && details.includes('anthropic-workspace-id'))
    return result(
      400,
      'provider_workspace_required',
      'Esta chave da Anthropic exige o ID do workspace. Informe-o em Preferências → Conexão de IA → Anthropic ou use uma chave vinculada a um workspace.',
    );
  if (upstreamStatus === 401)
    return result(
      400,
      'provider_key_invalid',
      `${name} recusou a chave de API. Atualize a chave em Preferências → Conexão de IA.`,
    );
  if (upstreamStatus === 403)
    return result(
      403,
      'provider_access_denied',
      `${name} negou acesso. Confira as permissões da chave, do projeto e do modelo no provedor.`,
    );
  if (
    upstreamStatus === 404 ||
    (upstreamStatus === 400 &&
      /model.*(not found|does not exist|not supported|invalid)/.test(details))
  )
    return result(
      400,
      'provider_model_unavailable',
      `O modelo escolhido não está disponível em ${name}. Confira o identificador e o acesso ao modelo em Preferências → Conexão de IA.`,
    );
  if (upstreamStatus === 429)
    return result(
      429,
      'provider_rate_limit',
      `${name} atingiu o limite de uso. Aguarde alguns instantes e confira as cotas do seu projeto no provedor.`,
    );
  if (cause instanceof Error && ['AbortError', 'TimeoutError'].includes(cause.name))
    return result(
      504,
      'provider_timeout',
      `${name} demorou para responder. Tente novamente ou selecione outro modelo.`,
    );
  if (NoObjectGeneratedError.isInstance(cause))
    return result(
      502,
      'provider_invalid_output',
      `${name} não retornou uma resposta completa no formato esperado. Tente novamente ou selecione outro modelo.`,
    );
  return result(
    502,
    'provider_request_failed',
    `Não foi possível concluir a geração com ${name}. Tente novamente ou confira a conexão em Preferências → Conexão de IA.`,
  );
}
