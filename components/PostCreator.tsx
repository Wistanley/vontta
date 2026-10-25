import React, { useEffect, useRef, useState } from 'react';
import {
  Sparkles,
  Plus,
  Send,
  Users,
  CalendarDays,
  Settings2,
  RefreshCw,
  Check,
  Image,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { Modal, Pill, Empty } from './WorkspaceUI';
import {
  defaultProfile,
  newPost,
  statusLabels,
  allReviewsPassed,
  reviewerNames,
  profileSchema,
  plannedLabel,
  isPostDue,
  MAX_POST_BRIEF,
} from '../lib/post-creator';
import type { CreatorPost, PostProfile, ProfileSpec, PostSlide } from '../lib/post-creator';
import { creatorRequest } from '../services/postCreatorClient';
import type { CreatorState } from '../services/postCreatorClient';
import './post-creator.css';

const demoKey = 'vontta-post-creator-demo-v1';
const emptyState = (): CreatorState => ({
  profiles: [],
  posts: [],
  feedback: [],
  connection: { configured: false, chatId: '' },
  worker: { configured: false, lastRun: null },
});
const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function localInput(iso = '') {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const providerOptions = (
  <>
    <option value="auto">Padrão das preferências</option>
    <option value="openai">OpenAI</option>
    <option value="anthropic">Anthropic</option>
    <option value="google">Google</option>
  </>
);
function Field({
  label,
  value,
  onChange,
  required = false,
  area = false,
  placeholder,
  maxLength = 4000,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  area?: boolean;
  placeholder?: string;
  maxLength?: number | null;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {area ? (
        <textarea
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={maxLength ?? undefined}
          placeholder={placeholder}
        />
      ) : (
        <input
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength ?? undefined}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}
function ProfileEditor({
  profile,
  onClose,
  onSave,
  busy,
  error,
}: {
  profile: PostProfile;
  onClose: () => void;
  onSave: (profile: PostProfile) => void;
  busy: boolean;
  error: string;
}) {
  const [spec, setSpec] = useState(profile.spec);
  const set = <K extends keyof ProfileSpec>(key: K, value: ProfileSpec[K]) =>
    setSpec((current) => ({ ...current, [key]: value }));
  return (
    <Modal
      title={profile.spec.name ? 'Editar perfil de criação' : 'Novo perfil de criação'}
      onClose={onClose}
      wide
    >
      <form
        className="post-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...profile, spec });
        }}
      >
        <p className="muted">
          Cada perfil mantém sua identidade, seus prompts e as correções aprendidas.
        </p>
        {error && (
          <p className="post-alert" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <Field
            label="Nome do perfil"
            value={spec.name}
            onChange={(v) => set('name', v)}
            required
            maxLength={100}
          />
          <Field
            label="@ do perfil"
            value={spec.handle}
            onChange={(v) => set('handle', v)}
            maxLength={100}
          />
        </div>
        <Field
          label="Público e nicho"
          value={spec.audience}
          onChange={(v) => set('audience', v)}
          required
          area
          maxLength={2000}
        />
        <Field
          label="Tom de voz"
          value={spec.voice}
          onChange={(v) => set('voice', v)}
          required
          maxLength={2000}
        />
        <Field
          label="Objetivos e temas"
          value={spec.goals}
          onChange={(v) => set('goals', v)}
          area
          maxLength={2000}
        />
        <Field
          label="Preferências e restrições"
          value={spec.preferences}
          onChange={(v) => set('preferences', v)}
          area
          placeholder="Palavras a evitar, tipos de CTA, frequência, referências…"
        />
        <h3>Direção criativa</h3>
        <Field
          label="Prompt de criação de textos"
          value={spec.textPrompt}
          onChange={(v) => set('textPrompt', v)}
          area
          maxLength={6000}
        />
        <Field
          label="Prompt de imagens e identidade visual"
          value={spec.imagePrompt}
          onChange={(v) => set('imagePrompt', v)}
          area
          maxLength={6000}
          placeholder="Paleta, tipografia, estilo fotográfico, composição e margens…"
        />
        <Field
          label="Instruções para os revisores"
          value={spec.reviewPrompt}
          onChange={(v) => set('reviewPrompt', v)}
          area
        />
        <div className="form-grid">
          <label className="field">
            <span>IA de texto</span>
            <select
              value={spec.textProvider}
              onChange={(e) => set('textProvider', e.target.value as ProfileSpec['textProvider'])}
            >
              {providerOptions}
            </select>
          </label>
          <label className="field">
            <span>IA dos revisores</span>
            <select
              value={spec.reviewProvider}
              onChange={(e) =>
                set('reviewProvider', e.target.value as ProfileSpec['reviewProvider'])
              }
            >
              {providerOptions}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Produção das artes</span>
          <select
            value={spec.renderMode}
            onChange={(e) => set('renderMode', e.target.value as ProfileSpec['renderMode'])}
          >
            <option value="generated">Arte completa gerada pela OpenAI</option>
            <option value="editorial">Editorial: Poppins e fotografias reais</option>
          </select>
        </label>
        {spec.renderMode === 'editorial' && (
          <p className="small muted">
            Poppins 600/500/400, grafite e verde menta, com fotografias de um acervo curado e
            créditos registrados. Não gera fotografias sintéticas.
          </p>
        )}
        <Field
          label="Modelo de imagem OpenAI"
          value={spec.imageModel}
          onChange={(v) => set('imageModel', v)}
          required={spec.renderMode === 'generated'}
          maxLength={150}
          placeholder="Identificador do modelo disponível na sua conta"
        />
        <p className="small muted">
          A chave OpenAI vem de Preferências → Conexão de IA. O modelo dos revisores precisa aceitar
          imagens para a revisão visual.
        </p>
        <label className="field">
          <span>Aprovação e envio ao Telegram</span>
          <select
            value={spec.approval}
            onChange={(e) => set('approval', e.target.value as ProfileSpec['approval'])}
          >
            <option value="human">Aguardar minha aprovação final</option>
            <option value="automatic">
              Enviar automaticamente após todos os revisores aprovarem
            </option>
          </select>
        </label>
        <label className="post-check">
          <input
            type="checkbox"
            checked={spec.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          Perfil ativo para produção e envio
        </label>
        <div className="section-heading">
          <h3>Agendas automáticas</h3>
          <button
            type="button"
            className="button subtle"
            disabled={spec.schedules.length >= 10}
            onClick={() =>
              set('schedules', [
                ...spec.schedules,
                {
                  id: crypto.randomUUID(),
                  enabled: true,
                  days: [1, 3, 5],
                  time: '09:00',
                  timezone: 'America/Sao_Paulo',
                  format: 'Post',
                  slides: 1,
                  brief: '',
                },
              ])
            }
          >
            <Plus size={16} />
            Adicionar agenda
          </button>
        </div>
        {spec.schedules.length === 0 && (
          <p className="muted">Adicione horários e pautas recorrentes para este perfil.</p>
        )}
        {spec.schedules.map((schedule, index) => {
          const update = (changes: Partial<typeof schedule>) =>
            set(
              'schedules',
              spec.schedules.map((s) => (s.id === schedule.id ? { ...s, ...changes } : s)),
            );
          return (
            <fieldset className="post-schedule" key={schedule.id}>
              <legend>Agenda {index + 1}</legend>
              <div className="post-days">
                {days.map((day, d) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={schedule.days.includes(d)}
                      onChange={(e) =>
                        update({
                          days: e.target.checked
                            ? [...schedule.days, d]
                            : schedule.days.filter((n) => n !== d),
                        })
                      }
                    />
                    {day}
                  </label>
                ))}
              </div>
              {schedule.days.length === 0 && <p role="alert">Selecione pelo menos um dia.</p>}
              <div className="form-grid">
                <label className="field">
                  <span>Horário de criação</span>
                  <input
                    type="time"
                    required
                    value={schedule.time}
                    onChange={(e) => update({ time: e.target.value })}
                  />
                </label>
                <Field
                  label="Fuso horário"
                  value={schedule.timezone}
                  onChange={(v) => update({ timezone: v })}
                  required
                  maxLength={80}
                />
              </div>
              <div className="form-grid">
                <label className="field">
                  <span>Formato da agenda</span>
                  <select
                    value={schedule.format}
                    onChange={(e) => update({ format: e.target.value as typeof schedule.format })}
                  >
                    {['Post', 'Carrossel', 'Stories'].map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Quantidade de telas</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    disabled={schedule.format === 'Post'}
                    value={schedule.format === 'Post' ? 1 : schedule.slides}
                    onChange={(e) => update({ slides: Number(e.target.value) })}
                  />
                </label>
              </div>
              <Field
                label="Pauta da agenda"
                value={schedule.brief}
                onChange={(v) => update({ brief: v })}
                required
                area
                maxLength={null}
                placeholder="Ex.: escolha um tema dos pilares do perfil e crie conteúdo educativo com um exemplo prático."
              />
              <p
                className="small"
                role={schedule.brief.length > MAX_POST_BRIEF ? 'alert' : undefined}
              >
                {schedule.brief.length} / {MAX_POST_BRIEF} caracteres.{' '}
                {schedule.brief.length > MAX_POST_BRIEF
                  ? 'Reduza o texto para salvar. O conteúdo não foi cortado.'
                  : 'O texto completo será preservado.'}
              </p>
              <div className="post-actions">
                <label className="post-check">
                  <input
                    type="checkbox"
                    checked={schedule.enabled}
                    onChange={(e) => update({ enabled: e.target.checked })}
                  />
                  Agenda ativa
                </label>
                <button
                  type="button"
                  className="button subtle"
                  onClick={() =>
                    set(
                      'schedules',
                      spec.schedules.filter((s) => s.id !== schedule.id),
                    )
                  }
                >
                  Remover agenda
                </button>
              </div>
            </fieldset>
          );
        })}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={busy || spec.schedules.some((s) => !s.days.length)}
          >
            {busy ? 'Salvando…' : 'Salvar perfil'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function PostDetail({
  post,
  profile,
  busy,
  demo,
  onClose,
  action,
  error,
}: {
  post: CreatorPost;
  profile?: PostProfile;
  busy: boolean;
  demo: boolean;
  onClose: () => void;
  action: (body: Record<string, unknown>, run?: boolean) => void;
  error: string;
}) {
  const [feedback, setFeedback] = useState('');
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.data.caption || '');
  const [slides, setSlides] = useState<PostSlide[]>(post.data.slides);
  const [scheduledFor, setScheduledFor] = useState(localInput(post.data.scheduledFor));
  const [evidence, setEvidence] = useState(post.data.evidence || '');
  const editable =
    !['sent', 'sending', 'delivery_unknown'].includes(post.status) &&
    post.data.delivery.index === 0;
  return (
    <Modal title={post.data.title || 'Publicação em produção'} onClose={onClose} wide>
      <div className="post-form">
        <div className="post-actions">
          <Pill tone={post.status === 'sent' ? 'green' : 'muted'}>{statusLabels[post.status]}</Pill>
          <span className="small muted">
            {profile?.spec.name} · {post.data.format} · versão {post.data.version}
          </span>
        </div>
        <p>{post.data.brief}</p>
        {post.data.materialNeeded && (
          <form
            className="post-form post-notice"
            onSubmit={(e) => {
              e.preventDefault();
              action({ action: 'material', id: post.id, evidence });
            }}
          >
            <strong>Material real necessário</strong>
            <p>{post.data.materialNeeded}</p>
            <Field
              label="Informações e fontes reais do projeto"
              value={evidence}
              onChange={setEvidence}
              area
              required
              maxLength={6000}
              placeholder="Problema, processo anterior, solução implementada, resultados comprovados e o que está autorizado mostrar."
            />
            <button className="button secondary" disabled={busy}>
              Salvar material e liberar criação
            </button>
          </form>
        )}
        {post.data.scheduledFor && (
          <p className="post-notice">
            <CalendarDays size={15} /> Criação programada: {plannedLabel(post)}
          </p>
        )}
        {post.data.editorial && (
          <div className="post-caption">
            <strong>
              Semana {post.data.editorial.week} · {post.data.editorial.pillar}
              {post.data.editorial.pinned ? ' · Fixar no perfil' : ''}
            </strong>
            <p>Formato de referência: {post.data.editorial.originalFormat}</p>
            <p>Stories de apoio: {post.data.editorial.stories}</p>
          </div>
        )}
        {error && (
          <p className="post-alert" role="alert">
            {error}
          </p>
        )}
        {post.data.error && (
          <p className="post-alert" role="alert">
            {post.data.error}
          </p>
        )}
        {demo && (
          <p className="post-notice">
            Demonstração: cadastros e rascunhos ficam neste navegador. Geração, revisão e Telegram
            exigem sua conta conectada.
          </p>
        )}
        <div className="post-slides">
          {post.data.slides.map((slide, index) => (
            <article key={`${post.data.version}-${index}`}>
              {slide.url ? (
                <a
                  href={slide.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`Abrir arte ${index + 1}`}
                >
                  <img src={slide.url} alt={`Arte ${index + 1}: ${slide.heading}`} />
                </a>
              ) : (
                <div className="post-art-pending">
                  <Image size={28} />
                  <span>Arte {index + 1} pendente</span>
                </div>
              )}
              <small>TELA {index + 1}</small>
              <h3>{slide.heading}</h3>
              <p>{slide.body}</p>
              {slide.photo && (
                <small>
                  <a href={slide.photo.source} target="_blank" rel="noreferrer">
                    Foto: {slide.photo.author}
                  </a>{' '}
                  ·{' '}
                  <a href={slide.photo.license} target="_blank" rel="noreferrer">
                    Licença
                  </a>
                </small>
              )}
            </article>
          ))}
        </div>
        {post.data.caption && (
          <div className="post-caption">
            <span className="eyebrow">LEGENDA PARA PUBLICAR</span>
            <p>{post.data.caption}</p>
            <button
              className="button subtle"
              onClick={() => void navigator.clipboard.writeText(post.data.caption || '')}
            >
              Copiar legenda
            </button>
          </div>
        )}
        <div className="post-review-list">
          {reviewerNames.map((name) => {
            const review = post.data.reviews.find((r) => r.reviewer === name);
            return (
              <div key={name}>
                <span className={review?.approved ? 'post-review-ok' : ''}>
                  {review?.approved ? <Check size={18} /> : <span className="post-review-dot" />}
                  {name}
                </span>
                <p>{review ? review.notes : 'Aguardando esta etapa'}</p>
              </div>
            );
          })}
        </div>
        {post.status === 'awaiting_approval' && (
          <div className="post-notice">
            Todos os revisores aprovaram. Confira as artes e a legenda antes de liberar o envio.
          </div>
        )}
        <div className="post-actions">
          {['draft', 'generating', 'approved'].includes(post.status) && (
            <button
              className="button primary"
              disabled={busy || Boolean(post.data.materialNeeded)}
              onClick={() =>
                action(
                  {
                    action: 'process',
                    id: post.id,
                    ...(!isPostDue(post) ? { startNow: true } : {}),
                  },
                  true,
                )
              }
            >
              <Sparkles size={16} />
              {busy
                ? 'Processando etapa…'
                : post.status === 'approved'
                  ? 'Enviar ao Telegram'
                  : !isPostDue(post)
                    ? 'Antecipar e produzir agora'
                    : 'Iniciar / continuar produção'}
            </button>
          )}
          {post.status === 'awaiting_approval' && (
            <button
              className="button primary"
              disabled={busy || !allReviewsPassed(post)}
              onClick={() => action({ action: 'approve', id: post.id }, true)}
            >
              <Send size={16} />
              Aprovar e enviar ao Telegram
            </button>
          )}
          {post.status === 'failed' && (
            <button
              className="button primary"
              disabled={busy}
              onClick={() => action({ action: 'retry', id: post.id }, true)}
            >
              <RefreshCw size={16} />
              Retomar etapa com falha
            </button>
          )}
          {post.status === 'sending' && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => action({ action: 'process', id: post.id })}
            >
              Conferir envio interrompido
            </button>
          )}
          {editable && post.data.slides.length > 0 && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => {
                setSlides(post.data.slides);
                setCaption(post.data.caption || '');
                setEditing((v) => !v);
              }}
            >
              <Pencil size={16} />
              Editar textos
            </button>
          )}
        </div>
        {post.status === 'draft' && (
          <form
            className="post-form"
            onSubmit={(e) => {
              e.preventDefault();
              action({
                action: 'schedule',
                id: post.id,
                scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
              });
            }}
          >
            <label className="field">
              <span>Iniciar criação em (fuso do dispositivo)</span>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </label>
            <button className="button secondary" disabled={busy}>
              Salvar horário de criação
            </button>
            <p className="small muted">
              Deixe vazio para manter como rascunho manual. O horário dispara a criação, não publica
              nas redes sociais.
            </p>
          </form>
        )}
        {post.status === 'delivery_unknown' && (
          <div className="post-notice">
            <p>
              Confira no Telegram o item{' '}
              {post.data.delivery.index < post.data.slides.length
                ? `arte ${post.data.delivery.index + 1}`
                : 'legenda'}
              . Sua resposta evita duplicar o envio.
            </p>
            <div className="post-actions">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => action({ action: 'reconcile', id: post.id, received: true }, true)}
              >
                Este item chegou
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => action({ action: 'reconcile', id: post.id, received: false }, true)}
              >
                Este item não chegou; reenviar
              </button>
            </div>
          </div>
        )}
        {editing && editable && (
          <form
            className="post-form post-edit"
            onSubmit={(e) => {
              e.preventDefault();
              action({
                action: 'edit',
                id: post.id,
                caption,
                slides: slides.map(({ heading, body, imagePrompt }) => ({
                  heading,
                  body,
                  imagePrompt,
                })),
              });
              setEditing(false);
            }}
          >
            <Field
              label="Editar legenda"
              value={caption}
              onChange={setCaption}
              area
              required
              maxLength={3000}
            />
            {slides.map((s, i) => (
              <div key={i}>
                <Field
                  label={`Título da tela ${i + 1}`}
                  value={s.heading}
                  onChange={(heading) =>
                    setSlides((current) =>
                      current.map((slide, n) => (n === i ? { ...slide, heading } : slide)),
                    )
                  }
                  maxLength={180}
                />
                <Field
                  label={`Texto da tela ${i + 1}`}
                  value={s.body}
                  onChange={(body) =>
                    setSlides((current) =>
                      current.map((slide, n) => (n === i ? { ...slide, body } : slide)),
                    )
                  }
                  area
                  maxLength={800}
                />
              </div>
            ))}
            <p className="small muted">
              A edição será registrada como referência para este perfil. As artes serão refeitas e
              passarão novamente por todos os revisores.
            </p>
            <button className="button primary" disabled={busy}>
              Salvar edição e reiniciar revisão
            </button>
          </form>
        )}
        {editable && (
          <form
            className="post-feedback"
            onSubmit={(e) => {
              e.preventDefault();
              action({ action: 'revise', id: post.id, instruction: feedback });
              setFeedback('');
            }}
          >
            <h3>Solicitar revisão e ensinar ao perfil</h3>
            <Field
              label="O que deve mudar?"
              value={feedback}
              onChange={setFeedback}
              area
              required
              placeholder="Ex.: evite frases longas, troque o CTA por uma pergunta e use fundos claros."
            />
            <p className="small muted">
              A orientação ficará na memória deste perfil. Uma nova versão reinicia as revisões e
              exige nova aprovação.
            </p>
            <button className="button secondary" disabled={busy || !feedback.trim()}>
              Registrar orientação e criar nova versão
            </button>
          </form>
        )}
        {post.status === 'sent' && (
          <p className="post-notice">
            Artes entregues em PNG, na ordem das telas, e legenda enviada separadamente. Agora você
            pode publicar.
          </p>
        )}
      </div>
    </Modal>
  );
}

export default function PostCreator({ demo }: { demo: boolean }) {
  const [state, setState] = useState<CreatorState>(emptyState);
  const [tab, setTab] = useState<'posts' | 'profiles' | 'schedules' | 'connections'>('posts');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [profileEdit, setProfileEdit] = useState<PostProfile | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [filter, setFilter] = useState('');
  const [brief, setBrief] = useState('');
  const [format, setFormat] = useState<'Post' | 'Carrossel' | 'Stories'>('Post');
  const [count, setCount] = useState(3);
  const [scheduledFor, setScheduledFor] = useState('');
  const [token, setToken] = useState('');
  const [chat, setChat] = useState('');
  const load = async () => {
    const next = await creatorRequest<CreatorState>();
    if (mounted.current) {
      setState(next);
      setChat(next.connection.chatId);
    }
  };
  useEffect(() => {
    mounted.current = true;
    if (demo) {
      try {
        const saved = JSON.parse(localStorage.getItem(demoKey) || 'null');
        if (saved?.profiles && saved?.posts && saved?.feedback)
          setState({
            ...emptyState(),
            profiles: saved.profiles,
            posts: saved.posts,
            feedback: saved.feedback,
          });
      } catch {}
      setLoading(false);
    } else
      void load()
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    return () => {
      mounted.current = false;
    };
  }, [demo]);
  const updateDemo = (next: CreatorState) => {
    localStorage.setItem(
      demoKey,
      JSON.stringify({ profiles: next.profiles, posts: next.posts, feedback: next.feedback }),
    );
    setState(next);
  };
  const run = async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
    } catch (e) {
      if (mounted.current) setError((e as Error).message);
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const updatePost = (post: CreatorPost) => {
    if (mounted.current)
      setState((current) => ({
        ...current,
        posts: current.posts.map((p) => (p.id === post.id ? post : p)),
      }));
  };
  const action = (body: Record<string, unknown>, continueRun = false) =>
    void run(async () => {
      if (demo) {
        if (body.action === 'schedule') {
          updateDemo({
            ...state,
            posts: state.posts.map((p) =>
              p.id === body.id
                ? {
                    ...p,
                    data: {
                      ...p.data,
                      scheduledFor: body.scheduledFor ? String(body.scheduledFor) : undefined,
                    },
                  }
                : p,
            ),
          });
          setMessage(
            'Horário salvo. Na conta conectada, o worker inicia a criação automaticamente.',
          );
          return;
        }
        if (body.action !== 'revise')
          throw new Error(
            'A demonstração não chama APIs. Entre na sua conta para gerar, revisar e enviar publicações.',
          );
        const post = state.posts.find((p) => p.id === body.id)!;
        const revised = newPost(
          post.profile_id,
          post.data.brief,
          post.data.format,
          post.data.slideCount,
        );
        updateDemo({
          ...state,
          posts: state.posts.map((p) =>
            p.id === post.id
              ? {
                  ...revised,
                  id: p.id,
                  created_at: p.created_at,
                  data: {
                    ...revised.data,
                    version: p.data.version + 1,
                    scheduledFor: p.data.scheduledFor,
                    editorial: p.data.editorial,
                  },
                }
              : p,
          ),
          feedback: [
            {
              id: crypto.randomUUID(),
              profile_id: post.profile_id,
              post_id: post.id,
              instruction: String(body.instruction),
              created_at: new Date().toISOString(),
            },
            ...state.feedback,
          ],
        });
        setMessage('Orientação registrada na memória do perfil.');
        return;
      }
      try {
        let result = await creatorRequest<{ post: CreatorPost }>(body);
        updatePost(result.post);
        // Each API call persists one stage. Closing this view leaves the worker to continue.
        let steps = 0;
        while (
          continueRun &&
          mounted.current &&
          ['draft', 'generating', 'approved'].includes(result.post.status) &&
          steps++ < 40
        ) {
          result = await creatorRequest<{ post: CreatorPost }>({
            action: 'process',
            id: result.post.id,
          });
          updatePost(result.post);
        }
        await load();
      } catch (error) {
        await load().catch(() => {});
        throw error;
      }
    });
  const saveProfile = (profile: PostProfile) =>
    void run(async () => {
      const validated = profileSchema.safeParse(profile.spec);
      if (!validated.success)
        throw new Error(validated.error.issues[0]?.message || 'Confira os campos do perfil.');
      if (demo)
        updateDemo({
          ...state,
          profiles: [...state.profiles.filter((p) => p.id !== profile.id), profile],
        });
      else {
        await creatorRequest({ action: 'profile', id: profile.id, spec: validated.data });
        await load();
      }
      setProfileEdit(null);
      setMessage('Perfil salvo.');
    });
  const selectedPost = state.posts.find((p) => p.id === selected);
  const posts = state.posts.filter((p) => !filter || p.profile_id === filter);
  const plannedPosts = state.posts
    .filter((p) => p.data.scheduledFor)
    .sort((a, b) => a.data.scheduledFor!.localeCompare(b.data.scheduledFor!));
  const activeSchedules = state.profiles.reduce(
    (n, p) => n + (p.spec.enabled ? p.spec.schedules.filter((s) => s.enabled).length : 0),
    plannedPosts.filter(
      (p) =>
        p.status === 'draft' &&
        state.profiles.find((profile) => profile.id === p.profile_id)?.spec.enabled,
    ).length,
  );
  const workerHealthy =
    state.worker.lastRun && Date.now() - new Date(state.worker.lastRun).getTime() < 10 * 60 * 1000;
  return (
    <div className="post-creator">
      <header className="post-hero">
        <div>
          <span className="eyebrow">DA IDEIA À PUBLICAÇÃO</span>
          <h1>
            Criador de posts<span>.</span>
          </h1>
          <p>
            Uma identidade para cada perfil.
            <br />
            Conteúdo criado, revisado e pronto para publicar.
          </p>
          <div className="post-actions">
            <span>
              <Sparkles size={14} />
              Criação com IA
            </span>
            <ArrowRight size={14} />
            <span>
              <Check size={14} />
              Revisores
            </span>
            <ArrowRight size={14} />
            <span>
              <Send size={14} />
              Seu Telegram
            </span>
          </div>
        </div>
        <div className="post-hero-art" aria-hidden="true">
          <div>
            <span>SEU CONTEÚDO</span>
            <strong>
              Ideias que
              <br />
              ganham forma.
            </strong>
            <i>✦</i>
            <small>POSTS · CARROSSÉIS · STORIES</small>
          </div>
        </div>
      </header>
      <div className="post-stats">
        <div>
          <span>PERFIS</span>
          <strong>{state.profiles.length}</strong>
        </div>
        <div>
          <span>AGUARDANDO VOCÊ</span>
          <strong>
            {
              state.posts.filter((p) => p.status === 'awaiting_approval' || p.status === 'changes')
                .length
            }
          </strong>
        </div>
        <div>
          <span>AGENDAS ATIVAS</span>
          <strong>{activeSchedules}</strong>
        </div>
        <div>
          <span>ENTREGUES</span>
          <strong>{state.posts.filter((p) => p.status === 'sent').length}</strong>
        </div>
      </div>
      <div className="post-toolbar">
        <nav aria-label="Seções do criador">
          {(
            [
              { id: 'posts', name: 'Publicações', icon: Image },
              { id: 'profiles', name: 'Perfis', icon: Users },
              { id: 'schedules', name: 'Agendas', icon: CalendarDays },
              { id: 'connections', name: 'Conexões', icon: Settings2 },
            ] as const
          ).map(({ id, name, icon: Icon }) => (
            <button
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(id)}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
        </nav>
        <button
          className="button primary"
          disabled={busy || loading}
          onClick={() => {
            if (!state.profiles.length || tab === 'profiles')
              setProfileEdit({
                id: crypto.randomUUID(),
                spec: defaultProfile(),
                created_at: new Date().toISOString(),
              });
            else {
              setProfileId(state.profiles[0].id);
              setCreating(true);
            }
          }}
        >
          <Plus size={16} />
          {!state.profiles.length || tab === 'profiles' ? 'Novo perfil' : 'Nova publicação'}
        </button>
      </div>
      {error && !profileEdit && !creating && !selectedPost && (
        <p className="post-alert" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="post-notice" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <p>Carregando perfis e publicações…</p>
      ) : (
        <>
          {demo && (
            <p className="post-notice">
              Você está na demonstração. Experimente perfis, agendas e rascunhos; as APIs e o
              Telegram funcionam na conta conectada.
            </p>
          )}
          {tab === 'posts' && (
            <>
              <div className="post-list-heading">
                <label className="field">
                  <span>Filtrar perfil de criação</span>
                  <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">Todos os perfis</option>
                    {state.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.spec.name}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="small muted">Últimas 100 publicações</span>
                <button className="button subtle" disabled={busy} onClick={() => void run(load)}>
                  <RefreshCw size={15} />
                  Atualizar fila
                </button>
              </div>
              {posts.length === 0 ? (
                <Empty
                  title="Sua próxima ideia começa aqui"
                  description="Cadastre um perfil com sua identidade e crie posts, carrosséis e sequências de stories."
                />
              ) : (
                <div className="post-card-grid">
                  {posts.map((post) => (
                    <button
                      className="post-card"
                      key={post.id}
                      onClick={() => setSelected(post.id)}
                    >
                      <div
                        className={`post-card-art ${post.data.format === 'Stories' ? 'story' : ''}`}
                      >
                        {post.data.slides[0]?.url ? (
                          <img src={post.data.slides[0].url} alt="" />
                        ) : (
                          <>
                            <span>{post.data.format.toUpperCase()}</span>
                            <Sparkles size={34} />
                            <strong>{post.data.title || post.data.brief}</strong>
                          </>
                        )}
                        <span className="post-card-count">
                          {post.data.slideCount} {post.data.slideCount === 1 ? 'tela' : 'telas'}
                        </span>
                      </div>
                      <div className="post-card-body">
                        <small>
                          {state.profiles.find((p) => p.id === post.profile_id)?.spec.name}
                        </small>
                        <h3>{post.data.title || post.data.brief}</h3>
                        <Pill tone={post.status === 'sent' ? 'green' : 'muted'}>
                          {post.data.materialNeeded
                            ? 'Aguardando material real'
                            : post.status === 'draft' && post.data.scheduledFor
                              ? 'Criação agendada'
                              : statusLabels[post.status]}
                        </Pill>
                        <span className="small muted">
                          v{post.data.version} ·{' '}
                          {new Date(post.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        {post.data.scheduledFor && (
                          <span className="small muted">{plannedLabel(post)}</span>
                        )}
                        {post.data.editorial?.pinned && (
                          <span className="small">
                            Fixado {post.data.editorial.week === 1 ? '· Vitrine do perfil' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {tab === 'profiles' && (
            <div className="post-profile-grid">
              {state.profiles.map((profile) => (
                <article className="post-profile-card" key={profile.id}>
                  <div className="section-heading">
                    <span className="post-avatar">
                      {profile.spec.name.slice(0, 2).toUpperCase()}
                    </span>
                    <Pill tone={profile.spec.enabled ? 'green' : 'muted'}>
                      {profile.spec.enabled ? 'Ativo' : 'Pausado'}
                    </Pill>
                  </div>
                  <h2>{profile.spec.name}</h2>
                  <p className="muted">{profile.spec.handle || 'Identidade própria'}</p>
                  <p>{profile.spec.audience}</p>
                  <div className="post-profile-meta">
                    <span>
                      {
                        state.posts.filter(
                          (p) => p.profile_id === profile.id && p.data.scheduledFor,
                        ).length
                      }{' '}
                      pautas com data definida
                    </span>
                    <span>
                      {profile.spec.approval === 'human'
                        ? 'Aprovação humana'
                        : 'Envio automático após revisores'}
                    </span>
                    <span>
                      {profile.spec.schedules.length} agendas ·{' '}
                      {state.feedback.filter((f) => f.profile_id === profile.id).length} orientações
                    </span>
                  </div>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setProfileEdit(profile)}
                  >
                    Editar perfil e agendas
                  </button>
                  <details>
                    <summary>Memória do perfil</summary>
                    {state.feedback.filter((f) => f.profile_id === profile.id).length ? (
                      state.feedback
                        .filter((f) => f.profile_id === profile.id)
                        .map((f) => (
                          <p className="post-memory" key={f.id}>
                            {f.instruction}
                          </p>
                        ))
                    ) : (
                      <p className="small muted">
                        As orientações das suas revisões aparecerão aqui.
                      </p>
                    )}
                  </details>
                </article>
              ))}
              {state.profiles.length === 0 && (
                <Empty
                  title="Uma voz para cada perfil"
                  description="Separe marcas, projetos e públicos com prompts e preferências independentes."
                />
              )}
            </div>
          )}
          {tab === 'schedules' && (
            <>
              <p className={`post-notice ${!workerHealthy ? 'post-notice-warn' : ''}`}>
                {workerHealthy
                  ? 'Worker ativo. A produção continua mesmo com o navegador fechado.'
                  : 'Automação ainda sem confirmação recente do worker. Configure o agendador no servidor para produzir com o navegador fechado.'}
                {state.worker.lastRun &&
                  ` Última execução: ${new Date(state.worker.lastRun).toLocaleString('pt-BR')}.`}
              </p>
              <p className="muted">
                O horário indica o início da criação. As artes ficam prontas após geração e
                revisões. Uma publicação por agenda em cada dia selecionado; pautas vencidas de dias
                anteriores não são acumuladas.
              </p>
              <div className="post-profile-grid">
                {plannedPosts.map((post) => (
                  <article className="post-profile-card" key={post.id}>
                    <Pill tone={post.status === 'sent' ? 'green' : 'muted'}>
                      {post.data.materialNeeded
                        ? 'Aguardando material real'
                        : post.status === 'draft'
                          ? 'Criação agendada'
                          : statusLabels[post.status]}
                    </Pill>
                    <h2>{plannedLabel(post)}</h2>
                    <strong>{post.data.title || post.data.brief.slice(0, 100)}</strong>
                    <p>
                      {state.profiles.find((p) => p.id === post.profile_id)?.spec.name} ·{' '}
                      {post.data.format} · {post.data.slideCount} telas
                    </p>
                    {post.data.editorial && (
                      <p>
                        Semana {post.data.editorial.week} · {post.data.editorial.pillar}
                        {post.data.editorial.pinned ? ' · Fixar no perfil' : ''}
                      </p>
                    )}
                    <button className="button secondary" onClick={() => setSelected(post.id)}>
                      Abrir pauta e agendamento
                    </button>
                  </article>
                ))}
                {state.profiles.flatMap((profile) =>
                  profile.spec.schedules.map((s) => (
                    <article className="post-profile-card" key={s.id}>
                      <Pill tone={s.enabled && profile.spec.enabled ? 'green' : 'muted'}>
                        {s.enabled && profile.spec.enabled ? 'Ativa' : 'Pausada'}
                      </Pill>
                      <h2>
                        {s.time} · {s.format}
                      </h2>
                      <strong>{profile.spec.name}</strong>
                      <p>
                        {s.days
                          .slice()
                          .sort()
                          .map((d) => days[d])
                          .join(' · ')}
                      </p>
                      <small className="muted">{s.timezone}</small>
                      <p>{s.brief}</p>
                      <button
                        className="button secondary"
                        disabled={busy}
                        onClick={() => setProfileEdit(profile)}
                      >
                        Editar agenda
                      </button>
                    </article>
                  )),
                )}
              </div>
              {!plannedPosts.length && !state.profiles.some((p) => p.spec.schedules.length) && (
                <Empty
                  title="Consistência, no seu ritmo"
                  description="Abra um perfil e adicione dias, horários e pautas para a criação automática."
                />
              )}
            </>
          )}
          {tab === 'connections' && (
            <div className="post-connections">
              <section className="post-profile-card">
                <span className="post-avatar">
                  <Send size={23} />
                </span>
                <h2>Entrega no Telegram</h2>
                <p>
                  Receba as artes em PNG na ordem certa e a legenda separada, pronta para copiar.
                </p>
                <Pill tone={state.connection.configured ? 'green' : 'muted'}>
                  {state.connection.configured ? 'Bot conectado' : 'Aguardando configuração'}
                </Pill>
                <form
                  className="post-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      if (demo)
                        throw new Error('Entre na sua conta para cadastrar o bot com segurança.');
                      await creatorRequest({
                        action: 'connection',
                        ...(token ? { token } : {}),
                        chatId: chat,
                      });
                      setToken('');
                      await load();
                      setMessage('Chat validado e conexão salva.');
                    });
                  }}
                >
                  <label className="field">
                    <span>Token do bot</span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder={
                        state.connection.configured
                          ? 'Deixe vazio para manter o token salvo'
                          : 'Token recebido do BotFather'
                      }
                      required={!state.connection.configured}
                    />
                  </label>
                  <Field
                    label="Chat de destino"
                    value={chat}
                    onChange={setChat}
                    required
                    placeholder="Seu chat ID ou @canal"
                  />
                  <p className="small muted">
                    Inicie a conversa com o bot ou adicione-o ao canal com permissão para enviar
                    arquivos. O token é cifrado no servidor e não aparece no backup.
                  </p>
                  <button className="button primary" disabled={busy}>
                    Validar chat e salvar conexão
                  </button>
                  {state.connection.configured && (
                    <button
                      type="button"
                      className="button subtle"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await creatorRequest({ action: 'disconnect' });
                          await load();
                          setMessage('Bot desconectado.');
                        })
                      }
                    >
                      Desconectar bot
                    </button>
                  )}
                </form>
              </section>
              <section className="post-profile-card">
                <span className="post-avatar">
                  <Sparkles size={23} />
                </span>
                <h2>IA e automações</h2>
                <p>
                  Os textos usam as conexões de IA já cadastradas no Vontta. As imagens usam a chave
                  OpenAI e o modelo definido em cada perfil.
                </p>
                <a href="#settings" className="button secondary">
                  Abrir conexões de IA
                </a>
                <h3>Três revisões obrigatórias</h3>
                <p>
                  Português, aderência editorial e leitura das imagens finais. Se uma etapa
                  reprovar, a publicação aguarda ajustes.
                </p>
                <h3>Produção com o app fechado</h3>
                <Pill tone={workerHealthy ? 'green' : 'muted'}>
                  {workerHealthy
                    ? 'Worker ativo'
                    : state.worker.configured
                      ? 'Aguardando execução do worker'
                      : 'Configuração de servidor pendente'}
                </Pill>
                <p className="small muted">
                  O administrador precisa ativar o worker e seu agendador. O status aparece na aba
                  Agendas.
                </p>
              </section>
            </div>
          )}
        </>
      )}
      {profileEdit && (
        <ProfileEditor
          key={profileEdit.id}
          profile={profileEdit}
          busy={busy}
          error={error}
          onClose={() => {
            setProfileEdit(null);
            setError('');
          }}
          onSave={saveProfile}
        />
      )}
      {creating && (
        <Modal title="Nova publicação" onClose={() => setCreating(false)}>
          <form
            className="post-form"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                let post: CreatorPost;
                if (demo) {
                  post = newPost(profileId, brief, format, count);
                  if (scheduledFor) post.data.scheduledFor = new Date(scheduledFor).toISOString();
                  updateDemo({ ...state, posts: [post, ...state.posts] });
                } else {
                  const result = await creatorRequest<{ post: CreatorPost }>({
                    action: 'create',
                    profileId,
                    brief,
                    format,
                    slides: count,
                    ...(scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
                  });
                  post = result.post;
                  await load();
                }
                setCreating(false);
                setBrief('');
                setSelected(post.id);
              });
            }}
          >
            {error && (
              <p className="post-alert" role="alert">
                {error}
              </p>
            )}
            <label className="field">
              <span>Perfil de criação</span>
              <select required value={profileId} onChange={(e) => setProfileId(e.target.value)}>
                {state.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.spec.name}
                    {!p.spec.enabled ? ' (pausado)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <div className="post-format-picker">
              {(['Post', 'Carrossel', 'Stories'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={format === f}
                  className={format === f ? 'active' : ''}
                  onClick={() => setFormat(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {format !== 'Post' && (
              <label className="field">
                <span>Quantidade de telas</span>
                <input
                  type="number"
                  required
                  min={1}
                  max={10}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                />
              </label>
            )}
            <Field
              label="Pauta e instruções da publicação"
              value={brief}
              onChange={setBrief}
              required
              area
              maxLength={null}
              placeholder="Qual é a ideia? Inclua objetivo, mensagem principal e detalhes que precisam aparecer."
            />
            <p className="small" role={brief.length > MAX_POST_BRIEF ? 'alert' : undefined}>
              {brief.length} / {MAX_POST_BRIEF} caracteres.{' '}
              {brief.length > MAX_POST_BRIEF
                ? 'Reduza o texto para criar. O conteúdo não foi cortado.'
                : 'O texto completo será preservado.'}
            </p>
            <label className="field">
              <span>Iniciar criação em (opcional, fuso do dispositivo)</span>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </label>
            <p className="small muted">
              Post e carrossel: 1080 × 1350. Stories: 1080 × 1920. A produção usa as APIs
              configuradas e pode consumir créditos.
            </p>
            <button className="button primary" disabled={busy || brief.length > MAX_POST_BRIEF}>
              Criar rascunho
            </button>
          </form>
        </Modal>
      )}
      {selectedPost && (
        <PostDetail
          key={selectedPost.id}
          post={selectedPost}
          profile={state.profiles.find((p) => p.id === selectedPost.profile_id)}
          busy={busy}
          demo={demo}
          error={error}
          onClose={() => {
            setSelected(null);
            setError('');
          }}
          action={action}
        />
      )}
    </div>
  );
}
