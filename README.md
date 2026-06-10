# @olivv/template-kit

The shared kit that turns a standalone Next.js restaurant template (like
`olivv-nur-web` or `vu-lounge`) into a **multi-tenant builder template**: one
deployment serves any number of clients, content is fetched at runtime from the
platform Content API, live-editable in the Olivv Builder, and published via tag
revalidation — never a rebuild.

The kit owns the **invariants** (tenant resolution, content fetching, theming,
live-edit agent, publish revalidation, geo shim, manifest contract). It owns
**no content schema, no section components, no styling** — those stay in each
template.

This is the packaged form of the contract files described in
[`TEMPLATE-CONVERSION.md`](../TEMPLATE-CONVERSION.md) (steps 2–5).

## Install

```bash
pnpm add @olivv/template-kit
```

v0 ships **TypeScript source** (no build step — the simplest thing that
type-checks). Your template compiles it; add the package to
`transpilePackages` in `next.config.js`:

```js
const config = {
  output: "standalone",
  transpilePackages: ["@olivv/template-kit"],
};
```

Requires `next >= 14 < 16` and `react >= 18` (peer dependencies).

## Environment

| Var | Where | Purpose |
| --- | --- | --- |
| `CONTENT_API_URL` | server-only | Base URL of the platform Content API |
| `CONTENT_API_KEY` | server-only — **NEVER `NEXT_PUBLIC_`** | API key for published reads + host resolution |
| `REVALIDATE_HMAC_KEY` | server-only | Shared secret verifying `POST /api/revalidate` |
| `TEMPLATE_ID` | server-only | This template's id (matches `template.manifest.json`) |
| `DEV_CLIENT_ID` | dev only | Skip host resolution locally — every request resolves to this client |

## Wire a template in 6 imports

Mirrors TEMPLATE-CONVERSION.md steps 2–5. The six imports:
`withTenantResolution`, `fetchSiteContent`, `ThemeStyle`, `ContentProvider`,
`useContent`, `createRevalidateRoute` (plus `BuilderAgent`, exported from the
same barrel).

### 1. Middleware — tenant resolution (composes with what you have)

```ts
// src/middleware.ts
import { type NextRequest, NextResponse } from "next/server";
import { withTenantResolution, getGeo } from "@olivv/template-kit";

// Existing logic (e.g. olivv-nur-web's geo cookies) stays — wrap it, don't replace it.
export const middleware = withTenantResolution((req: NextRequest) => {
  const res = NextResponse.next();
  const geo = getGeo(req); // never req.geo directly — the kit shims Vercel/Cloudflare
  if (geo.country) res.cookies.set("geo-country", geo.country, { path: "/", maxAge: 3600 });
  return res;
});

export const config = {
  // Keep the matcher cheap: skip API, Next internals, static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

No existing middleware (vu-lounge)? `export const middleware = withTenantResolution();`

The resolved tenant is forwarded as the `x-client-id` request header.

### 2. Layout — fetch once, theme, provider

```tsx
// src/app/layout.tsx
import { headers } from "next/headers";
import { fetchSiteContent, ThemeStyle, ContentProvider, BuilderAgent } from "@olivv/template-kit";
import type { BrandText } from "@/content/types"; // the template's own shape

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const clientId = headers().get("x-client-id") ?? "";
  const doc = await fetchSiteContent(clientId); // ISR, tagged content:<clientId>
  const content = doc.content.en as BrandText;  // pick locale as your template does

  return (
    <html lang="en">
      <head>
        <ThemeStyle tokens={doc.theme} /> {/* :root{--primary:...} from the doc */}
      </head>
      <body>
        <ContentProvider
          value={{ content, theme: doc.theme, clientId, restaurantId: doc.restaurantId }}
        >
          {children}
        </ContentProvider>
        <BuilderAgent /> {/* dormant unless iframed with ?__edit=1 */}
      </body>
    </html>
  );
}
```

`generateMetadata()` reads `doc.content[locale].seo` the same way (call
`fetchSiteContent` again — it's request-deduped by Next).

Draft preview (builder): `fetchSiteContent(clientId, { draft: true, previewToken })`.

### 3. Server components — fetch; client components — useContent

```tsx
// server component
const doc = await fetchSiteContent(clientId);

// client component ("use client") — same BrandText shape, zero fetching
import { useContent } from "@olivv/template-kit";
const { content, restaurantId } = useContent<BrandText>();
```

Bind operational data (menu/orders) to `restaurantId` from the provider — not
`NEXT_PUBLIC_RESTAURANT_ID`.

### 4. Annotate editable elements

Every leaf field in your `src/content/schema.ts` that maps to a visible element
gets a `data-field` so the builder's `setField` message can target it precisely:

```tsx
<h1 data-field="hero.headline">{content.hero.headline}</h1>
```

Animations that measure text (GSAP/SplitType): re-run on the
`builder:field-updated` CustomEvent the agent dispatches
(`detail: { path, value }`).

### 5. Revalidate route — publish without rebuild

```ts
// src/app/api/revalidate/route.ts
import { createRevalidateRoute } from "@olivv/template-kit";

export const POST = createRevalidateRoute({
  hmacKey: process.env.REVALIDATE_HMAC_KEY ?? "",
});
```

The platform POSTs `{ "clientId": "..." }` with `x-signature: <hex
HMAC-SHA256(body)>`; the route busts the `content:<clientId>` tag. Invalid
signature → 401, malformed body → 400.

### 6. Manifest

```ts
// template.manifest.json validated in CI by verify-template; in code:
import { defineTemplateManifest } from "@olivv/template-kit";

export default defineTemplateManifest({
  templateId: "vu-lounge",
  version: "1.0.0",
  schemaVersion: 1,
  displayName: "VU Lounge",
  engines: { next: "14.x" },
});
```

## verify-template CLI

Conformance gate (TEMPLATE-CONVERSION.md step 10). From the template repo root:

```bash
npx verify-template
```

Fails (non-zero exit) on: missing/invalid `template.manifest.json`, missing
`src/content/schema.ts`, `NEXT_PUBLIC_THEME` / `NEXT_PUBLIC_RESTAURANT_ID`
anywhere under `src/`, or any direct `req.geo` use under `src/` (use `getGeo`).
Warns if `next.config` lacks `output: 'standalone'`.

## Public API

From `@olivv/template-kit`:

- `fetchSiteContent(clientId, opts?)`, `contentTag(clientId)`, `SiteContentDoc`, `FetchOpts` — server-only Content API client
- `clientIdFromHost(host)`, `withTenantResolution(handler?)`, `CLIENT_ID_HEADER` — tenant resolution
- `ContentProvider<T>`, `useContent<T>()`, `ContentValue<T>` — generic content context (client)
- `BuilderAgent` — live-edit agent (client; dormant outside the builder)
- `createRevalidateRoute({ hmacKey })`, `verifyHmacSignature(body, sig, key)` — publish revalidation
- `themeStyleVars(tokens)`, `ThemeStyle`, `hexToHslChannels`, `hslChannelsToHex` — theming
- `getGeo(req)` — provider-agnostic geo shim
- `defineTemplateManifest(m)`, `KIT_SCHEMA_VERSION`, `TemplateManifest` — manifest contract

Notes:

- `site-content.ts` is **server-only** (reads `CONTENT_API_KEY`). The kit does
  not import the `server-only` package (kept dependency-light); a runtime guard
  throws if it ever runs in a browser. Add `import "server-only"` at your import
  site if your template already uses it.
- Client entries are also exposed as subpaths if you prefer not to touch the
  barrel from client code: `@olivv/template-kit/builder-agent`,
  `@olivv/template-kit/content-provider`.
