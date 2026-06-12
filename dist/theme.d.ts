/**
 * Theme token helpers: render the doc's theme map as `:root{...}` CSS vars,
 * plus the HSL-channels ↔ hex converters shared by builder and templates
 * (theme tokens use the `"h s% l%"` channel format from theme.css).
 */
import { type ReactElement } from "react";
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
