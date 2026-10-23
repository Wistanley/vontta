import React, { useEffect, useState } from 'react';
import { Sparkles, KeyRound, ShieldCheck, Loader2, Check, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { Pill } from './WorkspaceUI';
type Provider = 'openai' | 'anthropic' | 'google';
const providerNames: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
};
const providers: Provider[] = ['openai', 'anthropic', 'google'];
interface Connection {
  configured: boolean;
  personal: boolean;
  model: string;
  workspaceId?: string;
}
interface Config {
  storageReady: boolean;
  defaultProvider: Provider | null;
  providers: Record<Provider, Connection>;
}
const blank: Config = {
  storageReady: false,
  defaultProvider: null,
  providers: {
    openai: { configured: false, personal: false, model: '' },
    anthropic: { configured: false, personal: false, model: '' },
    google: { configured: false, personal: false, model: '' },
  },
};
export function AISettingsPanel({ demo }: { demo: boolean }) {
  const [config, setConfig] = useState<Config>(blank);
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function request(method = 'GET', body?: unknown) {
    const { data } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-settings', {
      method,
      headers: {
        Authorization: `Bearer ${data.session?.access_token || ''}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível atualizar a configuração.');
    return result;
  }
  useEffect(() => {
    if (demo) return;
    let alive = true;
    request()
      .then((data: Config) => {
        if (alive) {
          setConfig(data);
          const selected = data.defaultProvider || 'openai';
          setProvider(selected);
          setModel(data.providers[selected].model);
          setWorkspaceId(data.providers[selected].workspaceId || '');
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [demo]);
  const choose = (next: Provider) => {
    setProvider(next);
    setModel(config.providers[next].model);
    setWorkspaceId(config.providers[next].workspaceId || '');
    setApiKey('');
    setMessage('');
    setError('');
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (demo) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('PUT', {
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
        workspaceId: provider === 'anthropic' ? workspaceId : undefined,
      });
      const next: Config = await request();
      setConfig(next);
      setApiKey('');
      setMessage(`${providerNames[provider]} salvo como padrão. Sua chave foi protegida.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !confirm(
        `Remover a chave pessoal de ${providerNames[provider]}? Você poderá cadastrá-la novamente.`,
      )
    )
      return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('DELETE', { provider });
      const next: Config = await request();
      setConfig(next);
      setModel(next.providers[provider].model);
      setWorkspaceId(next.providers[provider].workspaceId || '');
      setApiKey('');
      setMessage('Chave pessoal removida.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const selected = config.providers[provider];
  return (
    <section className="panel ai-settings-panel">
      <div className="section-heading">
        <h2>
          <Sparkles size={18} />
          Conexão de IA
        </h2>
        {config.defaultProvider && (
          <Pill tone="green">{providerNames[config.defaultProvider]} padrão</Pill>
        )}
      </div>
      <div className="settings-body">
        <p>
          Conecte os modelos que você usa para ideias, roteiros e planejamento. As configurações
          ficam vinculadas à sua conta.
        </p>
        {demo && (
          <div className="ai-settings-notice">
            Entre na sua conta para cadastrar suas chaves. A demonstração não armazena credenciais.
          </div>
        )}
        {loading ? (
          <p className="ai-settings-loading">
            <Loader2 className="spin" size={17} />
            Carregando conexões…
          </p>
        ) : (
          <form className="ai-settings-form" onSubmit={submit}>
            <div className="provider-options" role="group" aria-label="Escolha o provedor">
              {providers.map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={provider === value}
                  className={provider === value ? 'selected' : ''}
                  disabled={busy}
                  onClick={() => choose(value)}
                >
                  {providerNames[value]}
                  {config.providers[value].configured && <Check size={12} />}
                </button>
              ))}
            </div>
            <label className="field">
              <span>Modelo de {providerNames[provider]}</span>
              <input
                required
                maxLength={150}
                value={model}
                autoComplete="off"
                placeholder="Identificador do modelo na sua conta"
                onChange={(e) => setModel(e.target.value)}
                disabled={busy || demo}
              />
            </label>
            <label className="field">
              <span>
                <KeyRound size={12} />
                Chave de API{selected.personal && <Pill tone="green">Já cadastrada</Pill>}
              </span>
              <input
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                required={!selected.personal}
                minLength={10}
                maxLength={2000}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={busy || demo}
                placeholder={
                  selected.personal
                    ? 'Deixe vazio para manter a chave atual'
                    : 'Cole a chave do provedor'
                }
              />
            </label>
            {provider === 'anthropic' && (
              <label className="field">
                <span>ID do workspace da Anthropic (quando exigido pela chave)</span>
                <input
                  maxLength={150}
                  value={workspaceId}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ID do workspace no Console da Anthropic"
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  disabled={busy || demo}
                />
                <span className="small muted">
                  Chaves vinculadas à conta podem exigir este ID. Chaves de um workspace específico
                  podem deixar este campo vazio.
                </span>
              </label>
            )}
            <p className="small muted">
              Use o identificador de um modelo com suporte a saída estruturada, disponível no seu
              provedor. Ao salvar, esta conexão será o padrão da sua conta.
            </p>
            <div className="ai-key-protection">
              <ShieldCheck size={17} />
              <span>
                A chave é criptografada no servidor. Ela não aparece novamente na interface e não
                entra no backup do workspace.
              </span>
            </div>
            {!demo && !config.storageReady && !error && (
              <p className="error-message" role="alert">
                O armazenamento protegido precisa ser habilitado pelo administrador antes de
                cadastrar chaves.
              </p>
            )}
            <div className="ai-settings-actions">
              <button className="button primary" disabled={busy || demo || !config.storageReady}>
                {busy ? <Loader2 className="spin" size={15} /> : <Check size={15} />}Salvar e usar
                como padrão
              </button>
              {selected.personal && (
                <button
                  type="button"
                  className="text-button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  <Trash2 size={14} />
                  Remover chave
                </button>
              )}
            </div>
          </form>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="success-message" role="status">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}
