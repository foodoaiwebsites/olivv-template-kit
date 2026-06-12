/**
 * Template SCHEMA CONTRACT (v2).
 *
 * A template is the unit of variation in the multi-tenant platform: each one
 * declares its OWN pages, global (site-wide) content, theme tokens, media
 * slots and variations — because templates are completely different from one
 * another. This module is the contract every template's `src/template-schema.ts`
 * implements, and the shape the platform's template-registry stores.
 *
 * - `defineTemplateSchema()` validates the declaration's basic invariants at
 *   module-evaluation (build) time — fail loud, like `defineTemplateManifest`.
 * - `toRegistryManifest()` converts the declaration into the plain-JSON
 *   REGISTRY MANIFEST the platform persists (zod schemas → JSON-Schema). The
 *   kit keeps zod-to-json-schema out of its dependency graph: the template
 *   supplies its own converter (it already depends on `zod-to-json-schema`).
 */
import type { ZodTypeAny } from "zod";
/** Highest template-schema version this kit release understands. */
export declare const TEMPLATE_SCHEMA_VERSION = 2;
/**
 * One editable design token (CSS custom property, written WITHOUT the leading
 * `--`). `color` values are raw HSL channels (e.g. "2.31 50% 40%") to match
 * Tailwind's `hsl(var(--token))`; `font` values point at a registered
 * next/font variable (e.g. "var(--font-playfair)"); `text` is any raw CSS
 * value (e.g. a radius).
 */
export type ThemeTokenSpec = {
    key: string;
    type: "color" | "font" | "text";
    label: string;
    /** Build-shipped default (from the template's theme.css), if any. */
    default?: string;
    /** Closed set of allowed values (e.g. the registered font variables). */
    options?: {
        value: string;
        label: string;
    }[];
};
/** One logical media slot the template renders (keyed like "hero.video"). */
export type MediaSlotSpec = {
    key: string;
    type: "image" | "video";
    label: string;
};
/** One look/layout variation a template offers (always at least "default"). */
export type VariationSpec = {
    key: string;
    label: string;
};
/**
 * One named theme preset the template ships HARDCODED (a `.theme-<key>` class
 * in its theme.css): a bundle of token overrides selectable as a whole.
 * Seasonal presets (`seasonal: true`) are campaign looks (christmas, eid, …)
 * meant to be applied temporarily. The DB stores only the client's chosen
 * preset key — never the token values, which live in the template build.
 */
export type ThemePreset = {
    key: string;
    label: string;
    seasonal?: boolean;
    /** Token overrides, keyed like ThemeTokenSpec.key (no leading `--`). */
    tokens: Record<string, string>;
};
/** One page the template ships, with its editable section content schema. */
export interface PageSpec<S extends ZodTypeAny = ZodTypeAny> {
    /** Stable identifier, e.g. "home", "about-us". */
    slug: string;
    /** Human label for the builder UI. */
    label: string;
    /** Route path, e.g. "/", "/about-us". */
    path: string;
    /** Whether a tenant may remove this page (the home page never is). */
    removable: boolean;
    /** Whether the page gets its own SEO fields in the builder. */
    seo: boolean;
    /** Zod object describing this page's editable section content. */
    sections: S;
    /**
     * Hardcoded layout variants per SECTION of this page, keyed by the section
     * key in `sections` (e.g. "hero"). This is the PRIMARY variation mechanism:
     * each section may ship alternate hardcoded layouts, and the DB stores only
     * the client's chosen variant key per section. The top-level `variations`
     * remains for optional site-wide looks.
     */
    variants?: Record<string, VariationSpec[]>;
}
/** A template's complete v2 declaration. */
export interface TemplateSchemaV2 {
    templateId: string;
    schemaVersion: 2;
    /** Supported locales, e.g. ["en", "ar"]. First entry is the default. */
    locales: string[];
    /** Site-wide brand content + default SEO (zod object). */
    global: ZodTypeAny;
    theme: {
        tokens: ThemeTokenSpec[];
        presets?: ThemePreset[];
    };
    media: {
        slots: MediaSlotSpec[];
    };
    variations: VariationSpec[];
    pages: PageSpec[];
}
/** JSON-safe page entry as stored in the registry. */
export interface RegistryManifestPage {
    slug: string;
    label: string;
    path: string;
    removable: boolean;
    seo: boolean;
    /** JSON-Schema of the page's section content. */
    sections: object;
    /** Hardcoded per-section layout variants, when the page declares any. */
    variants?: Record<string, VariationSpec[]>;
}
/** The plain-JSON REGISTRY MANIFEST the platform stores per template. */
export interface TemplateRegistryManifest {
    templateId: string;
    schemaVersion: 2;
    locales: string[];
    /** JSON-Schema of the site-wide global content. */
    global: object;
    theme: {
        tokens: ThemeTokenSpec[];
        presets?: ThemePreset[];
    };
    media: MediaSlotSpec[];
    variations: VariationSpec[];
    pages: RegistryManifestPage[];
}
/**
 * Validate a template's v2 declaration and return it unchanged. Throws a
 * single aggregated Error listing every violated invariant, so a bad
 * declaration fails the template's build immediately and completely.
 */
export declare function defineTemplateSchema(s: TemplateSchemaV2): TemplateSchemaV2;
/**
 * Produce the REGISTRY MANIFEST (plain JSON) the platform stores for this
 * template. `zodToJson` is the template's own converter — typically
 * `(schema) => zodToJsonSchema(schema, { $refStrategy: "none" })` — so the kit
 * never has to depend on a specific zod-to-json-schema version.
 */
export declare function toRegistryManifest(s: TemplateSchemaV2, zodToJson: (schema: ZodTypeAny) => object): TemplateRegistryManifest;
