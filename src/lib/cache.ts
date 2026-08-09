type Entry<T> = { value: T; expires: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number) {
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function cacheDelete(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function cacheFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs: number): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) return cached;

  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fetcher()
    .then((value) => {
      cacheSet(key, value, ttlMs);
      return value;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, promise);
  return promise;
}