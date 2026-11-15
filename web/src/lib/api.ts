import { busyEnd, busyStart } from './busy'
/* Thin fetch wrapper. Errors always carry a friendly message; raw server text is never shown. */
export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code }
}

const FRIENDLY = 'Something went wrong. Please check your connection and try again.'

/* quiet: background refreshes do not spin the logo. */
export async function api<T = unknown>(method: string, path: string, body?: unknown, quiet = false): Promise<T> {
  if (quiet) return call<T>(method, path, body)
  busyStart()
  try { return await call<T>(method, path, body) } finally { busyEnd() }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, { method, headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' })
  } catch {
    throw new ApiError(0, 'ERR-NET-0', 'We could not reach the server. Check your internet connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data?.code ?? 'ERR-UNK', data?.message ?? FRIENDLY)
  return data as T
}

export const get = <T,>(p: string) => api<T>('GET', p)
export const post = <T = { ok: true }>(p: string, b: unknown = {}) => api<T>('POST', p, b)
export const put = <T = { ok: true }>(p: string, b: unknown) => api<T>('PUT', p, b)
export const patch = <T = { ok: true }>(p: string, b: unknown) => api<T>('PATCH', p, b)
export const del = <T = { ok: true }>(p: string) => api<T>('DELETE', p)
export const errText = (e: unknown) => (e instanceof ApiError ? e.message : FRIENDLY)
