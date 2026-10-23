import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw, ShieldCheck, ExternalLink, CreditCard } from 'lucide-react';
import type { PluggyState } from '../lib/pluggy';
import { currency, dateLabel } from '../lib/workspace';
import { pluggyRequest } from '../services/pluggyClient';
import { Pill } from './WorkspaceUI';

export function BankConnectionPanel({
  demo,
  onRefresh,
}: {
  demo: boolean;
  onRefresh: () => Promise<void>;
}) {
  const [state, setState] = useState<PluggyState | null>(null);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [itemIds, setItemIds] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = async () => {
    const next = await pluggyRequest<PluggyState>();
    setState(next);
    setClientId(next.clientId);
    setItemIds(next.itemIds.join('\n'));
    return next;
  };
  useEffect(() => {
    if (demo) return;
    const controller = new AbortController();
    pluggyRequest<PluggyState>('GET', undefined, controller.signal)
      .then((next) => {
        setState(next);
        setClientId(next.clientId);
        setItemIds(next.itemIds.join('\n'));
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [demo]);
  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void run('save', async () => {
      await pluggyRequest('PUT', {
        clientId,
        ...(secret.trim() ? { clientSecret: secret.trim() } : {}),
        itemIds: itemIds.split(/[\s,;]+/).filter(Boolean),
      });
      setSecret('');
      await load();
      setEditing(false);
      setMessage(
        'Conexão validada e salva. Use “Buscar contas” para listar seus bancos e cartões.',
      );
    });
  };
  return (
    <section className="panel bank-connection-panel" aria-label="Conexão bancária Pluggy">
      <div className="section-heading">
        <h2>
          <Building2 size={18} /> Bancos e cartões
        </h2>
        <Pill tone={state?.configured ? 'green' : 'muted'}>
          {demo ? 'Demonstração' : state?.configured ? 'Pluggy conectado' : 'Meu Pluggy'}
        </Pill>
      </div>
      <p className="muted">
        Importe suas movimentações e vincule cada gasto ao casamento, à casa ou a outro projeto.
      </p>
      <details className="pluggy-guide" open={!state?.configured}>
        <summary>Como conectar minhas contas</summary>
        <ol>
          <li>
            Conecte e autorize seus bancos no{' '}
            <a href="https://meu.pluggy.ai" target="_blank" rel="noreferrer">
              Meu Pluggy <ExternalLink size={12} />
            </a>
            .
          </li>
          <li>
            No{' '}
            <a href="https://dashboard.pluggy.ai" target="_blank" rel="noreferrer">
              Dashboard Pluggy
            </a>
            , crie uma aplicação e habilite o conector <strong>MeuPluggy</strong>.
          </li>
          <li>
            Em Aplicações → Demo → Conectar conta, escolha MeuPluggy e vincule cada banco. Copie o{' '}
            <strong>itemId</strong> de cada conexão.
          </li>
          <li>Informe abaixo o Client ID, o Client Secret e os itemIds dessa aplicação.</li>
        </ol>
        <p className="small muted">
          Uso pessoal: até 5 conexões. O Meu Pluggy atualiza os bancos a cada 24 horas.
          “Sincronizar” importa os dados disponíveis e não força uma atualização no banco.{' '}
          <a
            href="https://docs.pluggy.ai/pt/docs/guides/meu-pluggy-personal-use"
            target="_blank"
            rel="noreferrer"
          >
            Guia oficial
          </a>
        </p>
      </details>
      {demo && (
        <p className="info-message">
          Entre com sua conta do Vontta para salvar credenciais e importar dados reais. A
          demonstração não acessa bancos.
        </p>
      )}
      {loading && <p role="status">Carregando conexão…</p>}
      {!demo && !loading && (!state?.configured || editing) && (
        <form className="bank-credentials" onSubmit={save}>
          <label className="field">
            <span>Client ID do Pluggy</span>
            <input
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={!!busy || !state}
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>Client Secret {state?.configured ? '(vazio mantém o atual)' : ''}</span>
            <input
              type="password"
              autoComplete="new-password"
              required={!state?.configured}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={!!busy || !state}
            />
          </label>
          <label className="field full">
            <span>itemIds das conexões · um por linha</span>
            <textarea
              rows={3}
              required
              value={itemIds}
              onChange={(e) => setItemIds(e.target.value)}
              disabled={!!busy || !state}
              placeholder="Cole os IDs copiados de Itens Conectados no Dashboard"
            />
          </label>
          <p className="small muted full">
            <ShieldCheck size={14} /> Credenciais cifradas no servidor, vinculadas à sua conta. O
            Client Secret não é devolvido à interface nem incluído no backup.
          </p>
          {state && !state.storageReady && (
            <p className="error-message full">
              O armazenamento protegido precisa ser habilitado no servidor.
            </p>
          )}
          <div className="bank-actions full">
            <button className="button primary" disabled={!!busy || !state?.storageReady}>
              {busy === 'save' ? 'Validando…' : 'Validar e salvar conexão'}
            </button>
            {editing && (
              <button
                type="button"
                className="text-button"
                disabled={!!busy}
                onClick={() => {
                  setEditing(false);
                  setSecret('');
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {!demo && state?.configured && (
        <div className="bank-actions">
          <button
            className="button secondary"
            disabled={!!busy}
            onClick={() =>
              void run('discover', async () => {
                const result = await pluggyRequest<{ discovered: number }>('POST', {
                  action: 'discover',
                });
                await load();
                setMessage(
                  `${result.discovered} conta(s) encontrada(s). Sincronize cada conta para importar o histórico.`,
                );
              })
            }
          >
            <RefreshCw size={15} className={busy === 'discover' ? 'spin' : ''} /> Buscar contas
          </button>
          <button className="text-button" disabled={!!busy} onClick={() => setEditing(!editing)}>
            Editar conexão
          </button>
          <button
            className="text-button negative"
            disabled={!!busy}
            onClick={() => {
              if (
                !confirm(
                  'Remover as credenciais do Pluggy do Vontta? O histórico importado será mantido. Para revogar o acesso aos bancos, use o Meu Pluggy.',
                )
              )
                return;
              void run('disconnect', async () => {
                await pluggyRequest('DELETE');
                setSecret('');
                await load();
                setMessage('Conexão removida. O histórico importado foi mantido.');
              });
            }}
          >
            Desconectar
          </button>
        </div>
      )}
      {!!state?.accounts.length && (
        <div className="bank-accounts">
          {state.accounts.map((account) => (
            <article className="bank-account" key={account.id}>
              <div className="section-heading">
                <h3>
                  {account.type === 'CREDIT' ? <CreditCard size={18} /> : <Building2 size={18} />}{' '}
                  {account.name}
                </h3>
                <Pill>{account.type === 'CREDIT' ? 'Cartão' : 'Conta'}</Pill>
              </div>
              <p className="small muted">
                {account.institution}
                {account.number ? ` · final ${account.number}` : ''}
              </p>
              <small className="muted">
                {account.type === 'CREDIT'
                  ? 'Fatura aberta informada pelo banco'
                  : 'Saldo informado pelo banco'}
              </small>
              <strong className="bank-balance">
                {account.currencyCode === 'BRL'
                  ? currency(account.balance)
                  : `${account.balance.toFixed(2)} ${account.currencyCode}`}
              </strong>
              {account.type === 'CREDIT' && (
                <div className="bank-credit-details">
                  {account.creditLimit != null && (
                    <span>Limite {currency(account.creditLimit)}</span>
                  )}
                  {account.availableCreditLimit != null && (
                    <span>Disponível {currency(account.availableCreditLimit)}</span>
                  )}
                  {account.balanceCloseDate && (
                    <span>Fecha {dateLabel(account.balanceCloseDate.slice(0, 10))}</span>
                  )}
                  {account.balanceDueDate && (
                    <span>Vence {dateLabel(account.balanceDueDate.slice(0, 10))}</span>
                  )}
                </div>
              )}
              <p className="small muted">
                {account.syncedAt
                  ? `Importado em ${new Date(account.syncedAt).toLocaleString('pt-BR')}`
                  : 'Histórico ainda não importado'}
              </p>
              <button
                className="button secondary"
                disabled={!!busy || account.currencyCode !== 'BRL'}
                onClick={() =>
                  void run(account.id, async () => {
                    const result = await pluggyRequest<{ imported: number; removed: number }>(
                      'POST',
                      { action: 'sync', accountId: account.id },
                    );
                    await onRefresh();
                    await load();
                    setMessage(
                      `${result.imported} lançamento(s) sincronizado(s) em ${account.name}${result.removed ? `; ${result.removed} removido(s) pelo banco` : ''}. Revise categorias, pagamentos de fatura e transferências e vincule os gastos aos projetos.`,
                    );
                  })
                }
              >
                <RefreshCw size={15} className={busy === account.id ? 'spin' : ''} />
                {busy === account.id ? 'Sincronizando…' : 'Sincronizar histórico'}
              </button>
            </article>
          ))}
        </div>
      )}
      {state?.configured && (
        <p className="small muted">
          A importação usa o histórico disponível dos últimos 12 meses e parcelas futuras. Compras
          no cartão não são marcadas como pagas automaticamente. Revise transferências e pagamentos
          de fatura para evitar contagem dupla; use “Excluir dos totais” no lançamento.
        </p>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}{' '}
          {!state && !loading && !demo && (
            <button
              className="text-button"
              disabled={!!busy}
              onClick={() =>
                void run('reload', async () => {
                  await load();
                })
              }
            >
              Tentar novamente
            </button>
          )}
        </p>
      )}
    </section>
  );
}
