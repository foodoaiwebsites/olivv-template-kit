import { describe, expect, test } from "bun:test";

import { defineTemplateManifest, KIT_SCHEMA_VERSION } from "../src/manifest";

const valid = {
  templateId: "vu-lounge",
  version: "1.0.0",
  schemaVersion: 1,
  displayName: "VU Lounge",
  previewClientId: "fixture-client",
  engines: { next: "14.x" },
};

describe("defineTemplateManifest", () => {
  test("accepts a valid manifest and returns it", () => {
    expect(defineTemplateManifest(valid)).toEqual(valid);
  });

  test("accepts minimal manifest (optionals omitted)", () => {
    const minimal = {
      templateId: "t",
      version: "0.1.0",
      schemaVersion: 1,
      displayName: "T",
    };
    expect(defineTemplateManifest(minimal)).toEqual(minimal);
  });

  test("rejects empty templateId", () => {
    expect(() => defineTemplateManifest({ ...valid, templateId: "" })).toThrow();
  });

  test("rejects non-semver version", () => {
    expect(() => defineTemplateManifest({ ...valid, version: "v1" })).toThrow();
  });

  test("rejects non-integer schemaVersion", () => {
    expect(() => defineTemplateManifest({ ...valid, schemaVersion: 1.5 })).toThrow();
  });

  test("rejects schemaVersion newer than KIT_SCHEMA_VERSION", () => {
    expect(() =>
      defineTemplateManifest({ ...valid, schemaVersion: KIT_SCHEMA_VERSION + 1 }),
    ).toThrow(/KIT_SCHEMA_VERSION/);
  });
});
