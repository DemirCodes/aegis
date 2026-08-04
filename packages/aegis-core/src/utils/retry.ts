import { delay } from './common-helpers.js';

export async function retry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delay?: number;
    backoffStrategy?: 'exponential' | 'linear' | 'none';
  },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.delay ?? 1000;
  const strategy = options?.backoffStrategy ?? 'exponential';

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxRetries) throw lastError;

      const waitTime =
        strategy === 'exponential'
          ? baseDelay * Math.pow(2, attempt - 1)
          : strategy === 'linear'
            ? baseDelay * attempt
            : baseDelay;

      await delay(waitTime);
    }
  }

  throw lastError!;
}