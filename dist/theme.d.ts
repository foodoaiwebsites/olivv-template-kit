/**
 * Theme token helpers: render the doc's theme map as `:root{...}` CSS vars,
 * plus the HSL-channels ↔ hex converters shared by builder and templates
 * (theme tokens use the `"h s% l%"` channel format from theme.css).
 */
import { type ReactElement } from "react";
import type { ThemeTokenSpec } from "./template-schema";
/**
 * `{ "--primary": "24 95% 53%", accent: "#fff" }` → `:root{--primary:24 95% 53%;--accent:#fff}`.
 * Tokens are trusted platform data, but both names AND values are stripped of
 * `;{}` so a value can never escape the `:root{}` block and inject arbitrary CSS
 * rules, and `<`/`>` are stripped so a token can never close the surrounding
 * `<style>` tag. No valid CSS custom-property value for this token format
 * (`"h s% l%"` channels or hex) needs any of these characters. Names are also
 * prefixed with `--` when missing.
 */
export declare function themeStyleVars(tokens: Record<string, string>): string;
/** Server-safe `<style>` element injecting the theme tokens. Render it in the layout `<head>`. */
export declare function ThemeStyle({ tokens }: {
    tokens: Record<string, string>;
}): ReactElement;
/** Hex (#rrggbb) -> "h s% l%" channels, matching theme.css format. */
export declare function hexToHslChannels(hex: string): string | null;
/** "h s% l%" channels -> hex (#rrggbb); null if the value isn't channel-formatted. */
export declare function hslChannelsToHex(value: string): string | null;
/** Color token key → Tailwind class stem (the part after `bg-`/`text-`/`border-`). */
export declare function colorTokenStem(key: string): string;
/** Font token key → Tailwind `fontFamily` name (the part after `font-`). */
export declare function fontTokenName(key: string): string;
/**
 * Tailwind v3 `colors` fragment derived from the token specs:
 * `{ "<stem>": "hsl(var(--<key>))" }` for every `color` token. Spread it into
 * `theme.extend.colors` (template-specific overrides spread AFTER win):
 *   colors: { ...tailwindColorsFromTokens(THEME_TOKENS), ...overrides }
 */
export declare function tailwindColorsFromTokens(tokens: ThemeTokenSpec[]): Record<string, string>;
/**
 * Tailwind v3 `fontFamily` fragment derived from the token specs:
 * `{ heading: ["var(--font-heading)", ...fallback] }` for every `font` token.
 * `fallback` is appended to every slot; pass a different stack per slot by
 * post-merging if a template needs serif vs sans fallbacks.
 */
export declare function tailwindFontsFromTokens(tokens: ThemeTokenSpec[], fallback?: string[]): Record<string, string[]>;
/**
 * Tailwind v4 `@theme` body deriving the same utilities for CSS-first templates.
 * Colors → `--color-<stem>: hsl(var(--<key>))`; fonts → `--font-<name>: var(--<key>)`.
 *
 * MUST live in an `@theme inline { … }` block: `inline` makes Tailwind emit the
 * value INTO each utility (e.g. `.bg-primary{background:hsl(var(--primary))}`)
 * instead of indirecting through a `--color-*` root var — which is what lets the
 * utilities track the runtime-injected `--<key>` tokens, and what makes the
 * self-referential font line (`--font-heading: var(--font-heading)`) safe.
 *
 * @param opts.wrap  false → return only the declarations (caller supplies the
 *                   surrounding `@theme inline { … }`). Default true → full block.
 */
export declare function cssThemeFromTokens(tokens: ThemeTokenSpec[], opts?: {
    wrap?: boolean;
}): string;
