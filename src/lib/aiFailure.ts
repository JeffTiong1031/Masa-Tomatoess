export type AiFailure = 'quota' | 'unconfigured' | 'failed';

const BY_STATUS: Record<number, AiFailure> = {
  429: 'quota',
  503: 'unconfigured',
};

export function aiFailureForStatus(status: number): AiFailure {
  return BY_STATUS[status] ?? 'failed';
}

export function isRateLimited(error: unknown): boolean {
  return (error as { status?: number } | null | undefined)?.status === 429;
}

const ESTIMATE_MESSAGE: Record<AiFailure, string> = {
  quota: 'Photo saved. No calorie readings left for today — open the day to type it in.',
  unconfigured: 'Photo saved. The calorie reader is not switched on yet.',
  failed: 'Photo saved. Open the day to add what it was.',
};

const REVIEW_MESSAGE: Record<AiFailure, string> = {
  quota: 'No AI readings left for today. Try the review again tomorrow.',
  unconfigured: 'The weekly review is not switched on yet.',
  failed: 'Could not read your week. Try again in a moment.',
};

const RETRY_MESSAGE: Record<AiFailure, string> = {
  quota: 'No calorie readings left for today. Tap the caption to type it in.',
  unconfigured: 'The calorie reader is not switched on yet. Tap the caption to type it in.',
  failed: 'Could not read that photo. Tap the caption to type it in.',
};

export function estimateFailureMessage(failure: AiFailure): string {
  return ESTIMATE_MESSAGE[failure];
}

export function retryFailureMessage(failure: AiFailure): string {
  return RETRY_MESSAGE[failure];
}

export function reviewFailureMessage(failure: AiFailure): string {
  return REVIEW_MESSAGE[failure];
}
