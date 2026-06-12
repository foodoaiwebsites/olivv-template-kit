/**
 * Provider-agnostic geo shim. The ONLY allowed reader of `req.geo` in a
 * converted template — never call `req.geo` (Vercel-only) directly elsewhere.
 */
export interface GeoInfo {
    country?: string;
    region?: string;
    city?: string;
}
export interface GeoRequest {
    /** Vercel edge runtime populates this on NextRequest. */
    geo?: {
        country?: string;
        region?: string;
        city?: string;
    };
    headers: Headers;
}
/**
 * Resolution order:
 * 1. `req.geo` — Vercel + Next ≤14 (removed from NextRequest in Next 15).
 * 2. `x-vercel-ip-country` / `x-vercel-ip-country-region` / `x-vercel-ip-city`
 *    — Vercel headers, the only source on Vercel + Next 15.
 * 3. `cf-ipcountry` / `cf-region` / `cf-ipcity` — Cloudflare headers.
 * 4. `{}` (e.g. local dev).
 */
export declare function getGeo(req: GeoRequest): GeoInfo;
