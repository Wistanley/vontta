import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Radar,
  Plus,
  RefreshCw,
  Upload,
  ExternalLink,
  Star,
  Play,
  FileText,
  Settings2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  ArrowRight,
  Film,
  Loader2,
} from 'lucide-react';
import type { PostProfile } from '../lib/post-creator';
import {
  modeLabels,
  radarDefaults,
  scoreContent,
  scriptMarkdown,
  type RadarContent,
  type RadarJob,
  type RadarScript,
  type RadarSettings,
  type RadarSource,
  type VideoAnalysis,
  type MetricSnapshot,
} from '../lib/radar';
import { radarRequest } from '../services/radarClient';
import './content-radar.css';

interface State {
  snapshots: MetricSnapshot[];
  sources: RadarSource[];
  contents: RadarContent[];
  jobs: RadarJob[];
  scripts: RadarScript[];
  reports: any[];
  usage: any[];
  events: any[];
  settings: RadarSettings;
  apifyConfigured: boolean;
  worker: any;
  ai: any;
  analyses: { content_id: string; mode: keyof typeof modeLabels }[];
}
const empty: State = {
  snapshots: [],
  sources: [],
  contents: [],
  jobs: [],
  scripts: [],
  reports: [],
  usage: [],
  events: [],
  settings: radarDefaults(),
  apifyConfigured: false,
  worker: null,
  ai: null,
  analyses: [],
};
const dates = (v: string | null) =>
  v
    ? new Date(v).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'Ainda não coletado';
const money = (v: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(v);
const number = (v: number | null) =>
  v === null ? 'Indisponível' : new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v);
const status: Record<string, string> = {
  queued: 'Na fila',
  running: 'Processando',
  waiting: 'Aguardando provedor',
  succeeded: 'Concluída',
  failed: 'Precisa de atenção',
  cancelled: 'Cancelada',
};
const kind: Record<string, string> = {
  collect: 'Coleta',
  analyze: 'Análise de vídeo',
  script: 'Roteiro',
  report: 'Relatório',
  trends: 'Classificação',
};
const tabs = [
  ['today', 'Hoje', Radar],
  ['sources', 'Referências', Users],
  ['library', 'Vídeos', Film],
  ['scripts', 'Roteiros', FileText],
  ['reports', 'Relatórios', Clock],
  ['settings', 'Conexões', Settings2],
] as const;
export default function ContentRadar({
  profiles,
  demo,
  onCarousel,
}: {
  profiles: PostProfile[];
  demo: boolean;
  onCarousel: () => void;
}) {
  const [state, setState] = useState<State>(empty);
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settings, setSettings] = useState<RadarSettings | null>(null);
  const [token, setToken] = useState('');
  const [igInput, setIgInput] = useState('');
  const [ttInput, setTtInput] = useState('');
  const [source, setSource] = useState<{
    id?: string;
    platform: 'instagram' | 'tiktok';
    username: string;
    name: string;
    tags: string;
    group: string;
    enabled: boolean;
  }>({ platform: 'instagram', username: '', name: '', tags: '', group: '', enabled: true });
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [rights, setRights] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');
  const [author, setAuthor] = useState('all');
  const [favorites, setFavorites] = useState(false);
  const [sort, setSort] = useState('score');
  const [detail, setDetail] = useState<any>(null);
  const [selectedScript, setSelectedScript] = useState<RadarScript | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [instruction, setInstruction] = useState('');
  const [part, setPart] = useState('all');
  const [duration, setDuration] = useState(45);
  const [profileId, setProfileId] = useState('');
  const modalOpen = !!(detail || selectedScript);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('.radar-dialog');
    const focusable = () => [
      ...(dialog?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary',
      ) || []),
    ];
    focusable()[0]?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetail(null);
        setSelectedScript(null);
      }
      if (e.key === 'Tab') {
        const all = focusable();
        const first = all[0],
          last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = before;
      previous?.focus();
    };
  }, [modalOpen]);
  const load = useCallback(async () => {
    if (demo) {
      setLoading(false);
      return;
    }
    const next = await radarRequest<State>();
    setState(next);
    setSettings((current) => current || next.settings);
    setProfileId((current) => current || next.settings.profileId || profiles[0]?.id || '');
    setIgInput((current) => current || JSON.stringify(next.settings.instagramInput, null, 2));
    setTtInput((current) => current || JSON.stringify(next.settings.tiktokInput, null, 2));
  }, [demo, profiles]);
  useEffect(() => {
    void load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    const timer = setInterval(() => {
      void load().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [load]);
  async function run(action: () => Promise<any>, message = 'Alteração salva.') {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await load();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function openDetail(id: string) {
    await run(async () => {
      setDetail(await radarRequest({ action: 'detail', id }));
    }, '');
  }
  const active = state.jobs.filter((j) => ['queued', 'running', 'waiting'].includes(j.status));
  const used = state.usage.reduce((sum, r) => sum + Number(r.actual_usd ?? r.reserved_usd), 0);
  const actual = state.usage
    .filter((r) => r.actual_usd !== null)
    .reduce((sum, r) => sum + Number(r.actual_usd), 0);
  const ranked = useMemo(
    () =>
      state.contents.map((c) => ({
        content: c,
        score: scoreContent(c, state.contents, state.snapshots),
      })),
    [state.contents, state.snapshots],
  );
  const visible = ranked
    .filter(
      ({ content: c }) =>
        (platform === 'all' || c.platform === platform) &&
        (author === 'all' || c.source_id === author) &&
        (!favorites || c.payload.favorite) &&
        `${c.title} ${c.caption} ${c.payload.author}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'score'
        ? (b.score.score || 0) - (a.score.score || 0)
        : sort === 'views'
          ? (b.content.payload.metrics.views || 0) - (a.content.payload.metrics.views || 0)
          : b.content.created_at.localeCompare(a.content.created_at),
    );
  const workerOnline = state.worker && Date.now() - Date.parse(state.worker.last_run) < 180000;
  const analysis = detail?.analyses?.[0]?.data as (VideoAnalysis & { evidence: any }) | undefined;
  async function upload(file: File) {
    await run(async () => {
      const start = await radarRequest({
        action: 'upload',
        name: file.name,
        size: file.size,
        mime: file.type || 'video/mp4',
        rights,
      });
      const result = await fetch(start.url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
        body: file,
      });
      if (!result.ok)
        throw new Error('O envio do arquivo falhou. Confira o tamanho e tente novamente.');
      await radarRequest({
        action: 'finalizeUpload',
        id: start.id,
        path: start.path,
        title: title || file.name,
        mime: file.type,
      });
      setTitle('');
    }, 'Vídeo enviado. A análise entrou na fila do servidor.');
  }
  function editScript(field: string, value: any) {
    setSelectedScript((s) => (s ? { ...s, data: { ...s.data, [field]: value } } : s));
  }
  function exportScript(s: RadarScript) {
    const href = URL.createObjectURL(
      new Blob([scriptMarkdown(s)], { type: 'text/markdown;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = href;
    a.download = `roteiro-${s.id}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  const profileSelect = (
    <label>
      Perfil de destino
      <select value={profileId} onChange={(e) => setProfileId(e.target.value)}>
        <option value="">Selecione um perfil</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.spec.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="radar-shell" aria-label="Radar de referências">
      <div className="radar-heading">
        <div>
          <span className="radar-kicker">REFERÊNCIAS QUE VIRAM IDEIAS SUAS</span>
          <h2>
            Radar de conteúdo <Radar size={23} />
          </h2>
          <p>Entenda o formato. Encontre seu ângulo. Grave com direção.</p>
        </div>
        <span className={`radar-pill ${workerOnline ? 'good' : ''}`}>
          <span className="radar-dot" />
          {workerOnline ? 'Servidor online' : 'Servidor sem sinal recente'}
        </span>
      </div>
      <nav className="radar-tabs" aria-label="Seções do Radar">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => setTab(id)}
            aria-current={tab === id ? 'page' : undefined}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
      {demo ? (
        <div className="radar-empty">
          <Radar />
          <h3>Seu Radar começa com referências reais</h3>
          <p>
            Entre na sua conta para cadastrar perfis e analisar seus vídeos. Nenhuma coleta ou
            geração é executada no modo de demonstração.
          </p>
        </div>
      ) : (
        <>
          {error && (
            <div className="radar-message error" role="alert">
              <AlertCircle size={18} />
              {error}
              <button aria-label="Fechar erro" onClick={() => setError('')}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="radar-message" role="status">
              <CheckCircle2 size={18} />
              {notice}
            </div>
          )}
          {loading ? (
            <p className="radar-loading">
              <Loader2 className="spin" size={18} /> Carregando seu Radar…
            </p>
          ) : (
            <>
              {tab === 'today' && (
                <>
                  <div className="radar-stats">
                    <article>
                      <span>REFERÊNCIAS ATIVAS</span>
                      <strong>{state.sources.filter((s) => s.enabled).length}</strong>
                      <small>{state.contents.length} publicações na biblioteca</small>
                    </article>
                    <article>
                      <span>NA FILA</span>
                      <strong>{active.length}</strong>
                      <small>Processamento na VPS, 24 horas</small>
                    </article>
                    <article>
                      <span>ROTEIROS</span>
                      <strong>{state.scripts.length}</strong>
                      <small>
                        {state.scripts.filter((s) => s.status === 'approved').length} aprovados para
                        gravar
                      </small>
                    </article>
                    <article>
                      <span>ORÇAMENTO ESTIMADO DO MÊS</span>
                      <strong>{money(used)}</strong>
                      <small>
                        de {money(state.settings.monthlyBudget)} · confirmado:{' '}
                        {state.usage.some((r) => r.actual_usd !== null)
                          ? money(actual)
                          : 'não informado'}
                      </small>
                    </article>
                  </div>
                  <div className="radar-grid">
                    <article className="radar-card">
                      <div className="radar-card-head">
                        <h3>Seu próximo conteúdo</h3>
                        <button className="button" onClick={() => setTab('library')}>
                          <Plus size={15} />
                          Adicionar vídeo
                        </button>
                      </div>
                      <p>
                        Envie um vídeo ou salve uma referência. A análise mostra o que foi observado
                        e o que ainda é hipótese; o roteiro adapta a estrutura à sua voz.
                      </p>
                      <div className="radar-steps">
                        <span>01 · Referência</span>
                        <ArrowRight size={14} />
                        <span>02 · Evidências</span>
                        <ArrowRight size={14} />
                        <span>03 · Roteiro original</span>
                      </div>
                      {(!state.apifyConfigured || !state.settings.analysisModel) && (
                        <button className="radar-link" onClick={() => setTab('settings')}>
                          Concluir as conexões <ArrowRight size={14} />
                        </button>
                      )}
                    </article>
                    <article className="radar-card">
                      <h3>Próxima coleta</h3>
                      <p>
                        {state.settings.collectionEnabled
                          ? `Diariamente às ${state.settings.collectionHour}, horário de Brasília.`
                          : 'A coleta automática está pausada. Você pode ativá-la em Conexões.'}
                      </p>
                      <p>
                        {state.settings.deepDailyLimit} análises por dia · até{' '}
                        {state.settings.maxDuration}s por vídeo
                      </p>
                      <button
                        className="button"
                        disabled={busy || !state.apifyConfigured}
                        onClick={() =>
                          run(
                            () => radarRequest({ action: 'collect', key: crypto.randomUUID() }),
                            'Coleta adicionada à fila.',
                          )
                        }
                      >
                        <RefreshCw size={15} />
                        Coletar agora
                      </button>
                    </article>
                  </div>
                  <article className="radar-card">
                    <div className="radar-card-head">
                      <h3>Atividade do servidor</h3>
                      <small>Último sinal: {dates(state.worker?.last_run)}</small>
                    </div>
                    {!state.jobs.length ? (
                      <p>Nenhuma tarefa ainda. Adicione um vídeo para começar.</p>
                    ) : (
                      state.jobs.slice(0, 12).map((j) => (
                        <div className="radar-job" key={j.id}>
                          <div>
                            <strong>{kind[j.kind]}</strong>
                            <small>
                              {dates(j.created_at)} · {status[j.status]}
                            </small>
                            {j.error && <p className="radar-error-text">{j.error}</p>}
                          </div>
                          {j.status === 'failed' ? (
                            <button
                              className="button"
                              disabled={busy}
                              onClick={() =>
                                run(
                                  () => radarRequest({ action: 'retry', id: j.id }),
                                  'Tarefa retomada na fila.',
                                )
                              }
                            >
                              Retomar
                            </button>
                          ) : ['queued', 'running', 'waiting'].includes(j.status) ? (
                            <Loader2 size={17} className="spin" />
                          ) : (
                            <CheckCircle2 size={17} />
                          )}
                        </div>
                      ))
                    )}
                  </article>
                </>
              )}
              {tab === 'sources' && (
                <div className="radar-grid">
                  <article className="radar-card">
                    <h3>{source.id ? 'Editar referência' : 'Nova referência'}</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void run(async () => {
                          await radarRequest({
                            action: 'source',
                            ...source,
                            tags: source.tags
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          });
                          setSource({
                            platform: 'instagram',
                            username: '',
                            name: '',
                            tags: '',
                            group: '',
                            enabled: true,
                          });
                        });
                      }}
                    >
                      <label>
                        Plataforma
                        <select
                          value={source.platform}
                          onChange={(e) =>
                            setSource({ ...source, platform: e.target.value as any })
                          }
                        >
                          <option value="instagram">Instagram</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      </label>
                      <label>
                        @ ou link do perfil
                        <input
                          required
                          value={source.username}
                          onChange={(e) => setSource({ ...source, username: e.target.value })}
                          placeholder="@referencia"
                        />
                      </label>
                      <label>
                        Nome de exibição
                        <input
                          value={source.name}
                          onChange={(e) => setSource({ ...source, name: e.target.value })}
                        />
                      </label>
                      <label>
                        Tags, separadas por vírgula
                        <input
                          value={source.tags}
                          onChange={(e) => setSource({ ...source, tags: e.target.value })}
                          placeholder="negócios, tecnologia"
                        />
                      </label>
                      <label>
                        Grupo
                        <input
                          value={source.group}
                          onChange={(e) => setSource({ ...source, group: e.target.value })}
                        />
                      </label>
                      <label className="radar-check">
                        <input
                          type="checkbox"
                          checked={source.enabled}
                          onChange={(e) => setSource({ ...source, enabled: e.target.checked })}
                        />
                        Monitoramento ativo
                      </label>
                      <button className="button primary" disabled={busy}>
                        Salvar referência
                      </button>
                    </form>
                  </article>
                  <div className="radar-stack">
                    {state.sources.length ? (
                      state.sources.map((s) => (
                        <article className="radar-card" key={s.id}>
                          <div className="radar-card-head">
                            <h3>@{s.username}</h3>
                            <span className="radar-pill">
                              {s.platform} · {s.enabled ? 'ativo' : 'pausado'}
                            </span>
                          </div>
                          <p>
                            {s.tags.join(' · ')} {s.group_name && `/ ${s.group_name}`}
                          </p>
                          <small>Última coleta: {dates(s.last_collected_at)}</small>
                          {s.last_error && <p className="radar-error-text">{s.last_error}</p>}
                          <div className="radar-actions">
                            <button
                              className="button"
                              onClick={() =>
                                setSource({ ...s, tags: s.tags.join(', '), group: s.group_name })
                              }
                            >
                              Editar
                            </button>
                            <button
                              className="button"
                              disabled={busy || !state.apifyConfigured || !s.enabled}
                              onClick={() =>
                                run(
                                  () =>
                                    radarRequest({
                                      action: 'collect',
                                      sourceId: s.id,
                                      key: crypto.randomUUID(),
                                    }),
                                  'Coleta adicionada à fila.',
                                )
                              }
                            >
                              Coletar
                            </button>
                            <a
                              href={
                                s.platform === 'instagram'
                                  ? `https://www.instagram.com/${s.username}/`
                                  : `https://www.tiktok.com/@${s.username}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="radar-link"
                            >
                              Abrir <ExternalLink size={13} />
                            </a>
                          </div>
                        </article>
                      ))
                    ) : (
                      <div className="radar-empty">Cadastre seu primeiro perfil de referência.</div>
                    )}
                  </div>
                </div>
              )}
              {tab === 'library' && (
                <>
                  <article className="radar-card">
                    <div className="radar-card-head">
                      <h3>Adicionar referência</h3>
                      <small>
                        Até {state.settings.maxFileMb} MB · {state.settings.maxDuration}s
                      </small>
                    </div>
                    <div className="radar-grid">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void run(async () => {
                            await radarRequest({ action: 'import', url, title, caption });
                            setUrl('');
                            setCaption('');
                          }, 'Referência salva. A análise de um link sem mídia usa apenas os metadados.');
                        }}
                      >
                        <label>
                          Título
                          <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Um título para encontrar depois"
                          />
                        </label>
                        <label>
                          Link completo do vídeo
                          <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.instagram.com/reel/…"
                          />
                        </label>
                        <label>
                          Legenda ou contexto
                          <textarea
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={2}
                          />
                        </label>
                        <button className="button" disabled={busy}>
                          <Plus size={15} />
                          Salvar link
                        </button>
                      </form>
                      <div className="radar-upload">
                        <Upload size={27} />
                        <h4>Vídeo no seu computador</h4>
                        <p>
                          Receba a transcrição e a leitura das imagens. O arquivo e os frames
                          expiram após {state.settings.retentionHours} horas; a análise e o roteiro
                          ficam salvos.
                        </p>
                        <label className="radar-check">
                          <input
                            type="checkbox"
                            checked={rights}
                            onChange={(e) => setRights(e.target.checked)}
                          />
                          Tenho autorização para enviar e analisar este material.
                        </label>
                        <input
                          ref={fileInput}
                          type="file"
                          hidden
                          accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) void upload(f);
                            e.target.value = '';
                          }}
                        />
                        <button
                          className="button primary"
                          disabled={busy || !rights}
                          onClick={() => fileInput.current?.click()}
                        >
                          {busy ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                          Enviar e analisar
                        </button>
                      </div>
                    </div>
                  </article>
                  <div className="radar-filters">
                    <input
                      aria-label="Buscar vídeos"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar tema, legenda ou autor…"
                    />
                    <select
                      aria-label="Filtrar plataforma"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                    >
                      <option value="all">Todas as plataformas</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="manual">Enviados por mim</option>
                    </select>
                    <select
                      aria-label="Filtrar autor"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                    >
                      <option value="all">Todos os autores</option>
                      {state.sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          @{s.username}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Ordenar vídeos"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="score">Maior oportunidade</option>
                      <option value="recent">Mais recentes</option>
                      <option value="views">Mais visualizações</option>
                    </select>
                    <button
                      className={`button ${favorites ? 'primary' : ''}`}
                      onClick={() => setFavorites(!favorites)}
                    >
                      <Star size={15} />
                      Favoritos
                    </button>
                  </div>
                  {!visible.length ? (
                    <div className="radar-empty">
                      <Film size={28} />
                      <h3>A biblioteca começa com uma referência</h3>
                      <p>Salve um link, envie um vídeo ou colete os perfis cadastrados.</p>
                    </div>
                  ) : (
                    <div className="radar-video-grid">
                      {visible.map(({ content: c, score }) => (
                        <article className="radar-card radar-video" key={c.id}>
                          <div className="radar-card-head">
                            <span className="radar-pill">
                              {c.payload.author ? `@${c.payload.author}` : 'Enviado por você'}
                            </span>
                            <button
                              aria-label={
                                c.payload.favorite ? 'Remover favorito' : 'Favoritar vídeo'
                              }
                              className="radar-icon"
                              onClick={() =>
                                run(
                                  () =>
                                    radarRequest({
                                      action: 'favorite',
                                      id: c.id,
                                      favorite: !c.payload.favorite,
                                    }),
                                  '',
                                )
                              }
                            >
                              <Star size={17} fill={c.payload.favorite ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                          <h3>{c.title}</h3>
                          <p>
                            {c.caption?.slice(0, 160) ||
                              'Arquivo disponível para análise multimodal.'}
                          </p>
                          <div className="radar-video-metrics">
                            <span>
                              <strong>{number(c.payload.metrics.views)}</strong> visualizações
                            </span>
                            <span>
                              <strong>
                                {score.ratio !== null ? `${score.ratio.toFixed(1)}×` : 'Sem base'}
                              </strong>{' '}
                              mediana do perfil
                            </span>
                          </div>
                          <small>
                            {state.analyses.find((a) => a.content_id === c.id)
                              ? modeLabels[state.analyses.find((a) => a.content_id === c.id)!.mode]
                              : 'Ainda não analisado'}
                            {score.breakout ? ' · Destaque' : ''}
                          </small>
                          <div className="radar-actions">
                            <button
                              className="button"
                              disabled={busy}
                              onClick={() => openDetail(c.id)}
                            >
                              Ver análise <ArrowRight size={14} />
                            </button>
                            {c.permalink && (
                              <a
                                className="radar-link"
                                href={c.permalink}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Original <ExternalLink size={13} />
                              </a>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tab === 'scripts' && (
                <>
                  {!state.scripts.length ? (
                    <div className="radar-empty">
                      <FileText size={28} />
                      <h3>Uma referência, um ângulo seu</h3>
                      <p>
                        Abra um vídeo, conclua a análise e gere o primeiro roteiro para seu perfil.
                      </p>
                      <button className="button primary" onClick={() => setTab('library')}>
                        Ir para vídeos
                      </button>
                    </div>
                  ) : (
                    <div className="radar-video-grid">
                      {state.scripts.map((s) => (
                        <article className="radar-card" key={s.id}>
                          <span className="radar-pill">
                            v{s.version} ·{' '}
                            {
                              {
                                idea: 'Ideia',
                                draft: 'Rascunho',
                                approved: 'Aprovado',
                                recorded: 'Gravado',
                                published: 'Publicado',
                              }[s.status]
                            }
                          </span>
                          <h3>{s.data.title}</h3>
                          <p>{s.data.objective}</p>
                          <small>
                            {s.data.duration}s ·{' '}
                            {profiles.find((p) => p.id === s.profile_id)?.spec.name || 'Seu perfil'}
                          </small>
                          <div className="radar-actions">
                            <button
                              className="button"
                              onClick={() => {
                                setSelectedScript(structuredClone(s));
                                setHistory([]);
                                setInstruction('');
                              }}
                            >
                              Editar roteiro
                            </button>
                            <button
                              className="radar-icon"
                              aria-label="Baixar roteiro"
                              onClick={() => exportScript(s)}
                            >
                              <Download size={17} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </>
              )}
              {tab === 'reports' && (
                <>
                  <div className="radar-actions">
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => radarRequest({ action: 'report', period: 'daily' }),
                          'Resumo adicionado à fila.',
                        )
                      }
                    >
                      Gerar resumo diário
                    </button>
                    <button
                      className="button"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => radarRequest({ action: 'report', period: 'weekly' }),
                          'Resumo adicionado à fila.',
                        )
                      }
                    >
                      Gerar resumo semanal
                    </button>
                  </div>
                  {!state.reports.length ? (
                    <div className="radar-empty">
                      <Clock size={28} />
                      <h3>As referências ganham contexto aqui</h3>
                      <p>
                        Os resumos reúnem destaques e temas recorrentes entre os perfis monitorados.
                      </p>
                    </div>
                  ) : (
                    state.reports.map((r) => (
                      <article className="radar-card" key={r.id}>
                        <h3>
                          {r.kind === 'weekly' ? 'Resumo semanal' : 'Resumo diário'} · {r.period}
                        </h3>
                        <p>{r.data.scope}</p>
                        <p>
                          {r.data.total} publicações · {r.data.breakouts} destaques acima de 3× a
                          mediana
                        </p>
                        {r.data.top?.map((t: any) => (
                          <button
                            className="radar-report-row"
                            key={t.id}
                            onClick={() => openDetail(t.id)}
                          >
                            <span>{t.title}</span>
                            <strong>
                              {t.ratio !== null ? `${t.ratio.toFixed(1)}×` : 'Sem base suficiente'}
                            </strong>
                          </button>
                        ))}
                        <h4>Temas entre os perfis monitorados</h4>
                        {r.data.recurring?.length ? (
                          r.data.recurring.map((t: any) => (
                            <p key={t.topic}>
                              #{t.topic} · {t.profiles} perfis · {t.posts} publicações
                            </p>
                          ))
                        ) : (
                          <p>Ainda sem recorrência comprovada em dois ou mais perfis.</p>
                        )}
                      </article>
                    ))
                  )}
                </>
              )}
              {tab === 'settings' && settings && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      let instagramInput, tiktokInput;
                      try {
                        instagramInput = JSON.parse(igInput || '{}');
                        tiktokInput = JSON.parse(ttInput || '{}');
                      } catch {
                        throw new Error('O JSON de entrada do Actor está inválido.');
                      }
                      await radarRequest({
                        action: 'settings',
                        spec: { ...settings, instagramInput, tiktokInput },
                        ...(token ? { token } : {}),
                      });
                      setToken('');
                    }, 'Conexões e limites salvos.');
                  }}
                >
                  <div className="radar-grid">
                    <article className="radar-card">
                      <h3>Destino e automação</h3>
                      <label>
                        Perfil do criador
                        <select
                          value={settings.profileId}
                          onChange={(e) => setSettings({ ...settings, profileId: e.target.value })}
                        >
                          <option value="">Selecione</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.spec.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="radar-check">
                        <input
                          type="checkbox"
                          checked={settings.collectionEnabled}
                          onChange={(e) =>
                            setSettings({ ...settings, collectionEnabled: e.target.checked })
                          }
                        />
                        Coletar diariamente
                      </label>
                      <label>
                        Horário de Brasília
                        <input
                          type="time"
                          value={settings.collectionHour}
                          onChange={(e) =>
                            setSettings({ ...settings, collectionHour: e.target.value })
                          }
                        />
                      </label>
                      <label className="radar-check">
                        <input
                          type="checkbox"
                          checked={settings.autoAnalyze}
                          onChange={(e) =>
                            setSettings({ ...settings, autoAnalyze: e.target.checked })
                          }
                        />
                        Analisar automaticamente os destaques (3× a mediana)
                      </label>
                      <label className="radar-check">
                        <input
                          type="checkbox"
                          checked={settings.autoScript}
                          onChange={(e) =>
                            setSettings({ ...settings, autoScript: e.target.checked })
                          }
                        />
                        Gerar um roteiro às segundas, quartas e sextas, às 9h, quando houver uma
                        nova análise com áudio ou imagens.
                      </label>
                      <label>
                        Orientações para sua voz
                        <textarea
                          value={settings.voiceNotes}
                          rows={4}
                          onChange={(e) => setSettings({ ...settings, voiceNotes: e.target.value })}
                          placeholder="Direto, didático, exemplos para empresas…"
                        />
                      </label>
                      <p>
                        Os roteiros também usam as preferências e revisões salvas no perfil do
                        criador. O envio ao Telegram continua no fluxo de revisão e aprovação
                        existente.
                      </p>
                    </article>
                    <article className="radar-card">
                      <h3>IA e processamento</h3>
                      <p>
                        Reutiliza suas conexões de IA. Para transcrição e leitura dos frames, usa a
                        chave OpenAI em Preferências.
                      </p>
                      <span className="radar-pill">
                        OpenAI {state.ai?.openai ? 'cadastrada' : 'pendente'}
                      </span>
                      <label>
                        Modelo de transcrição
                        <input
                          value={settings.transcriptionModel}
                          onChange={(e) =>
                            setSettings({ ...settings, transcriptionModel: e.target.value })
                          }
                          placeholder="ID do modelo, com suporte a áudio"
                        />
                      </label>
                      <label>
                        Modelo OpenAI para análise visual
                        <input
                          value={settings.analysisModel}
                          onChange={(e) =>
                            setSettings({ ...settings, analysisModel: e.target.value })
                          }
                          placeholder="ID de um modelo com visão e saída estruturada"
                        />
                      </label>
                      <label>
                        Modelo de roteiro (opcional)
                        <input
                          value={settings.scriptModel}
                          onChange={(e) =>
                            setSettings({ ...settings, scriptModel: e.target.value })
                          }
                          placeholder="Vazio usa o modelo de texto do perfil"
                        />
                      </label>
                      <p>
                        O modelo de roteiro deve pertencer ao provedor de texto selecionado no
                        perfil.
                      </p>
                      <small>
                        Servidor: {workerOnline ? 'online' : 'sem sinal recente'} · último sinal{' '}
                        {dates(state.worker?.last_run)}
                      </small>
                    </article>
                    <article className="radar-card">
                      <h3>Apify</h3>
                      <label>
                        Token da conta{' '}
                        <span className="radar-pill">
                          {state.apifyConfigured ? 'Já cadastrado' : 'Pendente'}
                        </span>
                        <input
                          type="password"
                          value={token}
                          autoComplete="new-password"
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Deixe vazio para manter o token"
                        />
                      </label>
                      <p>
                        O token fica cifrado. Use um Actor que você tenha validado. O JSON aceita{' '}
                        <code>{'{{username}}'}</code>, <code>{'{{url}}'}</code> e{' '}
                        <code>{'{{limit}}'}</code>.
                      </p>
                      <label>
                        Actor Instagram
                        <input
                          value={settings.instagramActor}
                          onChange={(e) =>
                            setSettings({ ...settings, instagramActor: e.target.value })
                          }
                          placeholder="autor/nome-do-actor"
                        />
                      </label>
                      <label>
                        JSON de entrada · Instagram
                        <textarea
                          rows={6}
                          value={igInput}
                          onChange={(e) => setIgInput(e.target.value)}
                          spellCheck={false}
                        />
                      </label>
                      <label>
                        Actor TikTok
                        <input
                          value={settings.tiktokActor}
                          onChange={(e) =>
                            setSettings({ ...settings, tiktokActor: e.target.value })
                          }
                          placeholder="autor/nome-do-actor"
                        />
                      </label>
                      <label>
                        JSON de entrada · TikTok
                        <textarea
                          rows={5}
                          value={ttInput}
                          onChange={(e) => setTtInput(e.target.value)}
                          spellCheck={false}
                        />
                      </label>
                    </article>
                    <article className="radar-card">
                      <h3>Limites e orçamento</h3>
                      <p>
                        As reservas estimam o consumo antes de cada chamada e bloqueiam novas
                        chamadas ao atingir o limite. O valor cobrado depende do provedor e pode
                        divergir da estimativa.
                      </p>
                      <div className="radar-form-grid">
                        {(
                          [
                            ['monthlyBudget', 'Orçamento mensal (US$)', 0, 1000, 0.5],
                            ['collectionReserve', 'Reserva por coleta (US$)', 0.01, 10, 0.01],
                            ['analysisReserve', 'Reserva por análise (US$)', 0.01, 10, 0.01],
                            ['scriptReserve', 'Reserva por roteiro (US$)', 0.01, 10, 0.01],
                            ['deepDailyLimit', 'Análises por dia', 0, 50, 1],
                            ['historyLimit', 'Histórico por referência', 5, 50, 1],
                            ['maxProfiles', 'Limite de perfis', 1, 100, 1],
                            ['maxDuration', 'Duração máxima (s)', 10, 600, 1],
                            ['maxFileMb', 'Tamanho máximo (MB)', 5, 150, 1],
                            ['maxFrames', 'Frames por análise', 4, 16, 1],
                            ['retentionHours', 'Retenção de mídia (horas)', 1, 168, 1],
                          ] as const
                        ).map(([key, label, min, max, step]) => (
                          <label key={key}>
                            {label}
                            <input
                              type="number"
                              required
                              min={min}
                              max={max}
                              step={step}
                              value={settings[key]}
                              onChange={(e) =>
                                setSettings({ ...settings, [key]: Number(e.target.value) })
                              }
                            />
                          </label>
                        ))}
                      </div>
                      <p>
                        Comprometido neste mês: <strong>{money(used)}</strong>. Custos desconhecidos
                        mantêm a reserva; não são tratados como zero.
                      </p>
                    </article>
                  </div>
                  <button className="button primary" disabled={busy}>
                    {busy ? 'Salvando…' : 'Salvar conexões e limites'}
                  </button>
                </form>
              )}
            </>
          )}
          {detail && (
            <div
              className="radar-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDetail(null);
              }}
            >
              <section
                className="radar-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Detalhes da referência"
              >
                <div className="radar-card-head">
                  <div>
                    <span className="radar-kicker">REFERÊNCIA E EVIDÊNCIAS</span>
                    <h2>{detail.content.title}</h2>
                  </div>
                  <button
                    className="radar-icon"
                    aria-label="Fechar detalhes"
                    onClick={() => setDetail(null)}
                  >
                    <X />
                  </button>
                </div>
                <div className="radar-actions">
                  <span className="radar-pill">
                    {analysis ? modeLabels[analysis.mode] : 'Ainda não analisado'}
                  </span>
                  {detail.content.permalink && (
                    <a
                      className="radar-link"
                      href={detail.content.permalink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Vídeo original <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      run(
                        () =>
                          radarRequest({
                            action: 'analyze',
                            id: detail.content.id,
                            key: crypto.randomUUID(),
                          }),
                        'Análise adicionada à fila. Você pode fechar esta janela.',
                      )
                    }
                  >
                    {analysis ? 'Analisar novamente' : 'Analisar referência'}
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => openDetail(detail.content.id)}
                  >
                    <RefreshCw size={14} />
                    Atualizar
                  </button>
                </div>
                {analysis ? (
                  <>
                    <p>{analysis.summary}</p>
                    <div className="radar-grid">
                      <article className="radar-card">
                        <h3>Gancho e narrativa</h3>
                        <p>{analysis.opening_hook.text}</p>
                        <small>{analysis.opening_hook.type}</small>
                        {analysis.narrative_beats.map((b, i) => (
                          <div className="radar-beat" key={i}>
                            <strong>
                              {b.start_s !== null
                                ? `${b.start_s}–${b.end_s ?? '?'}s`
                                : 'Sem tempo identificado'}{' '}
                              · {b.role}
                            </strong>
                            <p>{b.description}</p>
                            {b.evidence.map((ev, j) => (
                              <small key={j}>
                                {ev.source_type}
                                {ev.timestamp_s !== null ? ` · ${ev.timestamp_s}s` : ''}:{' '}
                                {ev.description}
                                <br />
                              </small>
                            ))}
                          </div>
                        ))}
                      </article>
                      <article className="radar-card">
                        <h3>O que podemos adaptar</h3>
                        {analysis.adaptation_opportunities.map((x, i) => (
                          <p key={i}>{x}</p>
                        ))}
                        <h4>Hipóteses, sem causalidade comprovada</h4>
                        {analysis.hypotheses.map((h, i) => (
                          <p key={i}>
                            {h.statement}{' '}
                            <small>({Math.round(h.confidence * 100)}% de confiança)</small>
                          </p>
                        ))}
                        <h4>Limitações</h4>
                        {[...analysis.limitations, ...analysis.evidence.warnings].map((x, i) => (
                          <p key={i}>{x}</p>
                        ))}
                      </article>
                    </div>
                    <details className="radar-card">
                      <summary>Transcrição e frames usados na análise</summary>
                      <p>{analysis.evidence.transcript?.text || 'Não há transcrição de áudio.'}</p>
                      <div className="radar-frame-grid">
                        {analysis.evidence.frames.map((f: any) => (
                          <figure key={f.path}>
                            {f.url ? (
                              <img src={f.url} alt={`Frame real aos ${f.timestamp} segundos`} />
                            ) : (
                              <div className="radar-frame-expired">Frame expirado</div>
                            )}
                            <figcaption>{f.timestamp}s</figcaption>
                          </figure>
                        ))}
                      </div>
                      <small>
                        Frames são amostras; cortes e eventos entre as amostras podem não ser
                        observados.
                      </small>
                    </details>
                  </>
                ) : (
                  <div className="radar-empty">
                    <p>
                      A análise aparecerá aqui quando o servidor terminar. Links sem arquivo
                      acessível usam apenas os metadados.
                    </p>
                  </div>
                )}
                <details className="radar-card">
                  <summary>Métricas e evolução</summary>
                  <p>
                    A mediana exige pelo menos cinco outras publicações comparáveis do mesmo perfil,
                    plataforma, tipo e faixa de idade. Velocidade exige duas coletas.
                  </p>
                  <div className="radar-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Coleta</th>
                          <th>Visualizações</th>
                          <th>Curtidas</th>
                          <th>Comentários</th>
                          <th>Compartilhamentos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.snapshots.map((s: any, i: number) => (
                          <tr key={i}>
                            <td>{dates(s.recorded_at)}</td>
                            <td>{number(s.views)}</td>
                            <td>{number(s.likes)}</td>
                            <td>{number(s.comments)}</td>
                            <td>{number(s.shares)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!detail.snapshots.length && <p>Nenhuma métrica foi coletada.</p>}
                </details>
                <article className="radar-card">
                  <h3>Gerar roteiro original</h3>
                  <div className="radar-form-grid">
                    {profileSelect}
                    <label>
                      Duração
                      <select
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                      >
                        <option value={30}>30 segundos</option>
                        <option value={45}>45 segundos</option>
                        <option value={60}>60 segundos</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    Seu ângulo ou orientação
                    <textarea
                      rows={3}
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="Como isso se aplica a uma empresa que ainda usa planilhas?"
                    />
                  </label>
                  <button
                    className="button primary"
                    disabled={busy || !analysis || !profileId}
                    onClick={() =>
                      run(async () => {
                        await radarRequest({
                          action: 'script',
                          id: detail.content.id,
                          profileId,
                          duration,
                          instruction,
                          key: crypto.randomUUID(),
                        });
                        setDetail(null);
                        setTab('scripts');
                      }, 'Roteiro adicionado à fila. Ele aparecerá aqui quando estiver pronto.')
                    }
                  >
                    <Play size={15} />
                    Gerar meu roteiro
                  </button>
                </article>
              </section>
            </div>
          )}
          {selectedScript && (
            <div className="radar-overlay">
              <section
                className="radar-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Editor de roteiro"
              >
                <div className="radar-card-head">
                  <div>
                    <span className="radar-kicker">
                      ROTEIRO ORIGINAL · V{selectedScript.version}
                    </span>
                    <h2>Pronto para ganhar sua voz</h2>
                  </div>
                  <button
                    className="radar-icon"
                    aria-label="Fechar roteiro"
                    onClick={() => setSelectedScript(null)}
                  >
                    <X />
                  </button>
                </div>
                <label>
                  Título
                  <input
                    value={selectedScript.data.title}
                    onChange={(e) => editScript('title', e.target.value)}
                  />
                </label>
                <div className="radar-grid">
                  <div>
                    <h3>Três aberturas para experimentar</h3>
                    {selectedScript.data.hooks.map((h, i) => (
                      <label key={h.type}>
                        {h.type}
                        <textarea
                          rows={2}
                          value={h.text}
                          onChange={(e) =>
                            editScript(
                              'hooks',
                              selectedScript.data.hooks.map((old, j) =>
                                i === j ? { ...old, text: e.target.value } : old,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Roteiro falado
                      <textarea
                        rows={12}
                        value={selectedScript.data.spoken}
                        onChange={(e) => editScript('spoken', e.target.value)}
                      />
                    </label>
                    <label>
                      CTA
                      <textarea
                        rows={2}
                        value={selectedScript.data.cta}
                        onChange={(e) => editScript('cta', e.target.value)}
                      />
                    </label>
                    <label>
                      Texto de capa
                      <input
                        value={selectedScript.data.cover}
                        onChange={(e) => editScript('cover', e.target.value)}
                      />
                    </label>
                    <label>
                      Legenda
                      <textarea
                        rows={5}
                        value={selectedScript.data.caption}
                        onChange={(e) => editScript('caption', e.target.value)}
                      />
                    </label>
                  </div>
                  <div>
                    <h3>Guia de gravação</h3>
                    {selectedScript.data.scenes.map((s, i) => (
                      <article className="radar-card" key={i}>
                        <strong>
                          {s.start}–{s.end}s
                        </strong>
                        {(['speech', 'visual', 'screenText', 'editing'] as const).map((k) => (
                          <label key={k}>
                            {
                              {
                                speech: 'Fala',
                                visual: 'Imagem ou ação',
                                screenText: 'Texto na tela',
                                editing: 'Edição',
                              }[k]
                            }
                            <textarea
                              rows={2}
                              value={s[k]}
                              onChange={(e) =>
                                editScript(
                                  'scenes',
                                  selectedScript.data.scenes.map((old, j) =>
                                    j === i ? { ...old, [k]: e.target.value } : old,
                                  ),
                                )
                              }
                            />
                          </label>
                        ))}
                      </article>
                    ))}
                    <h4>Verificar antes de gravar</h4>
                    {selectedScript.data.factualChecks.map((x, i) => (
                      <p key={i}>{x}</p>
                    ))}
                    <h4>Originalidade</h4>
                    {selectedScript.data.changeForOriginality.map((x, i) => (
                      <p key={i}>{x}</p>
                    ))}
                  </div>
                </div>
                <div className="radar-actions">
                  <label>
                    Etapa
                    <select
                      value={selectedScript.status}
                      onChange={(e) =>
                        setSelectedScript({ ...selectedScript, status: e.target.value as any })
                      }
                    >
                      <option value="idea">Ideia</option>
                      <option value="draft">Rascunho</option>
                      <option value="approved">Aprovado para gravar</option>
                      <option value="recorded">Gravado</option>
                      <option value="published">Publicado</option>
                    </select>
                  </label>
                  <label className="radar-check">
                    <input
                      type="checkbox"
                      checked={selectedScript.favorite}
                      onChange={(e) =>
                        setSelectedScript({ ...selectedScript, favorite: e.target.checked })
                      }
                    />
                    Favorito
                  </label>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await radarRequest({
                          action: 'editScript',
                          id: selectedScript.id,
                          version: selectedScript.version,
                          data: selectedScript.data,
                          status: selectedScript.status,
                          favorite: selectedScript.favorite,
                        });
                        setSelectedScript(null);
                      }, 'Nova versão do roteiro salva.')
                    }
                  >
                    Salvar versão
                  </button>
                  <button className="button" onClick={() => exportScript(selectedScript)}>
                    <Download size={15} />
                    Markdown
                  </button>
                </div>
                <article className="radar-card">
                  <h3>Revisar com IA</h3>
                  <p>
                    Salve suas alterações antes de pedir uma nova versão. A revisão parcial preserva
                    os outros campos.
                  </p>
                  <label>
                    Trecho
                    <select value={part} onChange={(e) => setPart(e.target.value)}>
                      {[
                        ['all', 'Roteiro completo'],
                        ['hooks', 'Ganchos'],
                        ['spoken', 'Texto falado'],
                        ['scenes', 'Cenas'],
                        ['cta', 'CTA'],
                        ['caption', 'Legenda'],
                        ['cover', 'Capa'],
                      ].map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Instrução
                    <textarea
                      rows={2}
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                    />
                  </label>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await radarRequest({
                          action: 'script',
                          id: selectedScript.content_id,
                          profileId: selectedScript.profile_id,
                          scriptId: selectedScript.id,
                          part,
                          duration: selectedScript.data.duration,
                          instruction,
                          key: crypto.randomUUID(),
                        });
                        setSelectedScript(null);
                      }, 'Revisão adicionada à fila.')
                    }
                  >
                    Gerar revisão
                  </button>
                </article>
                <div className="radar-actions">
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await radarRequest({
                          action: 'handoff',
                          id: selectedScript.id,
                          target: 'studio',
                        });
                      }, 'Roteiro enviado ao Estúdio de conteúdo, na etapa Roteiro.')
                    }
                  >
                    Enviar ao Estúdio
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        await radarRequest({
                          action: 'handoff',
                          id: selectedScript.id,
                          target: 'carousel',
                        });
                        setSelectedScript(null);
                        onCarousel();
                      }, 'Carrossel criado como rascunho. Continue em Publicações.')
                    }
                  >
                    Transformar em carrossel
                  </button>
                  <button
                    className="radar-link"
                    disabled={busy}
                    onClick={() =>
                      run(async () => {
                        const result = await radarRequest({
                          action: 'history',
                          id: selectedScript.id,
                        });
                        setHistory(result.versions);
                      }, '')
                    }
                  >
                    Ver versões anteriores
                  </button>
                </div>
                {history.map((v) => (
                  <details className="radar-card" key={v.id}>
                    <summary>
                      Versão {v.version} · {dates(v.created_at)}
                    </summary>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{v.data.spoken}</p>
                    <button
                      className="button"
                      onClick={() => setSelectedScript({ ...selectedScript, data: v.data })}
                    >
                      Usar esta versão no editor
                    </button>
                  </details>
                ))}
                <small>
                  As referências estão preservadas no Markdown. Revise dados factuais antes de
                  publicar.
                </small>
              </section>
            </div>
          )}
        </>
      )}
    </section>
  );
}
