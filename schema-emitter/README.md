# schema-emitter

Standalone, config-driven generator for a template's registry + content schemas.
Canonical home: this `@olivv/template-kit` repo. Reachable from the docs bundle
via its `kit/` symlink (`olivv-template-kit/kit/schema-emitter/…`) and from
`full-templates` via `make emit-theme-schemas`.

For one template it writes three files **into the theme folder**:

| File | What it is |
| --- | --- |
| `template-schema.json` | the v2 registry manifest (global content schema, pages, theme tokens, media, variations) — produced with the theme's own converter |
| `content-schema.flat.json` | JSON Schema of `brandTextSchema` (the legacy flat, one-locale brand-copy contract) |
| `content-schema.global.json` | JSON Schema of `globalContentSchema` (site-wide brand + default SEO) |

## Requirements

- **bun** — the emitter imports the theme's `src/template-schema.ts` and
  `src/content/schema.ts` (TypeScript) directly.
- The **target theme's `node_modules` must be installed** — `zod` (and, for Zod
  v3 themes, `zod-to-json-schema`) are resolved from the theme, not from here.
  This tool has **no dependencies of its own**.

## Run

```bash
# from the kit repo root (themes/template-kit/):
bun schema-emitter/emit-theme-schemas.ts schema-emitter/chocoberry.json
bun schema-emitter/emit-theme-schemas.ts schema-emitter/vu-lounge.json

# from the docs bundle (via the kit/ symlink):
bun kit/schema-emitter/emit-theme-schemas.ts kit/schema-emitter/chocoberry.json
# or: npm run emit-schemas -- kit/schema-emitter/chocoberry.json

# from full-templates:
make emit-theme-schemas TEMPLATE=chocoberry
```

## Config

A standalone JSON file. Paths resolve **relative to the config file** (symlinks
are dereferenced first, so reaching this through the docs `kit/` symlink works):

```json
{
  "themeDir": "../../chocoberry",
  "templateKit": "..",
  "olivvTemplateKit": "../../../olivv-source/foodo-docs/olivv-template-kit"
}
```

- `themeDir` — **required**; the template to emit for (where the files are written).
- `templateKit` — this `@olivv/template-kit` repo. Recorded + existence-checked.
- `olivvTemplateKit` — the docs/kit bundle. Recorded + existence-checked.

> Only `themeDir` drives the emit today; `templateKit` / `olivvTemplateKit` are
> recorded for the wider toolchain. To emit for a new theme, copy a config and
> point `themeDir` at it.

## Zod-version aware

Reuses each theme's **own** JSON-Schema converter, so output matches the theme
exactly:

- **Zod v4** (e.g. chocoberry) → native `z.toJSONSchema(s, { reused: "inline", unrepresentable: "any" })`
- **Zod v3** (e.g. vu-lounge) → `zod-to-json-schema` with `{ $refStrategy: "none" }`

It also tolerates either schema layout: `globalContentSchema` is read from
`content/schema.ts` or `template-schema.ts`, whichever exports it.
