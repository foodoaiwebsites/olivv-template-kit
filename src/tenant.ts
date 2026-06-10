/**
 * Tenant resolution: Host header → clientId, plus a composable middleware
 * wrapper that forwards the resolved clientId as the `x-client-id` request
 * header so layouts/pages can read it via `headers()`.
 */
import { NextResponse, type NextRequest } from "next/server";

/** Request header carrying the resolved tenant id. */
export const CLIENT_ID_HEADER = "x-client-id";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  clientId: string | null;
  expiresAt: number;
}

/** Module-level resolve cache (per server instance), 60s TTL. */
const resolveCache = new Map<string, CacheEntry>();

/**
 * Resolve a Host header value to a clientId.
 *
 * - Strips the port, lowercases.
 * - `DEV_CLIENT_ID` env (if set) short-circuits everything — local dev fallback.
 * - Otherwise asks the Content API: `GET /site-content/resolve?host=<host>`.
 * - Results (including misses) are cached for 60s.
 */
export async function clientIdFromHost(host: string): Promise<string | null> {
  const devClientId = process.env.DEV_CLIENT_ID;
  if (devClientId) return devClientId;

  const normalized = host.split(":")[0]?.trim().toLowerCase() ?? "";
  if (!normalized) return null;

  const cached = resolveCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) return cached.clientId;

  const clientId = await resolveViaApi(normalized);
  resolveCache.set(normalized, { clientId, expiresAt: Date.now() + CACHE_TTL_MS });
  return clientId;
}

async function resolveViaApi(host: string): Promise<string | null> {
  const baseUrl = process.env.CONTENT_API_URL;
  const apiKey = process.env.CONTENT_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "@olivv/template-kit: CONTENT_API_URL and CONTENT_API_KEY must be set to resolve tenants " +
        "(or set DEV_CLIENT_ID for local dev).",
    );
  }
  try {
    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/site-content/resolve?host=${encodeURIComponent(host)}`,
      { headers: { "x-api-key": apiKey }, cache: "no-store" },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { clientId?: unknown };
    return typeof body.clientId === "string" && body.clientId ? body.clientId : null;
  } catch {
    return null; // network failure → unresolved, not a crash in middleware
  }
}

export type MiddlewareHandler = (
  req: NextRequest,
) => Response | undefined | void | Promise<Response | undefined | void>;

/**
 * Composable middleware wrapper. Resolves the tenant from the request Host and
 * forwards it as the `x-client-id` REQUEST header (the
 * `NextResponse.next({ request })` rewrite mechanism), then runs the template's
 * own middleware (if any) — it composes, it does not replace.
 *
 * ```ts
 * // middleware.ts — template with existing logic
 * export const middleware = withTenantResolution((req) => {
 *   // existing geo/redirect logic; return a Response or nothing
 * });
 * ```
 */
export function withTenantResolution(handler?: MiddlewareHandler) {
  return async function middleware(req: NextRequest): Promise<Response> {
    const clientId = await clientIdFromHost(req.headers.get("host") ?? "");
    // Mutate the incoming NextRequest headers so the wrapped handler (and the
    // default pass-through below) sees the resolved tenant.
    if (clientId) req.headers.set(CLIENT_ID_HEADER, clientId);

    const inner = handler ? await handler(req) : undefined;
    const res = inner ?? NextResponse.next({ request: { headers: req.headers } });
    if (clientId) forwardRequestHeader(res, req.headers, CLIENT_ID_HEADER, clientId);
    return res;
  };
}

/**
 * Ensure `name: value` is part of the request-header override set Next reads
 * from a middleware response (`x-middleware-override-headers` +
 * `x-middleware-request-*` — the encoding `NextResponse.next({ request })`
 * uses). When the inner handler returned a plain response with no override set,
 * we must list ALL request headers (Next deletes any header not listed).
 */
function forwardRequestHeader(
  res: Response,
  reqHeaders: Headers,
  name: string,
  value: string,
): void {
  const existing = res.headers.get("x-middleware-override-headers");
  if (existing === null) {
    const keys: string[] = [];
    reqHeaders.forEach((v, k) => {
      keys.push(k);
      res.headers.set(`x-middleware-request-${k}`, v);
    });
    res.headers.set("x-middleware-override-headers", keys.join(","));
    return;
  }
  const keys = existing.split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.includes(name)) keys.push(name);
  res.headers.set("x-middleware-override-headers", keys.join(","));
  res.headers.set(`x-middleware-request-${name}`, value);
}
