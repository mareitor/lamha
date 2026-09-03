// Shared fetch wrapper. VITE_API_BASE_URL points at the deployed Worker
// (set as a Netlify env var); falls back to the wrangler dev default for
// local development against `wrangler dev` on port 8787.
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8787";

// Branding logo URLs are stored as Worker-relative paths (e.g.
// "/api/demo/:id/logo") since the Worker doesn't know its own public
// deployed URL at record-creation time. The Worker and the Netlify site
// are different origins, so any <img src> use of that path MUST go
// through this to become absolute — otherwise the browser resolves it
// against the frontend's own origin and 404s.
export function resolveApiUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path; // already absolute
  return `${API_BASE_URL}${path}`;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    const message =
      typeof body === "object" && body && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed with status ${status}`;
    super(message);
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown; // JSON-serializable, or FormData for file uploads
  adminPassword?: string;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, adminPassword } = options;
  const headers: Record<string, string> = {};
  if (adminPassword) {
    headers.Authorization = `Bearer ${adminPassword}`;
  }

  let requestBody: BodyInit | undefined;
  if (body instanceof FormData) {
    requestBody = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: requestBody,
  });

  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    throw new ApiError(res.status, payload);
  }
  return payload as T;
}
