import { cacheFetch, cacheDelete } from '@/lib/cache';

async function request(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const message = json?.error || 'Request failed';
    throw new Error(message);
  }

  return json;
}

type GetOptions = { ttl?: number };

export const api = {
  get: <T = any>(path: string, options?: GetOptions) => {
    if (!options?.ttl) return request(path) as Promise<T>;
    return cacheFetch<T>(path, () => request(path), options.ttl);
  },
  post: (path: string, body?: unknown) => {
    const cleaner = mutationCleaner(path);
    return request(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((res) => {
      cleaner();
      return res;
    });
  },
  put: (path: string, body?: unknown) => {
    const cleaner = mutationCleaner(path);
    return request(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((res) => {
      cleaner();
      return res;
    });
  },
  del: (path: string, body?: unknown) => {
    const cleaner = mutationCleaner(path);
    return request(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then((res) => {
      cleaner();
      return res;
    });
  },
};

function mutationCleaner(path: string): () => void {
  if (path.startsWith('/api/products')) return () => cacheDelete('/api/products');
  if (path.startsWith('/api/customers')) {
    return () => {
      cacheDelete('/api/customers');
      cacheDelete('/api/utang/balances');
    };
  }
  if (path.startsWith('/api/utang')) {
    return () => {
      cacheDelete('/api/utang');
      cacheDelete('/api/utang/balances');
    };
  }
  return () => {};
}