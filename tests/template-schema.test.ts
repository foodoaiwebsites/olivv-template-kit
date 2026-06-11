import { describe, expect, test } from "bun:test";
import { z } from "zod";

import {
  defineTemplateSchema,
  toRegistryManifest,
  TEMPLATE_SCHEMA_VERSION,
  type TemplateSchemaV2,
} from "../src/template-schema";

function validSchema(): TemplateSchemaV2 {
  return {
    templateId: "fixture-template",
    schemaVersion: 2,
    locales: ["en", "ar"],
    global: z.object({ restaurantName: z.string() }),
    theme: {
      tokens: [
        { key: "primary", type: "color", label: "Primary", default: "0 0% 9%" },
        {
          key: "font-heading",
          type: "font",
          label: "Heading font",
          default: "var(--font-playfair)",
          options: [{ value: "var(--font-playfair)", label: "Playfair Display" }],
        },
      ],
      presets: [
        { key: "base", label: "Default", tokens: { primary: "0 0% 9%" } },
        {
          key: "christmas",
          label: "Christmas",
          seasonal: true,
          tokens: { primary: "350 60% 34%" },
        },
      ],
    },
    media: {
      slots: [
        { key: "hero.video", type: "video", label: "Hero video" },
        { key: "og.image", type: "image", label: "Social share image" },
      ],
    },
    variations: [{ key: "default", label: "Default" }],
    pages: [
      {
        slug: "home",
        label: "Home",
        path: "/",
        removable: false,
        seo: true,
        sections: z.object({ hero: z.object({ headline: z.string() }) }),
        variants: {
          hero: [
            { key: "default", label: "Default" },
            { key: "split", label: "Split layout" },
          ],
        },
      },
      {
        slug: "about-us",
        label: "About us",
        path: "/about-us",
        removable: true,
        seo: true,
        sections: z.object({}),
      },
    ],
  };
}

describe("defineTemplateSchema", () => {
  test("accepts a valid declaration and returns it unchanged", () => {
    const s = validSchema();
    expect(defineTemplateSchema(s)).toBe(s);
  });

  test("TEMPLATE_SCHEMA_VERSION is 2", () => {
    expect(TEMPLATE_SCHEMA_VERSION).toBe(2);
  });

  test("rejects empty templateId", () => {
    expect(() => defineTemplateSchema({ ...validSchema(), templateId: "" })).toThrow(
      /templateId/,
    );
  });

  test("rejects wrong schemaVersion", () => {
    const s = { ...validSchema(), schemaVersion: 1 } as unknown as TemplateSchemaV2;
    expect(() => defineTemplateSchema(s)).toThrow(/schemaVersion must be 2/);
  });

  test("rejects empty locales", () => {
    expect(() => defineTemplateSchema({ ...validSchema(), locales: [] })).toThrow(/locales/);
  });

  test("rejects duplicate locales", () => {
    expect(() => defineTemplateSchema({ ...validSchema(), locales: ["en", "en"] })).toThrow(
      /duplicate locale "en"/,
    );
  });

  test("rejects duplicate theme token keys", () => {
    const s = validSchema();
    s.theme.tokens.push({ key: "primary", type: "color", label: "Dup" });
    expect(() => defineTemplateSchema(s)).toThrow(/duplicate theme token key "primary"/);
  });

  test("rejects duplicate media slot keys", () => {
    const s = validSchema();
    s.media.slots.push({ key: "og.image", type: "image", label: "Dup" });
    expect(() => defineTemplateSchema(s)).toThrow(/duplicate media slot key "og.image"/);
  });

  test("rejects duplicate theme preset keys", () => {
    const s = validSchema();
    s.theme.presets!.push({ key: "base", label: "Dup", tokens: {} });
    expect(() => defineTemplateSchema(s)).toThrow(/duplicate theme preset key "base"/);
  });

  test("rejects empty theme preset keys", () => {
    const s = validSchema();
    s.theme.presets!.push({ key: "", label: "Empty", tokens: {} });
    expect(() => defineTemplateSchema(s)).toThrow(
      /theme preset keys must be non-empty strings/,
    );
  });

  test("accepts a declaration without theme presets", () => {
    const s = validSchema();
    delete s.theme.presets;
    expect(defineTemplateSchema(s)).toBe(s);
  });

  test("rejects page variants referencing an unknown section", () => {
    const s = validSchema();
    s.pages[0]!.variants = { nonexistent: [{ key: "default", label: "Default" }] };
    expect(() => defineTemplateSchema(s)).toThrow(
      /page "home" variants reference unknown section "nonexistent"/,
    );
  });

  test("rejects an empty variant list for a section", () => {
    const s = validSchema();
    s.pages[0]!.variants = { hero: [] };
    expect(() => defineTemplateSchema(s)).toThrow(
      /page "home" section "hero" must declare at least one variant/,
    );
  });

  test("rejects duplicate variant keys within a section", () => {
    const s = validSchema();
    s.pages[0]!.variants = {
      hero: [
        { key: "default", label: "Default" },
        { key: "default", label: "Dup" },
      ],
    };
    expect(() => defineTemplateSchema(s)).toThrow(
      /duplicate page "home" section "hero" variant key "default"/,
    );
  });

  test("rejects empty variant keys within a section", () => {
    const s = validSchema();
    s.pages[0]!.variants = { hero: [{ key: "", label: "Empty" }] };
    expect(() => defineTemplateSchema(s)).toThrow(
      /page "home" section "hero" variant keys must be non-empty strings/,
    );
  });

  test("rejects empty variations", () => {
    expect(() => defineTemplateSchema({ ...validSchema(), variations: [] })).toThrow(
      /variations/,
    );
  });

  test("rejects empty pages", () => {
    expect(() => defineTemplateSchema({ ...validSchema(), pages: [] })).toThrow(/pages/);
  });

  test("rejects duplicate page slugs", () => {
    const s = validSchema();
    s.pages.push({ ...s.pages[1]!, path: "/other" });
    expect(() => defineTemplateSchema(s)).toThrow(/duplicate page slug "about-us"/);
  });

  test("rejects page path not starting with /", () => {
    const s = validSchema();
    s.pages[1] = { ...s.pages[1]!, slug: "x", path: "about-us" };
    expect(() => defineTemplateSchema(s)).toThrow(/path must start with "\/"/);
  });

  test("rejects declarations where every page is removable", () => {
    const s = validSchema();
    s.pages[0] = { ...s.pages[0]!, removable: true };
    expect(() => defineTemplateSchema(s)).toThrow(/non-removable/);
  });

  test("aggregates multiple violations into one error", () => {
    const s = { ...validSchema(), templateId: "", locales: [] };
    try {
      defineTemplateSchema(s);
      throw new Error("expected defineTemplateSchema to throw");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("templateId");
      expect(msg).toContain("locales");
    }
  });
});

describe("toRegistryManifest", () => {
  test("produces the JSON registry shape via the supplied converter", () => {
    const s = defineTemplateSchema(validSchema());
    const calls: unknown[] = [];
    const manifest = toRegistryManifest(s, (schema) => {
      calls.push(schema);
      return { type: "object", marker: calls.length };
    });

    // global + one per page
    expect(calls.length).toBe(1 + s.pages.length);
    expect(manifest.templateId).toBe("fixture-template");
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.locales).toEqual(["en", "ar"]);
    expect(manifest.global).toEqual({ type: "object", marker: 1 });
    expect(manifest.theme.tokens).toEqual(s.theme.tokens);
    expect(manifest.theme.presets).toEqual(s.theme.presets!);
    expect(manifest.media).toEqual(s.media.slots);
    expect(manifest.variations).toEqual(s.variations);
    expect(manifest.pages.map((p) => p.slug)).toEqual(["home", "about-us"]);
    expect(manifest.pages[0]).toMatchObject({
      slug: "home",
      label: "Home",
      path: "/",
      removable: false,
      seo: true,
      sections: { type: "object", marker: 2 },
      variants: {
        hero: [
          { key: "default", label: "Default" },
          { key: "split", label: "Split layout" },
        ],
      },
    });
    // pages without variants must not gain the key
    expect("variants" in manifest.pages[1]!).toBe(false);
  });

  test("omits theme.presets when the declaration has none", () => {
    const s = validSchema();
    delete s.theme.presets;
    const manifest = toRegistryManifest(defineTemplateSchema(s), () => ({ type: "object" }));
    expect("presets" in manifest.theme).toBe(false);
  });

  test("manifest is JSON-serialisable and detached from the declaration", () => {
    const s = defineTemplateSchema(validSchema());
    const manifest = toRegistryManifest(s, () => ({ type: "object" }));
    const roundTripped: unknown = JSON.parse(JSON.stringify(manifest));
    expect(roundTripped).toEqual(manifest as unknown as Record<string, unknown>);
    // mutating the manifest must not touch the declaration
    manifest.theme.tokens[0]!.key = "mutated";
    expect(s.theme.tokens[0]!.key).toBe("primary");
    manifest.theme.presets![0]!.tokens["primary"] = "mutated";
    expect(s.theme.presets![0]!.tokens["primary"]).toBe("0 0% 9%");
    manifest.pages[0]!.variants!["hero"]![0]!.key = "mutated";
    expect(s.pages[0]!.variants!["hero"]![0]!.key).toBe("default");
  });
});
