/**
 * Theme token helpers: render the doc's theme map as `:root{...}` CSS vars,
 * plus the HSL-channels ↔ hex converters shared by builder and templates
 * (theme tokens use the `"h s% l%"` channel format from theme.css).
 */
import { createElement, type ReactElement } from "react";
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
export function themeStyleVars(tokens: Record<string, string>): string {
  const decls = Object.entries(tokens).map(([rawName, rawValue]) => {
    const name = rawName.replace(/[;{}]/g, "");
    const varName = name.startsWith("--") ? name : `--${name}`;
    const value = rawValue.replace(/[<>;{}]/g, "");
    return `${varName}:${value}`;
  });
  return `:root{${decls.join(";")}}`;
}

/** Server-safe `<style>` element injecting the theme tokens. Render it in the layout `<head>`. */
export function ThemeStyle({ tokens }: { tokens: Record<string, string> }): ReactElement {
  return createElement("style", {
    dangerouslySetInnerHTML: { __html: themeStyleVars(tokens) },
  });
}

/** Hex (#rrggbb) -> "h s% l%" channels, matching theme.css format. */
export function hexToHslChannels(hex: string): string | null {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m || !m[1]) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}

/** "h s% l%" channels -> hex (#rrggbb); null if the value isn't channel-formatted. */
export function hslChannelsToHex(value: string): string | null {
  const m = value.trim().match(/^(-?\d*\.?\d+)\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%$/);
  if (!m || !m[1] || !m[2] || !m[3]) return null;
  const h = parseFloat(m[1]);
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + mm) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/* ----------------------------------------------------------------------------
 * Tailwind bridge generators — derive the utility wiring FROM `THEME_TOKENS`
 * so a template never hand-maintains (and silently drifts from) the token list.
 *
 * Contract: color token values are HSL channel triplets ("h s% l%"), so every
 * color utility MUST wrap them as `hsl(var(--<key>))`. Font tokens pass through
 * as `var(--<key>)`. `text`-type tokens (e.g. `radius`) are not utilities here.
 *
 * Class naming is the token key VERBATIM, except the semantic text colors, which
 * map to the `fg` namespace so they don't collide with Tailwind's own `text-*`
 * utilities (or the existing `muted` color):
 *   text                -> fg                  (bg-fg     / text-fg)
 *   text-heading        -> fg-heading          (text-fg-heading)
 *   btn-primary         -> btn-primary         (bg-btn-primary)
 *   btn-primary-hover   -> btn-primary-hover   (hover:bg-btn-primary-hover)
 *   primary-foreground  -> primary-foreground  (text-primary-foreground)
 *   font-heading        -> heading             (font-heading)
 *
 * The same stem feeds both emitters, so v3 (JS config) and v4 (`@theme`) produce
 * an IDENTICAL utility surface for a given token list.
 * ------------------------------------------------------------------------- */

/** Color token key → Tailwind class stem (the part after `bg-`/`text-`/`border-`). */
export function colorTokenStem(key: string): string {
  if (key === "text") return "fg";
  if (key.startsWith("text-")) return `fg-${key.slice("text-".length)}`;
  return key;
}

/** Font token key → Tailwind `fontFamily` name (the part after `font-`). */
export function fontTokenName(key: string): string {
  return key.startsWith("font-") ? key.slice("font-".length) : key;
}

/**
 * Tailwind v3 `colors` fragment derived from the token specs:
 * `{ "<stem>": "hsl(var(--<key>))" }` for every `color` token. Spread it into
 * `theme.extend.colors` (template-specific overrides spread AFTER win):
 *   colors: { ...tailwindColorsFromTokens(THEME_TOKENS), ...overrides }
 */
export function tailwindColorsFromTokens(tokens: ThemeTokenSpec[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    if (t.type !== "color") continue;
    out[colorTokenStem(t.key)] = `hsl(var(--${t.key}))`;
  }
  return out;
}

/**
 * Tailwind v3 `fontFamily` fragment derived from the token specs:
 * `{ heading: ["var(--font-heading)", ...fallback] }` for every `font` token.
 * `fallback` is appended to every slot; pass a different stack per slot by
 * post-merging if a template needs serif vs sans fallbacks.
 */
export function tailwindFontsFromTokens(
  tokens: ThemeTokenSpec[],
  fallback: string[] = ["sans-serif"],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const t of tokens) {
    if (t.type !== "font") continue;
    out[fontTokenName(t.key)] = [`var(--${t.key})`, ...fallback];
  }
  return out;
}

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
export function cssThemeFromTokens(
  tokens: ThemeTokenSpec[],
  opts: { wrap?: boolean } = {},
): string {
  const lines: string[] = [];
  for (const t of tokens) {
    if (t.type === "color") {
      lines.push(`  --color-${colorTokenStem(t.key)}: hsl(var(--${t.key}));`);
    } else if (t.type === "font") {
      lines.push(`  --font-${fontTokenName(t.key)}: var(--${t.key});`);
    }
  }
  const body = lines.join("\n");
  return opts.wrap === false ? body : `@theme inline {\n${body}\n}`;
}
