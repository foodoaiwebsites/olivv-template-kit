/**
 * Tenant resolution: Host header → clientId, plus a composable middleware
 * wrapper that forwards the resolved clientId as the `x-client-id` request
 * header so layouts/pages can read it via `headers()`.
 */
import { type NextRequest } from "next/server";
/** Request header carrying the resolved tenant id. */
export declare const CLIENT_ID_HEADER = "x-client-id";
/**
 * Resolve a Host header value to a clientId.
 *
 * - Strips the port, lowercases.
 * - `DEV_CLIENT_ID` env (if set) short-circuits everything — local dev fallback,
 *   ignored when `NODE_ENV === "production"` so a stray prod env var can't
 *   collapse every host to one client.
 * - Otherwise asks the Content API: `GET /site-content/resolve?host=<host>`.
 * - Results (including misses) are cached for 60s (capped at 1000 entries).
 */
export declare function clientIdFromHost(host: string): Promise<string | null>;
export type MiddlewareHandler = (req: NextRequest) => Response | undefined | void | Promise<Response | undefined | void>;
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
export declare function withTenantResolution(handler?: MiddlewareHandler): (req: NextRequest) => Promise<Response>;
