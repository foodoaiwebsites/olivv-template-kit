/** Highest template-schema version this kit release understands. */
export const TEMPLATE_SCHEMA_VERSION = 2;
function uniqueViolations(label, keys, out) {
    const seen = new Set();
    for (const key of keys) {
        if (seen.has(key))
            out.push(`duplicate ${label} "${key}"`);
        seen.add(key);
    }
}
/**
 * Best-effort introspection of a zod OBJECT schema's top-level keys (duck-typed
 * on zod v3's `_def` so the kit never depends on a zod runtime). Returns null
 * when the schema is not a plain ZodObject (then section-key checks are
 * skipped — best-effort by design).
 */
function zodObjectKeys(schema) {
    const def = schema._def;
    if (!def || def.typeName !== "ZodObject")
        return null;
    const shape = typeof def.shape === "function"
        ? def.shape()
        : def.shape;
    if (!shape || typeof shape !== "object")
        return null;
    return Object.keys(shape);
}
/**
 * Validate a template's v2 declaration and return it unchanged. Throws a
 * single aggregated Error listing every violated invariant, so a bad
 * declaration fails the template's build immediately and completely.
 */
export function defineTemplateSchema(s) {
    const problems = [];
    if (!s.templateId || typeof s.templateId !== "string") {
        problems.push("templateId must be a non-empty string");
    }
    if (s.schemaVersion !== 2) {
        problems.push(`schemaVersion must be 2 (got ${String(s.schemaVersion)})`);
    }
    if (!Array.isArray(s.locales) || s.locales.length === 0) {
        problems.push("locales must be a non-empty array");
    }
    else {
        uniqueViolations("locale", s.locales, problems);
    }
    uniqueViolations("theme token key", s.theme.tokens.map((t) => t.key), problems);
    uniqueViolations("media slot key", s.media.slots.map((m) => m.key), problems);
    if (s.theme.presets !== undefined) {
        for (const preset of s.theme.presets) {
            if (!preset.key || typeof preset.key !== "string") {
                problems.push("theme preset keys must be non-empty strings");
            }
        }
        uniqueViolations("theme preset key", s.theme.presets.map((p) => p.key), problems);
    }
    if (s.variations.length === 0) {
        problems.push('variations must contain at least one entry (e.g. "default")');
    }
    uniqueViolations("variation key", s.variations.map((v) => v.key), problems);
    if (s.pages.length === 0) {
        problems.push("pages must contain at least one entry");
    }
    else {
        uniqueViolations("page slug", s.pages.map((p) => p.slug), problems);
        uniqueViolations("page path", s.pages.map((p) => p.path), problems);
        for (const page of s.pages) {
            if (!page.path.startsWith("/")) {
                problems.push(`page "${page.slug}" path must start with "/" (got "${page.path}")`);
            }
            if (page.variants !== undefined) {
                const sectionKeys = zodObjectKeys(page.sections);
                for (const [sectionKey, variantList] of Object.entries(page.variants)) {
                    if (sectionKeys !== null && !sectionKeys.includes(sectionKey)) {
                        problems.push(`page "${page.slug}" variants reference unknown section "${sectionKey}"`);
                    }
                    if (!Array.isArray(variantList) || variantList.length === 0) {
                        problems.push(`page "${page.slug}" section "${sectionKey}" must declare at least one variant`);
                        continue;
                    }
                    for (const variant of variantList) {
                        if (!variant.key || typeof variant.key !== "string") {
                            problems.push(`page "${page.slug}" section "${sectionKey}" variant keys must be non-empty strings`);
                        }
                    }
                    uniqueViolations(`page "${page.slug}" section "${sectionKey}" variant key`, variantList.map((v) => v.key), problems);
                }
            }
        }
        if (!s.pages.some((p) => !p.removable)) {
            problems.push("at least one page must be non-removable (the home page)");
        }
    }
    if (problems.length > 0) {
        throw new Error(`@olivv/template-kit: invalid template schema for "${s.templateId}":\n` +
            problems.map((p) => `  - ${p}`).join("\n"));
    }
    return s;
}
/**
 * Produce the REGISTRY MANIFEST (plain JSON) the platform stores for this
 * template. `zodToJson` is the template's own converter — typically
 * `(schema) => zodToJsonSchema(schema, { $refStrategy: "none" })` — so the kit
 * never has to depend on a specific zod-to-json-schema version.
 */
export function toRegistryManifest(s, zodToJson) {
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
                variants: Object.fromEntries(Object.entries(p.variants).map(([k, list]) => [k, list.map((v) => ({ ...v }))])),
            }),
        })),
    };
}
