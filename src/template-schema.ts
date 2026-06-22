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
export const TEMPLATE_SCHEMA_VERSION = 2;

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
  options?: { value: string; label: string }[];
};

/** One logical media slot the template renders (keyed like "hero.video"). */
export type MediaSlotSpec = {
  key: string;
  type: "image" | "video";
  label: string;
  /**
   * Build-shipped default URL, if any. Surfaced in the registry manifest so the
   * builder's Media panel can preview the template default for an unfilled slot
   * (mirrors `ThemeTokenSpec.default`). "" / undefined → render the empty state.
   */
  default?: string;
  /**
   * Page slug this slot belongs to (matches a `pages[].slug`). Lets the builder
   * scope the Media panel per page, like sections/variants. Omitted → site-wide
   * (e.g. logo, favicon, og.image), shown on every page.
   */
  page?: string;
  /**
   * Human-readable section the slot belongs to (e.g. "Hero", "About"). Lets the
   * builder group slots section-by-section within a page, like the Variation
   * panel groups variants. Omitted → ungrouped / site-wide.
   */
  section?: string;
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
  theme: { tokens: ThemeTokenSpec[]; presets?: ThemePreset[] };
  media: { slots: MediaSlotSpec[] };
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
  theme: { tokens: ThemeTokenSpec[]; presets?: ThemePreset[] };
  media: MediaSlotSpec[];
  variations: VariationSpec[];
  pages: RegistryManifestPage[];
}

function uniqueViolations(label: string, keys: string[], out: string[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) out.push(`duplicate ${label} "${key}"`);
    seen.add(key);
  }
}

/**
 * Best-effort introspection of a zod OBJECT schema's top-level keys (duck-typed
 * on zod v3's `_def` so the kit never depends on a zod runtime). Returns null
 * when the schema is not a plain ZodObject (then section-key checks are
 * skipped — best-effort by design).
 */
function zodObjectKeys(schema: ZodTypeAny): string[] | null {
  const def = (schema as unknown as { _def?: { typeName?: unknown; shape?: unknown } })._def;
  if (!def || def.typeName !== "ZodObject") return null;
  const shape =
    typeof def.shape === "function"
      ? (def.shape as () => Record<string, unknown>)()
      : def.shape;
  if (!shape || typeof shape !== "object") return null;
  return Object.keys(shape);
}

/**
 * Validate a template's v2 declaration and return it unchanged. Throws a
 * single aggregated Error listing every violated invariant, so a bad
 * declaration fails the template's build immediately and completely.
 */
export function defineTemplateSchema(s: TemplateSchemaV2): TemplateSchemaV2 {
  const problems: string[] = [];

  if (!s.templateId || typeof s.templateId !== "string") {
    problems.push("templateId must be a non-empty string");
  }
  if (s.schemaVersion !== 2) {
    problems.push(`schemaVersion must be 2 (got ${String(s.schemaVersion)})`);
  }
  if (!Array.isArray(s.locales) || s.locales.length === 0) {
    problems.push("locales must be a non-empty array");
  } else {
    uniqueViolations("locale", s.locales, problems);
  }

  uniqueViolations(
    "theme token key",
    s.theme.tokens.map((t) => t.key),
    problems,
  );
  uniqueViolations(
    "media slot key",
    s.media.slots.map((m) => m.key),
    problems,
  );

  if (s.theme.presets !== undefined) {
    for (const preset of s.theme.presets) {
      if (!preset.key || typeof preset.key !== "string") {
        problems.push("theme preset keys must be non-empty strings");
      }
    }
    uniqueViolations(
      "theme preset key",
      s.theme.presets.map((p) => p.key),
      problems,
    );
  }

  if (s.variations.length === 0) {
    problems.push('variations must contain at least one entry (e.g. "default")');
  }
  uniqueViolations(
    "variation key",
    s.variations.map((v) => v.key),
    problems,
  );

  if (s.pages.length === 0) {
    problems.push("pages must contain at least one entry");
  } else {
    uniqueViolations(
      "page slug",
      s.pages.map((p) => p.slug),
      problems,
    );
    uniqueViolations(
      "page path",
      s.pages.map((p) => p.path),
      problems,
    );
    for (const page of s.pages) {
      if (!page.path.startsWith("/")) {
        problems.push(`page "${page.slug}" path must start with "/" (got "${page.path}")`);
      }
      if (page.variants !== undefined) {
        const sectionKeys = zodObjectKeys(page.sections);
        for (const [sectionKey, variantList] of Object.entries(page.variants)) {
          if (sectionKeys !== null && !sectionKeys.includes(sectionKey)) {
            problems.push(
              `page "${page.slug}" variants reference unknown section "${sectionKey}"`,
            );
          }
          if (!Array.isArray(variantList) || variantList.length === 0) {
            problems.push(
              `page "${page.slug}" section "${sectionKey}" must declare at least one variant`,
            );
            continue;
          }
          for (const variant of variantList) {
            if (!variant.key || typeof variant.key !== "string") {
              problems.push(
                `page "${page.slug}" section "${sectionKey}" variant keys must be non-empty strings`,
              );
            }
          }
          uniqueViolations(
            `page "${page.slug}" section "${sectionKey}" variant key`,
            variantList.map((v) => v.key),
            problems,
          );
        }
      }
    }
    if (!s.pages.some((p) => !p.removable)) {
      problems.push("at least one page must be non-removable (the home page)");
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `@olivv/template-kit: invalid template schema for "${s.templateId}":\n` +
        problems.map((p) => `  - ${p}`).join("\n"),
    );
  }
  return s;
}

/**
 * Produce the REGISTRY MANIFEST (plain JSON) the platform stores for this
 * template. `zodToJson` is the template's own converter — typically
 * `(schema) => zodToJsonSchema(schema, { $refStrategy: "none" })` — so the kit
 * never has to depend on a specific zod-to-json-schema version.
 */
export function toRegistryManifest(
  s: TemplateSchemaV2,
  zodToJson: (schema: ZodTypeAny) => object,
): TemplateRegistryManifest {
  return {
    templateId: s.templateId,
    schemaVersion: s.schemaVersion,
    locales: [...s.locales],
    global: zodToJson(s.global),
    theme: {
      tokens: s.theme.tokens.map((t) => ({ ...t })),
      ...(s.theme.presets !== undefined && {
        presets: s.theme.presets.map((p) => ({ ...p, tokens: { ...p.tokens } })),
      }),
    },
    media: s.media.slots.map((m) => ({ ...m })),
    variations: s.variations.map((v) => ({ ...v })),
    pages: s.pages.map((p) => ({
      slug: p.slug,
      label: p.label,
      path: p.path,
      removable: p.removable,
      seo: p.seo,
      sections: zodToJson(p.sections),
      ...(p.variants !== undefined && {
        variants: Object.fromEntries(
          Object.entries(p.variants).map(([k, list]) => [k, list.map((v) => ({ ...v }))]),
        ),
      }),
    })),
  };
}
