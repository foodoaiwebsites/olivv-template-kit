/**
 * Tiny in-page agent that lets the Olivv Builder live-edit a template site even
 * when it's loaded cross-origin (e.g. the deployed URL inside the builder
 * iframe).
 *
 * It is DORMANT for normal visitors: it only attaches when the page is embedded
 * in an iframe AND opened with `?__edit=1` (the builder adds that param). Edits
 * are visual-only in the viewer's own browser; nothing is persisted here —
 * persistence happens via the builder saving to the draft doc + Publish.
 *
 * Messages handled (all `{ __builder: true, type, ... }`):
 * - `setText  { prev, next }`  — replace the first visible text node matching `prev`
 * - `setImage { prev, next }`  — swap the first img/video/source whose src matches `prev`
 * - `setVar   { name, value }` — set a CSS custom property on <body>
 * - `setField { path, value }` — precise targeting via `[data-field="<path>"]`;
 *   sets textContent (or `src` for IMG/VIDEO/SOURCE) and dispatches a
 *   `builder:field-updated` CustomEvent so templates can re-run animations.
 *
 * Origin locking: pass `allowedOrigin` (e.g. `"https://builder.olivv.app"`) to
 * accept messages only from that origin and target `__builderReady` at it. When
 * the prop is omitted, `NEXT_PUBLIC_BUILDER_ORIGIN` (inlined at build time) is
 * used as the default; if neither is set, the agent falls back to accepting any
 * origin (legacy behavior — set one of the two in production).
 */
export default function BuilderAgent({ allowedOrigin }?: {
    allowedOrigin?: string;
}): null;
