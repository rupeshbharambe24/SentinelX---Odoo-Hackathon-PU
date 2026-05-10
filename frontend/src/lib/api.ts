/**
 * Thin fetch wrapper around the Traveloop FastAPI backend.
 *
 * - Reads VITE_API_URL at build time (defaults to localhost:8000)
 * - Injects the bearer JWT from localStorage on every request
 * - Throws ApiError with status + parsed body on non-2xx responses
 * - Supports typed responses via generics
 */

const TOKEN_KEY = "traveloop.access_token";

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public body?: unknown,
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOpts {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  // For multipart uploads — pass FormData, will skip JSON-encoding.
  formData?: FormData;
  // Skip auth header (e.g. for /auth/login).
  anon?: boolean;
}

export async function api<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, query, formData, anon = false } = opts;

  // Build URL with query string
  let url = `${API_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const headers: Record<string, string> = {};
  if (!formData) headers["Content-Type"] = "application/json";

  if (!anon) {
    const t = getToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }

  const init: RequestInit = { method, headers };
  if (formData) init.body = formData;
  else if (body !== undefined) init.body = JSON.stringify(body);

  const resp = await fetch(url, init);

  // 204 No Content (DELETE etc.) — return undefined
  if (resp.status === 204) return undefined as T;

  const text = await resp.text();
  let parsed: unknown = undefined;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!resp.ok) {
    const detail =
      (parsed && typeof parsed === "object" && "detail" in parsed
        ? String((parsed as { detail: unknown }).detail)
        : undefined) ?? `HTTP ${resp.status}`;
    if (resp.status === 401) clearToken();
    throw new ApiError(resp.status, detail, parsed);
  }

  return parsed as T;
}
