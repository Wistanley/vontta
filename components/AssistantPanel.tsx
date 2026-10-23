import React, { useState } from 'react';
import { Sparkles, Send, Loader2, ArrowRight, X, Plus, Check } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import {
  Content,
  Entry,
  Preferences,
  WorkTask,
  WorkProject,
  defaults,
  newEntry,
} from '../lib/workspace';
import { Modal, Pill } from './WorkspaceUI';

export interface AIRequest {
  action: string;
  content?: Content;
}
export interface AIResult {
  text: string;
  ideas?: { title: string; pillar: string; hook: string }[];
  script?: { hook: string; script: string; cta: string; caption: string };
  tasks?: { title: string; duration: number; priority: 'Alta' | 'Média' | 'Baixa' }[];
}
export function AssistantPanel({
  request,
  entries,
  demo,
  onClose,
  onSave,
}: {
  request: AIRequest;
  entries: Entry[];
  demo: boolean;
  onClose: () => void;
  onSave: (e: Entry) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState(
    request.action === 'script'
      ? `Crie um roteiro de até 60 segundos para: ${request.content?.title}`
      : request.action === 'plan'
        ? 'Me ajude a escolher as 3 prioridades e planejar um dia realista.'
        : 'Sugira 5 conteúdos para atrair empresários interessados em sistemas, sites, aplicativos ou implantação de IA.',
  );
  const [provider, setProvider] = useState('auto');
  const [result, setResult] = useState<AIResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setResult(null);
    setSaved([]);
    try {
      if (demo)
        throw new Error(
          'A IA usa uma sessão autenticada. Configure o Supabase e uma chave no servidor para gerar sugestões reais. Você pode explorar os exemplos no Estúdio.',
        );
      const { data } = await supabase.auth.getSession();
      const prefs = entries.find((e): e is Preferences => e.kind === 'preferences');
      const context =
        request.action === 'plan'
          ? {
              tasks: entries
                .filter((e) => e.kind === 'task' && !e.done)
                .slice(0, 100)
                .map((e) => {
                  const t = e as WorkTask;
                  return {
                    title: t.title,
                    date: t.date,
                    duration: t.duration,
                    priority: t.priority,
                  };
                }),
              projects: entries
                .filter((e): e is WorkProject => e.kind === 'project' && e.status !== 'Concluído')
                .slice(0, 50)
                .map((e) => ({
                  title: e.title,
                  deadline: e.deadline,
                  status: e.status,
                })),
            }
          : undefined;
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: request.action,
          prompt,
          provider,
          profile: prefs
            ? { audience: prefs.audience, services: prefs.services, voice: prefs.voice }
            : defaults,
          content: request.content
            ? {
                title: request.content.title,
                format: request.content.format,
                pillar: request.content.pillar,
                hook: request.content.hook,
                script: request.content.script,
              }
            : undefined,
          context,
        }),
        signal: AbortSignal.timeout(90000),
      });
      const body = await response.json().catch(() => {
        throw new Error('O servidor de IA não respondeu corretamente. Aguarde e tente novamente.');
      });
      if (!response.ok) throw new Error(body.error || 'Não foi possível gerar a resposta.');
      setResult(body);
    } catch (err) {
      setError(
        err instanceof Error && ['TimeoutError', 'AbortError'].includes(err.name)
          ? 'A geração demorou para responder. Tente novamente ou selecione outro modelo.'
          : (err as Error).message,
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async (key: string, entry: Entry) => {
    try {
      await onSave(entry);
      setSaved((prev) => [...prev, key]);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal title="Um próximo passo, com clareza." onClose={onClose} wide>
      <div className="assistant-intro">
        <div className="sparkle-mark">
          <Sparkles size={24} />
        </div>
        <div>
          <h3>Seu braço direito</h3>
          <p>Ideias B2B, roteiros graváveis e um dia que cabe na sua agenda.</p>
        </div>
        <Pill tone="green">Vontta AI</Pill>
      </div>
      <form onSubmit={run}>
        <label className="field">
          <span>O que vamos destravar?</span>
          <textarea
            autoFocus
            required
            rows={4}
            maxLength={4000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <div className="assistant-toolbar">
          <select
            aria-label="Provedor de IA"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="auto">Provedor padrão</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
          </select>
          <button disabled={busy} className="button primary">
            {busy ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}{' '}
            {busy ? 'Pensando com você…' : 'Gerar sugestões'}
          </button>
        </div>
      </form>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {result && (
        <div className="ai-result">
          <p className="ai-text">{result.text}</p>
          {result.ideas?.map((idea, i) => (
            <div className="suggestion" key={i}>
              <span className="eyebrow">{idea.pillar}</span>
              <h3>{idea.title}</h3>
              <p>{idea.hook}</p>
              <button
                disabled={saved.includes(`idea${i}`)}
                className="button secondary"
                onClick={() => save(`idea${i}`, { ...(newEntry('content') as Content), ...idea })}
              >
                {saved.includes(`idea${i}`) ? <Check size={15} /> : <Plus size={15} />}{' '}
                {saved.includes(`idea${i}`) ? 'Salvo no estúdio' : 'Salvar ideia'}
              </button>
            </div>
          ))}
          {result.script && (
            <div className="suggestion">
              <h3>Gancho</h3>
              <p>{result.script.hook}</p>
              <h3>Roteiro</h3>
              <p className="ai-text">{result.script.script}</p>
              <h3>Chamada para ação</h3>
              <p>{result.script.cta}</p>
              <h3>Legenda</h3>
              <p>{result.script.caption}</p>
              <button
                className="button primary"
                disabled={saved.includes('script')}
                onClick={() =>
                  save('script', {
                    ...(request.content || (newEntry('content') as Content)),
                    ...result.script!,
                    kind: 'content',
                    title: request.content?.title || prompt.slice(0, 120),
                    status: 'Roteiro',
                  })
                }
              >
                {saved.includes('script') ? <Check size={16} /> : <ArrowRight size={16} />}{' '}
                {saved.includes('script') ? 'Roteiro salvo' : 'Salvar roteiro no estúdio'}
              </button>
            </div>
          )}
          {result.tasks?.map((task, i) => (
            <div className="suggestion" key={i}>
              <h3>{task.title}</h3>
              <p>
                {task.duration} min · Prioridade {task.priority}
              </p>
              <button
                className="button secondary"
                disabled={saved.includes(`task${i}`)}
                onClick={() => save(`task${i}`, { ...(newEntry('task') as WorkTask), ...task })}
              >
                {saved.includes(`task${i}`) ? 'Adicionado' : 'Adicionar à agenda'}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="small muted privacy-note">
        Somente o contexto necessário desta ação é enviado ao provedor. Revise as sugestões antes de
        usar. Nada é publicado no Instagram automaticamente.
      </p>
    </Modal>
  );
}
