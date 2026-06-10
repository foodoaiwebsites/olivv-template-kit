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
};

/** One look/layout variation a template offers (always at least "default"). */
export type VariationSpec = {
  key: string;
  label: string;
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
}

/** A template's complete v2 declaration. */
export interface TemplateSchemaV2 {
  templateId: string;
  schemaVersion: 2;
  /** Supported locales, e.g. ["en", "ar"]. First entry is the default. */
  locales: string[];
  /** Site-wide brand content + default SEO (zod object). */
  global: ZodTypeAny;
  theme: { tokens: ThemeTokenSpec[] };
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
}

/** The plain-JSON REGISTRY MANIFEST the platform stores per template. */
export interface TemplateRegistryManifest {
  templateId: string;
  schemaVersion: 2;
  locales: string[];
  /** JSON-Schema of the site-wide global content. */
  global: object;
  theme: ThemeTokenSpec[];
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
    theme: s.theme.tokens.map((t) => ({ ...t })),
    media: s.media.slots.map((m) => ({ ...m })),
    variations: s.variations.map((v) => ({ ...v })),
    pages: s.pages.map((p) => ({
      slug: p.slug,
      label: p.label,
      path: p.path,
      removable: p.removable,
      seo: p.seo,
      sections: zodToJson(p.sections),
    })),
  };
}
