import { z } from 'zod';

export const postFormat = z.enum(['Post', 'Carrossel', 'Stories']);
export const MAX_POST_BRIEF = 30000;
export const reviewerNames = ['Português', 'Editorial', 'Visual'] as const;
export const scheduleSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean(),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z
    .string()
    .max(80)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, 'Fuso horário inválido'),
  format: postFormat,
  slides: z.number().int().min(1).max(10),
  brief: z.string().trim().min(1).max(MAX_POST_BRIEF),
});
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    handle: z.string().trim().max(100),
    audience: z.string().trim().min(1).max(2000),
    voice: z.string().trim().min(1).max(2000),
    goals: z.string().max(2000),
    preferences: z.string().max(4000),
    textPrompt: z.string().max(6000),
    imagePrompt: z.string().max(6000),
    reviewPrompt: z.string().max(4000),
    textProvider: z.enum(['auto', 'openai', 'anthropic', 'google']),
    reviewProvider: z.enum(['auto', 'openai', 'anthropic', 'google']),
    imageProvider: z.literal('openai'),
    renderMode: z.enum(['generated', 'editorial']).default('generated'),
    imageModel: z.string().trim().max(150),
    approval: z.enum(['human', 'automatic']),
    enabled: z.boolean(),
    schedules: z.array(scheduleSchema).max(10),
  })
  .superRefine((spec, ctx) => {
    if (spec.renderMode === 'generated' && !spec.imageModel)
      ctx.addIssue({
        code: 'custom',
        path: ['imageModel'],
        message: 'Informe o modelo de imagem para o modo OpenAI.',
      });
  });
export type ProfileSpec = z.infer<typeof profileSchema>;
export type PostProfile = { id: string; spec: ProfileSpec; created_at: string };
export type PostSlide = {
  heading: string;
  body: string;
  imagePrompt: string;
  asset?: string;
  url?: string;
  photo?: { id: string; author: string; source: string; license: string; alt: string };
  layout?: {
    font: string;
    headingWeight: number;
    bodyWeight: number;
    headingSize: number;
    bodySize: number;
  };
};
export type PostReview = {
  reviewer: (typeof reviewerNames)[number];
  approved: boolean;
  notes: string;
  at: string;
};
export type PostStatus =
  | 'draft'
  | 'generating'
  | 'changes'
  | 'awaiting_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'delivery_unknown';
export interface CreatorPost {
  id: string;
  profile_id: string;
  created_at: string;
  status: PostStatus;
  data: {
    brief: string;
    format: z.infer<typeof postFormat>;
    slideCount: number;
    title?: string;
    caption?: string;
    slides: PostSlide[];
    reviews: PostReview[];
    stage: 'text' | 'text_review' | 'images' | 'review' | 'done';
    error?: string;
    version: number;
    scheduledFor?: string;
    materialNeeded?: string;
    evidence?: string;
    editorial?: {
      cycle: string;
      week: number;
      originalFormat: string;
      pinned: boolean;
      pillar: string;
      stories: string;
    };
    approvedAt?: string;
    approvedBy?: 'human' | 'automatic';
    delivery: { index: number; captionSent: boolean; messageIds: number[] };
  };
}
export const statusLabels: Record<PostStatus, string> = {
  draft: 'Rascunho',
  generating: 'Em produção',
  changes: 'Revisão solicitada',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  sending: 'Enviando',
  sent: 'Entregue no Telegram',
  failed: 'Falha na produção',
  delivery_unknown: 'Conferir entrega',
};
export const defaultProfile = (): ProfileSpec => ({
  name: '',
  handle: '',
  audience: '',
  voice: 'Claro, próximo e objetivo.',
  goals: '',
  preferences: '',
  textPrompt: '',
  imagePrompt: '',
  reviewPrompt: '',
  textProvider: 'auto',
  reviewProvider: 'auto',
  imageProvider: 'openai',
  renderMode: 'generated',
  imageModel: '',
  approval: 'human',
  enabled: true,
  schedules: [],
});
export function newPost(
  profileId: string,
  brief: string,
  format: z.infer<typeof postFormat>,
  count: number,
): CreatorPost {
  return {
    id: crypto.randomUUID(),
    profile_id: profileId,
    created_at: new Date().toISOString(),
    status: 'draft',
    data: {
      brief,
      format,
      slideCount: format === 'Post' ? 1 : count,
      slides: [],
      reviews: [],
      stage: 'text',
      version: 1,
      delivery: { index: 0, captionSent: false, messageIds: [] },
    },
  };
}
export function allReviewsPassed(post: CreatorPost) {
  return (
    reviewerNames.every((name) =>
      post.data.reviews.some((r) => r.reviewer === name && r.approved),
    ) &&
    post.data.slides.length === post.data.slideCount &&
    post.data.slides.every((s) => Boolean(s.asset))
  );
}
export function isPostDue(post: CreatorPost, now = new Date()) {
  return !post.data.scheduledFor || new Date(post.data.scheduledFor).getTime() <= now.getTime();
}
export function plannedLabel(post: CreatorPost) {
  return post.data.scheduledFor
    ? new Date(post.data.scheduledFor).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' · Brasília'
    : '';
}
export function scheduleSlot(schedule: z.infer<typeof scheduleSchema>, now = new Date()) {
  if (!schedule.enabled) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: schedule.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (key: string) => parts.find((p) => p.type === key)?.value || '';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return schedule.days.includes(weekday) && `${get('hour')}:${get('minute')}` >= schedule.time
    ? `${schedule.id}:${date}`
    : null;
}
