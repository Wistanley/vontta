import React, { useEffect, useRef, useState, useId } from 'react';
import { X, Plus, Trash2, Sparkles, Loader2, Check, Play, Pause, Minus } from 'lucide-react';
import {
  Entry,
  WorkTask,
  Content,
  WorkProject,
  Client,
  Transaction,
  Preferences,
  contentStages,
  canSetProjectParent,
  projectLabel,
} from '../lib/workspace';

export const IconButton = ({
  label,
  onClick,
  children,
  className = '',
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) => (
  <button
    type="button"
    className={`icon-button ${className}`}
    aria-label={label}
    title={label}
    onClick={onClick}
  >
    {children}
  </button>
);
export const Empty = ({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <div className="empty-state">
    <div className="empty-symbol">✦</div>
    <h3>{title}</h3>
    <p>{description}</p>
    {action}
  </div>
);
export const Pill = ({
  children,
  tone = 'muted',
}: {
  children: React.ReactNode;
  tone?: string;
}) => <span className={`pill ${tone}`}>{children}</span>;
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`workspace-dialog ${wide ? 'wide' : ''}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">SEU ESPAÇO, ORGANIZADO</span>
            <h2 id={titleId}>{title}</h2>
          </div>
          <IconButton label="Fechar" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        {children}
      </div>
    </dialog>
  );
}
function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  const id = useId();
  return (
    <div className={`field ${full ? 'full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && ['input', 'textarea', 'select'].includes(String(child.type))
          ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </div>
  );
}

export function EntryEditor({
  initial,
  entries,
  onSave,
  onDelete,
  onClose,
  onAI,
}: {
  initial: Entry;
  entries: Entry[];
  onSave: (e: Entry) => Promise<void>;
  onDelete: (e: Entry) => Promise<void>;
  onClose: () => void;
  onAI: (action: string, content?: Content) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (updates: Record<string, unknown>) =>
    setDraft((d) => ({ ...d, ...updates }) as Entry);
  const titles = {
    task: 'atividade',
    content: 'conteúdo',
    project: draft.kind === 'project' && draft.parentProjectId ? 'subprojeto' : 'projeto',
    client: 'cliente',
    transaction: 'lançamento',
    preferences: 'preferências',
  };
  const projects = entries.filter((e): e is WorkProject => e.kind === 'project');
  const clients = entries.filter((e): e is Client => e.kind === 'client');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSave({ ...draft, title: draft.title.trim() });
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!confirm(`Excluir este ${titles[draft.kind]}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      await onDelete(draft);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const projectSelect = (id: string) => (
    <select value={id} onChange={(e) => set({ projectId: e.target.value })}>
      <option value="">Sem projeto</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {projectLabel(p, projects)}
        </option>
      ))}
    </select>
  );
  return (
    <Modal
      title={`${entries.some((e) => e.id === draft.id) ? 'Editar' : 'Novo'} ${titles[draft.kind]}`}
      onClose={onClose}
      wide={draft.kind === 'content' || draft.kind === 'project'}
    >
      <form onSubmit={submit}>
        <div className="form-grid">
          <Field label={draft.kind === 'client' ? 'Nome do contato' : 'Título'} full>
            <input
              autoFocus
              required
              maxLength={180}
              value={draft.title}
              disabled={draft.kind === 'transaction' && !!draft.bank}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={
                draft.kind === 'content'
                  ? 'Qual problema do seu cliente você vai resolver?'
                  : 'Dê um nome fácil de encontrar'
              }
            />
          </Field>
          {draft.kind === 'task' && (
            <>
              <Field label="Data">
                <input
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </Field>
              <Field label="Horário (opcional)">
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => set({ time: e.target.value })}
                />
              </Field>
              <Field label="Duração (minutos)">
                <input
                  type="number"
                  min="0"
                  max="1440"
                  required
                  value={draft.duration}
                  onChange={(e) => set({ duration: Number(e.target.value) })}
                />
              </Field>
              <Field label="Prioridade">
                <select value={draft.priority} onChange={(e) => set({ priority: e.target.value })}>
                  {['Baixa', 'Média', 'Alta'].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Projeto" full>
                {projectSelect(draft.projectId)}
              </Field>
              <Field label="Detalhes e roteiro da atividade" full>
                <textarea
                  rows={12}
                  maxLength={30000}
                  value={draft.notes || ''}
                  placeholder="Objetivo, roteiro, checklist e referências para executar esta atividade."
                  onChange={(e) => set({ notes: e.target.value })}
                />
              </Field>
              <p className="small muted full">
                Deixe o horário vazio e a duração em 0 quando ainda estiverem a definir.
              </p>
              <label className="check-field full">
                <input
                  type="checkbox"
                  checked={draft.done}
                  onChange={(e) => set({ done: e.target.checked })}
                />
                Atividade concluída
              </label>
            </>
          )}
          {draft.kind === 'client' && (
            <>
              <Field label="Empresa" full>
                <input value={draft.company} onChange={(e) => set({ company: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set({ email: e.target.value })}
                />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                />
              </Field>
              <Field label="Contexto e observações" full>
                <textarea
                  rows={5}
                  value={draft.notes}
                  onChange={(e) => set({ notes: e.target.value })}
                  placeholder="Necessidades, decisões, próximo contato…"
                />
              </Field>
            </>
          )}
          {draft.kind === 'project' && (
            <>
              <Field label="Tipo de projeto" full>
                <select
                  value={draft.projectType || 'work'}
                  onChange={(e) =>
                    set({
                      projectType: e.target.value,
                      ...(e.target.value === 'personal' ? { clientId: '' } : {}),
                    })
                  }
                >
                  <option value="work">Profissional</option>
                  <option value="personal">Pessoal · casamento, casa, viagem…</option>
                </select>
              </Field>
              <Field label="Projeto pai" full>
                <select
                  value={draft.parentProjectId || ''}
                  onChange={(e) => set({ parentProjectId: e.target.value })}
                >
                  <option value="">Projeto principal (sem projeto pai)</option>
                  {projects
                    .filter((p) => canSetProjectParent(draft.id, p.id, projects))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {projectLabel(p, projects)}
                      </option>
                    ))}
                </select>
              </Field>
              {draft.projectType !== 'personal' && (
                <Field label="Cliente">
                  <select
                    value={draft.clientId}
                    onChange={(e) => set({ clientId: e.target.value })}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company || c.title}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                label={draft.projectType === 'personal' ? 'Data prevista' : 'Prazo de entrega'}
              >
                <input
                  type="date"
                  value={draft.deadline}
                  onChange={(e) => set({ deadline: e.target.value })}
                />
              </Field>
              <Field label="Situação">
                <select value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                  {['Em proposta', 'Em andamento', 'Pausado', 'Concluído'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field
                label={
                  draft.projectType === 'personal'
                    ? 'Orçamento de gastos (R$)'
                    : 'Valor do projeto (R$)'
                }
              >
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={draft.budget}
                  onChange={(e) => set({ budget: Number(e.target.value) })}
                />
              </Field>
              <Field label="Escopo e objetivo" full>
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => set({ description: e.target.value })}
                />
              </Field>
              <div className="full stages-editor">
                <div className="section-heading">
                  <h3>Etapas do projeto</h3>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() =>
                      set({
                        stages: [
                          ...draft.stages,
                          { id: crypto.randomUUID(), title: '', done: false, date: '' },
                        ],
                      })
                    }
                  >
                    <Plus size={15} />
                    Etapa
                  </button>
                </div>
                {draft.stages.map((stage) => (
                  <div className="stage-edit" key={stage.id}>
                    <input
                      aria-label={`Concluir ${stage.title}`}
                      type="checkbox"
                      checked={stage.done}
                      onChange={(e) =>
                        set({
                          stages: draft.stages.map((s) =>
                            s.id === stage.id ? { ...s, done: e.target.checked } : s,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label="Nome da etapa"
                      required
                      value={stage.title}
                      placeholder="Nome da etapa"
                      onChange={(e) =>
                        set({
                          stages: draft.stages.map((s) =>
                            s.id === stage.id ? { ...s, title: e.target.value } : s,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label="Prazo da etapa"
                      type="date"
                      value={stage.date}
                      onChange={(e) =>
                        set({
                          stages: draft.stages.map((s) =>
                            s.id === stage.id ? { ...s, date: e.target.value } : s,
                          ),
                        })
                      }
                    />
                    <IconButton
                      label="Remover etapa"
                      onClick={() => set({ stages: draft.stages.filter((s) => s.id !== stage.id) })}
                    >
                      <X size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
              <Field label="Documentação, links e critérios de aceite" full>
                <textarea
                  rows={7}
                  value={draft.documentation}
                  onChange={(e) => set({ documentation: e.target.value })}
                  placeholder="Briefing, decisões, links do Figma/GitHub, requisitos e critérios de entrega…"
                />
              </Field>
            </>
          )}
          {draft.kind === 'content' && (
            <>
              <Field label="Formato">
                <select value={draft.format} onChange={(e) => set({ format: e.target.value })}>
                  {['Reels', 'Carrossel', 'Stories'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Etapa">
                <select value={draft.status} onChange={(e) => set({ status: e.target.value })}>
                  {contentStages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Pilar de conteúdo">
                <select value={draft.pillar} onChange={(e) => set({ pillar: e.target.value })}>
                  {[
                    'IA nos negócios',
                    'Sistemas sob medida',
                    'Sites que vendem',
                    'Aplicativos',
                    'Bastidores',
                    'Autoridade e cases',
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Data de publicação">
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </Field>
              <Field label="Gancho · primeiros 3 segundos" full>
                <textarea
                  rows={2}
                  value={draft.hook}
                  onChange={(e) => set({ hook: e.target.value })}
                  placeholder="Comece com uma dor que o empresário reconhece."
                />
              </Field>
              <Field label="Roteiro / slides" full>
                <textarea
                  rows={9}
                  value={draft.script}
                  onChange={(e) => set({ script: e.target.value })}
                  placeholder="Gancho → problema → exemplo → solução → chamada para ação"
                />
              </Field>
              <Field label="Chamada para ação" full>
                <input value={draft.cta} onChange={(e) => set({ cta: e.target.value })} />
              </Field>
              <Field label="Legenda" full>
                <textarea
                  rows={4}
                  value={draft.caption}
                  onChange={(e) => set({ caption: e.target.value })}
                />
              </Field>
              <div className="recording-checklist full">
                <h3>Pronto para gravar?</h3>
                {[
                  'Uma ideia central',
                  'Gancho ensaiado',
                  'Luz e áudio conferidos',
                  'Chamada para ação definida',
                ].map((label) => (
                  <label key={label} className="check-field">
                    <input
                      type="checkbox"
                      checked={draft.checklist.includes(label)}
                      onChange={(e) =>
                        set({
                          checklist: e.target.checked
                            ? [...draft.checklist, label]
                            : draft.checklist.filter((s) => s !== label),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="button secondary full"
                onClick={() => onAI('script', draft)}
              >
                <Sparkles size={16} />
                Criar roteiro com IA a partir deste rascunho
              </button>
            </>
          )}
          {draft.kind === 'transaction' && (
            <>
              <Field label="Tipo">
                <select
                  disabled={!!draft.bank}
                  value={draft.type}
                  onChange={(e) => set({ type: e.target.value })}
                >
                  <option value="income">Receita</option>
                  <option value="expense">Despesa</option>
                </select>
              </Field>
              <Field label="Valor (R$)">
                <input
                  disabled={!!draft.bank}
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={draft.amount || ''}
                  onChange={(e) => set({ amount: Number(e.target.value) })}
                />
              </Field>
              <Field label="Vencimento">
                <input
                  disabled={!!draft.bank}
                  type="date"
                  required
                  value={draft.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </Field>
              <Field label="Categoria">
                <input
                  required
                  list="categories"
                  value={draft.category}
                  onChange={(e) => set({ category: e.target.value })}
                />
                <datalist id="categories">
                  {[
                    'Projetos',
                    'Consultoria',
                    'Software',
                    'Infraestrutura',
                    'Marketing',
                    'Pessoal',
                    'Casamento',
                    'Construção',
                    'Fornecedores',
                    'Materiais',
                    'Impostos',
                    'Outros',
                  ].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Field>
              <Field label="Projeto">{projectSelect(draft.projectId)}</Field>
              <Field label="Recorrência">
                <select
                  disabled={!!draft.bank}
                  value={draft.recurrence}
                  onChange={(e) => set({ recurrence: e.target.value })}
                >
                  <option value="none">Não repetir</option>
                  <option value="monthly">Mensal · gerar próximo mês</option>
                </select>
              </Field>
              <label className="check-field full">
                <input
                  type="checkbox"
                  checked={draft.paid}
                  disabled={!!draft.bank && draft.bank.accountType !== 'CREDIT'}
                  onChange={(e) => set({ paid: e.target.checked })}
                />
                {draft.type === 'income' ? 'Já foi recebido' : 'Já foi pago'}
              </label>
              <label className="check-field full">
                <input
                  type="checkbox"
                  checked={!!draft.excludedFromTotals}
                  onChange={(e) => set({ excludedFromTotals: e.target.checked })}
                />
                Excluir dos totais (transferência ou pagamento de fatura já contabilizado)
              </label>
              {draft.bank && (
                <p className="full muted small">
                  Importado de {draft.bank.accountName} ·{' '}
                  {draft.bank.status === 'POSTED' ? 'Efetivado no banco' : 'Pendente no banco'}.
                  Valores e datas são atualizados pela sincronização. Categoria, projeto e exclusão
                  dos totais são preservados. Compras no cartão precisam de confirmação de
                  pagamento.
                </p>
              )}
            </>
          )}
          {draft.kind === 'preferences' && (
            <>
              <Field label="Público que você quer atrair" full>
                <textarea
                  required
                  rows={3}
                  value={draft.audience}
                  onChange={(e) => set({ audience: e.target.value })}
                />
              </Field>
              <Field label="Serviços que você oferece" full>
                <textarea
                  required
                  rows={3}
                  value={draft.services}
                  onChange={(e) => set({ services: e.target.value })}
                />
              </Field>
              <Field label="Seu tom de voz" full>
                <textarea
                  rows={2}
                  value={draft.voice}
                  onChange={(e) => set({ voice: e.target.value })}
                />
              </Field>
              <Field label="Meta de publicações por semana">
                <input
                  type="number"
                  required
                  min="1"
                  max="21"
                  value={draft.goal}
                  onChange={(e) => set({ goal: Number(e.target.value) })}
                />
              </Field>
            </>
          )}
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {entries.some((e) => e.id === draft.id) &&
            draft.kind !== 'preferences' &&
            !(draft.kind === 'transaction' && draft.bank) && (
              <button type="button" className="text-button danger" disabled={busy} onClick={remove}>
                <Trash2 size={16} />
                Excluir
              </button>
            )}
          <div className="action-spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />}Salvar{' '}
            {titles[draft.kind]}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function RecordingMode({
  content,
  onClose,
  onRecorded,
}: {
  content: Content;
  onClose: () => void;
  onRecorded: () => Promise<void>;
}) {
  const [playing, setPlaying] = useState(false);
  const [font, setFont] = useState(30);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let last = 0;
    const scroll = (time: number) => {
      if (last && ref.current) ref.current.scrollTop += (time - last) * speed * 0.015;
      last = time;
      frame = requestAnimationFrame(scroll);
    };
    frame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
  return (
    <Modal title="Uma ideia. Uma conversa. Um vídeo." onClose={onClose} wide>
      <p className="muted">
        Fale com um empresário, como você falaria em uma reunião. Não precisa sair perfeito.
      </p>
      <div className="teleprompter" ref={ref} style={{ fontSize: font }}>
        <p className="accent-text">{content.hook}</p>
        <p>{content.script || 'Adicione um roteiro para começar a ensaiar.'}</p>
        <p className="accent-text">{content.cta}</p>
      </div>
      <div className="record-controls">
        <IconButton label="Diminuir texto" onClick={() => setFont(Math.max(18, font - 2))}>
          <Minus size={18} />
        </IconButton>
        <span>{font}px</span>
        <IconButton label="Aumentar texto" onClick={() => setFont(Math.min(52, font + 2))}>
          <Plus size={18} />
        </IconButton>
        <label>
          Velocidade{' '}
          <input
            aria-label="Velocidade da rolagem"
            type="range"
            min="0.5"
            max="3"
            step="0.5"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          />
        </label>
        <button className="button secondary" onClick={() => setPlaying(!playing)}>
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pausar' : 'Ensaiar'}
        </button>
      </div>
      <p className="small muted">
        Teleprompter para apoiar sua gravação. Grave o vídeo com a câmera do seu celular.
      </p>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="button primary"
          onClick={async () => {
            try {
              await onRecorded();
              onClose();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Check size={16} />
          Já gravei · enviar para edição
        </button>
      </div>
    </Modal>
  );
}
