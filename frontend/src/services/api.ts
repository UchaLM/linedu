import { API_URL } from '../config/api';

// Alto a propósito: el plan gratuito del hosting se duerme y la primera petición puede tardar ~1 minuto.
const REQUEST_TIMEOUT_MS = 45000;

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** fetch contra el backend: agrega el token, aplica timeout y siempre lanza ApiError con un mensaje legible. */
export async function apiFetch<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const timedOut = (error as Error).name === 'AbortError';
    throw new ApiError(
      timedOut ? 'The server took too long to answer.' : 'Cannot reach the server. Check your connection.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    // respuesta sin JSON: se maneja abajo según el status
  }

  if (!response.ok) {
    throw new ApiError(data?.error ?? data?.message ?? `Request failed (${response.status}).`, response.status);
  }
  return data as T;
}
