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

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: unknown) =>
    request(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  put: (path: string, body?: unknown) =>
    request(path, { method: 'PUT', body: body === undefined ? undefined : JSON.stringify(body) }),
  del: (path: string, body?: unknown) =>
    request(path, { method: 'DELETE', body: body === undefined ? undefined : JSON.stringify(body) }),
};