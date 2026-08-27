
export async function runWithConcurrency<T>(
  items: T[],
  asyncFn: (item: T) => Promise<void>,
  concurrency = 8
): Promise<void> {
  const queue = [...items];
  const running = new Set<Promise<void>>();

  while (queue.length > 0 || running.size > 0) {
    while (running.size < concurrency && queue.length > 0) {
      const item = queue.shift()!;
      const promise = asyncFn(item).finally(() => running.delete(promise));
      running.add(promise);
    }

    if (running.size > 0) {
      await Promise.race(running);
    }
  }
}