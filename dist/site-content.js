/**
 * Server-only Content API client.
 *
 * SERVER-ONLY: this module reads `CONTENT_API_KEY` and must never be imported
 * from a client component. We intentionally do not depend on the `server-only`
 * package (to keep the kit dependency-light); instead a runtime guard throws if
 * the fetch is ever invoked in a browser. If your template already depends on
 * `server-only`, feel free to add `import "server-only"` at your import site.
 */
const DEFAULT_REVALIDATE_SECONDS = 300;
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`@olivv/template-kit: missing required env var ${name}. ` +
            `Set it in the deployment environment (server-only — never NEXT_PUBLIC_).`);
    }
    return value;
}
/** The tag busted by the revalidate route: `content:<clientId>`. */
export function contentTag(clientId) {
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
export async function fetchSiteContent(clientId, opts = {}) {
    if (typeof window !== "undefined") {
        throw new Error("@olivv/template-kit: fetchSiteContent is server-only and must not run in the browser.");
    }
    const baseUrl = requireEnv("CONTENT_API_URL").replace(/\/$/, "");
    let res;
    if (opts.draft) {
        if (!opts.previewToken) {
            throw new Error("@olivv/template-kit: previewToken is required when draft is true.");
        }
        res = await fetch(`${baseUrl}/builder/sites/${encodeURIComponent(clientId)}/draft`, {
            headers: { Authorization: `Bearer ${opts.previewToken}` },
            cache: "no-store",
        });
    }
    else {
        const apiKey = requireEnv("CONTENT_API_KEY");
        const init = {
            headers: { "x-api-key": apiKey },
            next: {
                revalidate: opts.revalidate ?? DEFAULT_REVALIDATE_SECONDS,
                tags: [contentTag(clientId)],
            },
        };
        res = await fetch(`${baseUrl}/site-content/${encodeURIComponent(clientId)}`, init);
    }
    if (!res.ok) {
        throw new Error(`@olivv/template-kit: content fetch for client "${clientId}" failed with status ${res.status}.`);
    }
    return assertSiteContentDoc(await res.json(), clientId);
}
function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
/**
 * Minimal runtime shape check for the content response (deliberately
 * dependency-free — this is the template hot path, no zod here).
 */
function assertSiteContentDoc(json, clientId) {
    const problems = [];
    if (!isRecord(json)) {
        problems.push("response body is not an object");
    }
    else {
        if (typeof json.clientId !== "string")
            problems.push("clientId is not a string");
        if (!isRecord(json.content))
            problems.push("content is not an object");
        if (!isRecord(json.theme))
            problems.push("theme is not an object");
        if (typeof json.version !== "number")
            problems.push("version is not a number");
    }
    if (problems.length > 0) {
        throw new Error(`@olivv/template-kit: malformed content doc for client "${clientId}": ${problems.join("; ")}.`);
    }
    return json;
}
