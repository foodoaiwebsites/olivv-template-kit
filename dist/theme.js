/**
 * Theme token helpers: render the doc's theme map as `:root{...}` CSS vars,
 * plus the HSL-channels ↔ hex converters shared by builder and templates
 * (theme tokens use the `"h s% l%"` channel format from theme.css).
 */
import { createElement } from "react";
/**
 * `{ "--primary": "24 95% 53%", accent: "#fff" }` → `:root{--primary:24 95% 53%;--accent:#fff}`.
 * Tokens are trusted platform data, but both names AND values are stripped of
 * `;{}` so a value can never escape the `:root{}` block and inject arbitrary CSS
 * rules, and `<`/`>` are stripped so a token can never close the surrounding
 * `<style>` tag. No valid CSS custom-property value for this token format
 * (`"h s% l%"` channels or hex) needs any of these characters. Names are also
 * prefixed with `--` when missing.
 */
export function themeStyleVars(tokens) {
    const decls = Object.entries(tokens).map(([rawName, rawValue]) => {
        const name = rawName.replace(/[;{}]/g, "");
        const varName = name.startsWith("--") ? name : `--${name}`;
        const value = rawValue.replace(/[<>;{}]/g, "");
        return `${varName}:${value}`;
    });
    return `:root{${decls.join(";")}}`;
}
/** Server-safe `<style>` element injecting the theme tokens. Render it in the layout `<head>`. */
export function ThemeStyle({ tokens }) {
    return createElement("style", {
        dangerouslySetInnerHTML: { __html: themeStyleVars(tokens) },
    });
}
/** Hex (#rrggbb) -> "h s% l%" channels, matching theme.css format. */
export function hexToHslChannels(hex) {
    const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!m || !m[1])
        return null;
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
        if (h < 0)
            h += 360;
    }
    const round = (n) => Math.round(n * 100) / 100;
    return `${round(h)} ${round(s * 100)}% ${round(l * 100)}%`;
}
/** "h s% l%" channels -> hex (#rrggbb); null if the value isn't channel-formatted. */
export function hslChannelsToHex(value) {
    const m = value.trim().match(/^(-?\d*\.?\d+)\s+(-?\d*\.?\d+)%\s+(-?\d*\.?\d+)%$/);
    if (!m || !m[1] || !m[2] || !m[3])
        return null;
    const h = parseFloat(m[1]);
    const s = parseFloat(m[2]) / 100;
    const l = parseFloat(m[3]) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const mm = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60)
        [r, g, b] = [c, x, 0];
    else if (h < 120)
        [r, g, b] = [x, c, 0];
    else if (h < 180)
        [r, g, b] = [0, c, x];
    else if (h < 240)
        [r, g, b] = [0, x, c];
    else if (h < 300)
        [r, g, b] = [x, 0, c];
    else
        [r, g, b] = [c, 0, x];
    const to = (n) => Math.round((n + mm) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`;
}
