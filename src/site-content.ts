/**
 * Server-only Content API client.
 *
 * SERVER-ONLY: this module reads `CONTENT_API_KEY` and must never be imported
 * from a client component. We intentionally do not depend on the `server-only`
 * package (to keep the kit dependency-light); instead a runtime guard throws if
 * the fetch is ever invoked in a browser. If your template already depends on
 * `server-only`, feel free to add `import "server-only"` at your import site.
 */

export interface SiteContentDoc {
  clientId: string;
  templateId: string;
  domain?: string;
  restaurantId?: string;
  locales: string[];
  /** Content keyed by locale, e.g. `{ en: {...}, ar: {...} }`. */
  content: Record<string, unknown>;
  /** Theme tokens, e.g. `{ "--primary": "24 95% 53%" }`. */
  theme: Record<string, string>;
  /** Flat config for the 4 managed app pages (order, booking, giftcard, ar-menu). */
  featurePages?: FeaturePagesContent;
  version: number;
}

/**
 * Flat config for the managed app pages served by the content API.
 * Boolean flags toggle each app; the `*DefaultSlug`/`*DefaultURL` fields carry
 * the route and the (templated) external URL. URL templates may contain
 * `{slug}`, `{restaurantId}` (or the legacy `{resturantId}` typo).
 */
export interface FeaturePagesContent {
  onlineOrder: boolean;
  tableBookingOptions: boolean;
  giftCardOptions: boolean;
  tableOrder: boolean;
  onlineOrderDefaultSlug: string;
  bookingDefaultSlug: string;
  giftcardDefaultSlug: string;
  arMenuDefaultSlug: string;
  onlineOrderDefaultURL: string;
  bookingDefaultURL: string;
  giftcardDefaultURL: string;
  arMenuDefaultURL: string;
  slug: string;
  tenantId: string;
}

/** Resolve a feature-page URL template, substituting `{slug}` and `{restaurantId}`. */
export function resolveFeaturePageUrl(template: string, vars: { slug: string; tenantId: string }): string {
  return template
    .replaceAll("{slug}", vars.slug)
    .replaceAll("{restaurantId}", vars.tenantId)
    .replaceAll("{resturantId}", vars.tenantId);
}

export type FeaturePageEntry = {
  appKey: "order" | "booking" | "giftcard" | "ar-menu";
  enabledKey: "onlineOrder" | "tableBookingOptions" | "giftCardOptions" | "tableOrder";
  label: string;
  enabled: boolean;
  slug: string;
  url: string;
  chrome: boolean;
  inNav: boolean;
};

/** Expand the flat `featurePages` config into ordered, resolved per-app entries. */
export function featurePageEntries(fp: FeaturePagesContent): FeaturePageEntry[] {
  const r = (t: string) => resolveFeaturePageUrl(t, { slug: fp.slug, tenantId: fp.tenantId });
  return [
    { appKey: "order",    enabledKey: "onlineOrder",         label: "Online Ordering", enabled: fp.onlineOrder,         slug: fp.onlineOrderDefaultSlug, url: r(fp.onlineOrderDefaultURL), chrome: true,  inNav: true },
    { appKey: "booking",  enabledKey: "tableBookingOptions", label: "Table Booking",   enabled: fp.tableBookingOptions, slug: fp.bookingDefaultSlug,     url: r(fp.bookingDefaultURL),     chrome: true,  inNav: true },
    { appKey: "giftcard", enabledKey: "giftCardOptions",     label: "Giftcard",        enabled: fp.giftCardOptions,     slug: fp.giftcardDefaultSlug,    url: r(fp.giftcardDefaultURL),    chrome: true,  inNav: true },
    { appKey: "ar-menu",  enabledKey: "tableOrder",          label: "AR Menu",         enabled: fp.tableOrder,          slug: fp.arMenuDefaultSlug,      url: r(fp.arMenuDefaultURL),      chrome: false, inNav: false },
  ];
}

export interface FetchOpts {
  /** Builder preview mode — fetches the unpublished draft doc. */
  draft?: boolean;
  /** Required when `draft` is true. */
  previewToken?: string;
  /** ISR revalidate window in seconds for published reads. Default 300. */
  revalidate?: number;
}

const DEFAULT_REVALIDATE_SECONDS = 300;

function requireEnv(name: "CONTENT_API_URL" | "CONTENT_API_KEY"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `@olivv/template-kit: missing required env var ${name}. ` +
        `Set it in the deployment environment (server-only — never NEXT_PUBLIC_).`,
    );
  }
  return value;
}

/** The tag busted by the revalidate route: `content:<clientId>`. */
export function contentTag(clientId: string): string {
  return `content:${clientId}`;
}

/**
 * Fetch the site-content doc for a client.
 *
 * - Published: `GET {CONTENT_API_URL}/site-content/{clientId}` with `x-api-key`,
 *   ISR-cached and tagged `content:<clientId>` so publish can revalidate it.
 * - Draft: `GET {CONTENT_API_URL}/builder/sites/{clientId}/draft` with a bearer
 *   preview token, never cached.
 */
export async function fetchSiteContent(
  clientId: string,
  opts: FetchOpts = {},
): Promise<SiteContentDoc> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@olivv/template-kit: fetchSiteContent is server-only and must not run in the browser.",
    );
  }
  const baseUrl = requireEnv("CONTENT_API_URL").replace(/\/$/, "");

  let res: Response;
  if (opts.draft) {
    if (!opts.previewToken) {
      throw new Error("@olivv/template-kit: previewToken is required when draft is true.");
    }
    res = await fetch(`${baseUrl}/builder/sites/${encodeURIComponent(clientId)}/draft`, {
      headers: { Authorization: `Bearer ${opts.previewToken}` },
      cache: "no-store",
    });
  } else {
    const apiKey = requireEnv("CONTENT_API_KEY");
    const init: RequestInit & {
      next: { revalidate: number; tags: string[] };
    } = {
      headers: { "x-api-key": apiKey },
      next: {
        revalidate: opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
        tags: [contentTag(clientId)],
      },
    };
    res = await fetch(`${baseUrl}/site-content/${encodeURIComponent(clientId)}`, init);
  }

  if (!res.ok) {
    throw new Error(
      `@olivv/template-kit: content fetch for client "${clientId}" failed with status ${res.status}.`,
    );
  }
  return assertSiteContentDoc(await res.json(), clientId);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Minimal runtime shape check for the content response (deliberately
 * dependency-free — this is the template hot path, no zod here).
 */
function assertSiteContentDoc(json: unknown, clientId: string): SiteContentDoc {
  const problems: string[] = [];
  if (!isRecord(json)) {
    problems.push("response body is not an object");
  } else {
    if (typeof json.clientId !== "string") problems.push("clientId is not a string");
    if (!isRecord(json.content)) problems.push("content is not an object");
    if (!isRecord(json.theme)) problems.push("theme is not an object");
    if (typeof json.version !== "number") problems.push("version is not a number");
  }
  if (problems.length > 0) {
    throw new Error(
      `@olivv/template-kit: malformed content doc for client "${clientId}": ${problems.join("; ")}.`,
    );
  }
  return json as SiteContentDoc;
}
