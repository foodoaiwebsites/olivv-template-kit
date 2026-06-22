/**
 * Standard OLIVV theme defaults — the canonical `FONT_OPTIONS` + `THEME_TOKENS`
 * + `THEME_PRESETS` block every template historically inlined (~700 lines, 15
 * presets). Centralized here so a template's `template-schema.ts` can
 * `import { OLIVV_THEME_TOKENS, OLIVV_THEME_PRESETS } from "@olivv/template-kit"`
 * instead of duplicating the data.
 *
 * FONT CONTRACT: the defaults reference the standard OLIVV font set
 * (`--font-oswald/-roboto/-playfair/-italiana/-saint`), which a template must
 * register via `next/font` in `app/layout.tsx`. To use different fonts or a
 * different brand primary, import these and override the relevant tokens/preset
 * values rather than re-inlining the whole block.
 *
 * Preset token values mirror the hardcoded `.theme-<key>` palettes in a
 * template's `src/styles/theme.css`; the DB stores only the chosen preset KEY.
 */
import type { ThemeTokenSpec, ThemePreset } from "./template-schema";
/** The standard OLIVV registered-font set, offered for every `font` token. */
export declare const OLIVV_FONT_OPTIONS: {
    value: string;
    label: string;
}[];
/** The standard OLIVV editable theme tokens (palette, shape, typography, surfaces). */
export declare const OLIVV_THEME_TOKENS: ThemeTokenSpec[];
/**
 * The 15 standard OLIVV theme presets — `base` (the build-shipped default),
 * the alternative brand palettes, and the seasonal campaign looks
 * (`seasonal: true`). Token values are extracted verbatim from each
 * `.theme-<key>` class's override block (keys without the leading `--`).
 */
export declare const OLIVV_THEME_PRESETS: ThemePreset[];
