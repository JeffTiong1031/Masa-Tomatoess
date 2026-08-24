import { describe, expect, it } from 'vitest';
import {
  aiFailureForStatus,
  estimateFailureMessage,
  isRateLimited,
  retryFailureMessage,
  reviewFailureMessage,
} from './aiFailure';

describe('isRateLimited', () => {
  it('recognises the shape the Gemini SDK throws when the day runs out', () => {
    expect(isRateLimited({ name: 'RateLimitError', status: 429 })).toBe(true);
  });

  it('leaves other errors alone', () => {
    expect(isRateLimited({ status: 500 })).toBe(false);
    expect(isRateLimited(new Error('socket hang up'))).toBe(false);
  });

  it('survives an error that is not an object at all', () => {
    expect(isRateLimited(null)).toBe(false);
    expect(isRateLimited(undefined)).toBe(false);
    expect(isRateLimited('boom')).toBe(false);
  });
});

describe('aiFailureForStatus', () => {
  it('reads 429 as the daily quota running out', () => {
    expect(aiFailureForStatus(429)).toBe('quota');
  });

  it('reads 503 as the estimator having no key', () => {
    expect(aiFailureForStatus(503)).toBe('unconfigured');
  });

  it('treats every other failure as an ordinary one', () => {
    expect(aiFailureForStatus(502)).toBe('failed');
    expect(aiFailureForStatus(400)).toBe('failed');
    expect(aiFailureForStatus(500)).toBe('failed');
  });
});

describe('estimateFailureMessage', () => {
  it('says the day is out of readings rather than blaming the photo', () => {
    const message = estimateFailureMessage('quota');
    expect(message).toContain('today');
    expect(message).not.toContain('Could not estimate');
  });

  it('promises the photo is kept whatever went wrong', () => {
    expect(estimateFailureMessage('quota')).toContain('saved');
    expect(estimateFailureMessage('unconfigured')).toContain('saved');
    expect(estimateFailureMessage('failed')).toContain('saved');
  });

  it('gives each failure its own wording', () => {
    const all = new Set([
      estimateFailureMessage('quota'),
      estimateFailureMessage('unconfigured'),
      estimateFailureMessage('failed'),
    ]);
    expect(all.size).toBe(3);
  });
});

describe('retryFailureMessage', () => {
  it('stops blaming the photo when the day is simply out of readings', () => {
    expect(retryFailureMessage('quota')).not.toContain('Could not read that photo');
    expect(retryFailureMessage('quota')).toContain('today');
  });

  it('still offers the way forward whatever went wrong', () => {
    expect(retryFailureMessage('quota')).toContain('type it in');
    expect(retryFailureMessage('unconfigured')).toContain('type it in');
    expect(retryFailureMessage('failed')).toContain('type it in');
  });
});

describe('reviewFailureMessage', () => {
  it('points at tomorrow when the quota is gone', () => {
    expect(reviewFailureMessage('quota')).toContain('tomorrow');
  });

  it('gives each failure its own wording', () => {
    const all = new Set([
      reviewFailureMessage('quota'),
      reviewFailureMessage('unconfigured'),
      reviewFailureMessage('failed'),
    ]);
    expect(all.size).toBe(3);
  });
});
