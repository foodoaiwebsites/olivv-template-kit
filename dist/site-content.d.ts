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
    version: number;
}
export interface FetchOpts {
    /** Builder preview mode — fetches the unpublished draft doc. */
    draft?: boolean;
    /** Required when `draft` is true. */
    previewToken?: string;
    /** ISR revalidate window in seconds for published reads. Default 300. */
    revalidate?: number;
}
/** The tag busted by the revalidate route: `content:<clientId>`. */
export declare function contentTag(clientId: string): string;
/**
 * Fetch the site-content doc for a client.
 *
 * - Published: `GET {CONTENT_API_URL}/site-content/{clientId}` with `x-api-key`,
 *   ISR-cached and tagged `content:<clientId>` so publish can revalidate it.
 * - Draft: `GET {CONTENT_API_URL}/builder/sites/{clientId}/draft` with a bearer
 *   preview token, never cached.
 */
export declare function fetchSiteContent(clientId: string, opts?: FetchOpts): Promise<SiteContentDoc>;
