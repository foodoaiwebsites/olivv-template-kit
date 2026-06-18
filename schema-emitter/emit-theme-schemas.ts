/**
 * emit-theme-schemas — standalone, config-driven schema emitter for a theme.
 *
 *   bun schema-emitter/emit-theme-schemas.ts <config.json>
 *
 * Canonical home: this @olivv/template-kit repo. Also reachable from the docs
 * bundle via its `kit/` symlink (olivv-template-kit/kit/schema-emitter/…) and
 * from full-templates via `make emit-theme-schemas`.
 *
 * Self-contained: it has NO npm dependencies of its own — `zod` /
 * `zod-to-json-schema` are resolved from the TARGET theme's own node_modules,
 * and the theme's modules are imported by absolute path. Requires `bun` (it
 * imports the theme's `.ts`).
 *
 * Writes three files into the theme folder:
 *   - template-schema.json        (the v2 registry manifest; theme's own converter)
 *   - content-schema.flat.json    (JSON-Schema of brandTextSchema — legacy flat)
 *   - content-schema.global.json  (JSON-Schema of globalContentSchema)
 *
 * Reuses each theme's OWN JSON-Schema converter so it works across Zod versions:
 * Zod v4 → native `z.toJSONSchema(s, {reused:'inline', unrepresentable:'any'})`
 * (e.g. chocoberry); Zod v3 → the `zod-to-json-schema` package
 * (`{$refStrategy:'none'}`, e.g. vu-lounge).
 *
 * Config (paths resolve relative to the config file, symlinks dereferenced):
 *   {
 *     "themeDir": "../../chocoberry",                 // REQUIRED — target theme
 *     "templateKit": "..",                            // this @olivv/template-kit repo
 *     "olivvTemplateKit": "../../../olivv-source/foodo-docs/olivv-template-kit"
 *   }
 * Only `themeDir` is used to emit; `templateKit` / `olivvTemplateKit` are
 * recorded (and existence-checked) for the wider toolchain.
 */
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Config = { themeDir: string; templateKit?: string; olivvTemplateKit?: string };

const configArg = process.argv[2];
if (!configArg) {
  console.error("usage: bun schema-emitter/emit-theme-schemas.ts <config.json>");
  process.exit(2);
}

// realpath so the config resolves correctly even when reached through a symlink
// (e.g. the docs bundle's kit/ -> themes/template-kit). Relative paths inside the
// config are then anchored at the config's REAL directory.
const configPath = realpathSync(resolve(process.cwd(), configArg));
const configDir = dirname(configPath);
const config = JSON.parse(readFileSync(configPath, "utf8")) as Config;
const fromConfig = (p: string) => resolve(configDir, p);

if (!config.themeDir) {
  console.error(`config ${configPath} is missing the required "themeDir" field`);
  process.exit(2);
}
const themeDir = fromConfig(config.themeDir);

// Record + sanity-check the other paths (used by the wider toolchain, not the emit).
for (const [key, val] of [
  ["themeDir", themeDir],
  ["templateKit", config.templateKit && fromConfig(config.templateKit)],
  ["olivvTemplateKit", config.olivvTemplateKit && fromConfig(config.olivvTemplateKit)],
] as const) {
  if (!val) continue;
  console.log(`${val && existsSync(val) ? "ok  " : "WARN"} ${key}: ${val}`);
}
if (!existsSync(themeDir)) {
  console.error(`themeDir does not exist: ${themeDir}`);
  process.exit(1);
}

// Resolve the THEME's own zod and pick the converter the theme itself uses, so the
// output is byte-identical to the theme's emit and correct across Zod versions.
const themeRequire = createRequire(join(themeDir, "package.json"));
const importFromTheme = (spec: string) =>
  import(pathToFileURL(themeRequire.resolve(spec)).href);

// biome-ignore lint/suspicious/noExplicitAny: zod schema type varies by version
let convert: (schema: any) => unknown;
const { z } = await importFromTheme("zod");
if (typeof z?.toJSONSchema === "function") {
  // Zod v4 (native converter)
  // biome-ignore lint/suspicious/noExplicitAny: cross-version zod schema
  convert = (schema: any) => z.toJSONSchema(schema, { reused: "inline", unrepresentable: "any" });
  console.log("converter: zod v4 native z.toJSONSchema");
} else {
  // Zod v3 (zod-to-json-schema package, resolved from the theme)
  const { zodToJsonSchema } = await importFromTheme("zod-to-json-schema");
  // biome-ignore lint/suspicious/noExplicitAny: cross-version zod schema
  convert = (schema: any) => zodToJsonSchema(schema, { $refStrategy: "none" });
  console.log("converter: zod-to-json-schema package");
}

const importThemeFile = (rel: string) => import(pathToFileURL(join(themeDir, rel)).href);
// Schemas live in different modules per template layout: chocoberry exports both
// brandTextSchema + globalContentSchema from content/schema.ts; vu-lounge defines
// globalContentSchema in template-schema.ts and only brandTextSchema in
// content/schema.ts. Import both and resolve each from wherever it's exported.
const tmpl = await importThemeFile("src/template-schema.ts");
const content = await importThemeFile("src/content/schema.ts");
const templateRegistryManifest = tmpl.templateRegistryManifest;
const brandTextSchema = content.brandTextSchema ?? tmpl.brandTextSchema;
const globalContentSchema = content.globalContentSchema ?? tmpl.globalContentSchema;

if (!templateRegistryManifest) throw new Error("templateRegistryManifest not exported from src/template-schema.ts");
if (!brandTextSchema) throw new Error("brandTextSchema not exported from src/content/schema.ts or src/template-schema.ts");
if (!globalContentSchema) throw new Error("globalContentSchema not exported from src/content/schema.ts or src/template-schema.ts");

function write(name: string, obj: unknown): void {
  const out = join(themeDir, name);
  writeFileSync(out, `${JSON.stringify(obj, null, 2)}\n`);
  console.log(`wrote ${name}`);
}

write("template-schema.json", templateRegistryManifest);
write("content-schema.flat.json", convert(brandTextSchema));
write("content-schema.global.json", convert(globalContentSchema));
