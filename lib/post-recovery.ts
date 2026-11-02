import type { CreatorPost } from './post-creator.js';

export const retryDelays = [60_000, 300_000, 900_000, 3_600_000];
export const MAX_CORRECTIONS = 3;
export function recoveryDue(post: Pick<CreatorPost, 'status' | 'data'>, now = Date.now()) {
  const at =
    post.status === 'failed'
      ? post.data.retry?.nextAt
      : post.status === 'changes' && post.data.autoCorrection?.pending
        ? post.data.autoCorrection.nextAt
        : undefined;
  return Boolean(at && Number.isFinite(Date.parse(at)) && Date.parse(at) <= now);
}
export function nextRetry(
  attempts: number,
  status: number,
  code: string,
  now = Date.now(),
): NonNullable<CreatorPost['data']['retry']> {
  const retryable =
    ![
      'provider_billing',
      'provider_key_invalid',
      'provider_access_denied',
      'provider_model_unavailable',
      'provider_workspace_required',
    ].includes(code) && [429, 500, 502, 503, 504, 529].includes(status);
  return {
    attempts: attempts + 1,
    code,
    ...(retryable && attempts < retryDelays.length
      ? { nextAt: new Date(now + retryDelays[attempts]).toISOString() }
      : {}),
  };
}
