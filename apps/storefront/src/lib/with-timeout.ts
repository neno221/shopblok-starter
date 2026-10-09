/** A read that never answers (a host gone silent) must not hold every caller forever. */
export function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer after ${ms / 1000} s`)), ms);
  });
  return Promise.race([work, expired]).finally(() => clearTimeout(timer));
}
