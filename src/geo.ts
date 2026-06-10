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
  geo?: { country?: string; region?: string; city?: string };
  headers: Headers;
}

/**
 * Prefer Vercel's `req.geo`; fall back to Cloudflare headers
 * (`cf-ipcountry` / `cf-region` / `cf-ipcity`); else `{}` (e.g. local dev).
 */
export function getGeo(req: GeoRequest): GeoInfo {
  const geo = req.geo;
  if (geo && (geo.country || geo.region || geo.city)) {
    return { country: geo.country, region: geo.region, city: geo.city };
  }
  const country = req.headers.get("cf-ipcountry") ?? undefined;
  const region = req.headers.get("cf-region") ?? undefined;
  const city = req.headers.get("cf-ipcity") ?? undefined;
  if (country || region || city) return { country, region, city };
  return {};
}
