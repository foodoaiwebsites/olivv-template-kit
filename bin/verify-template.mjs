#!/usr/bin/env node
/**
 * verify-template — conformance gate for @olivv/template-kit templates (v0).
 *
 * Run from a template repo root:
 *   npx verify-template            (or: node node_modules/.bin/verify-template)
 *
 * Checks:
 *  1. template.manifest.json exists, parses, and passes the manifest rules.
 *  2. src/content/schema.ts exists.
 *  3. No NEXT_PUBLIC_THEME / NEXT_PUBLIC_RESTAURANT_ID under src/, and no
 *     NEXT_PUBLIC_*KEY/SECRET/TOKEN (the content API key is server-only).
 *  4. No req.geo under src/ (the kit's getGeo shim is the only allowed user).
 *  5. Warn (not fail) if next.config lacks `output: 'standalone'`.
 *
 * Dependency-free Node (fs walk; no grep child process, no zod).
 */
import fs from "node:fs";
import path from "node:path";

const KIT_SCHEMA_VERSION = 1;
const SEMVERISH_RE = /^\d+\.\d+\.\d+(-[\w.]+)?$/;
const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "out"]);
const TEXT_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"]);

const root = process.cwd();
const failures = [];
const warnings = [];

// --- helpers ---------------------------------------------------------------

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

/** Find `pattern` (RegExp) in text files under `dir`; returns [{file, line, text}]. */
function grep(dir, pattern) {
  const hits = [];
  for (const file of walk(dir)) {
    if (!TEXT_EXTS.has(path.extname(file))) continue;
    let text;
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (!pattern.test(text)) continue;
    text.split("\n").forEach((line, i) => {
      if (pattern.test(line)) {
        hits.push({ file: path.relative(root, file), line: i + 1, text: line.trim() });
      }
    });
  }
  return hits;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

// --- 1. manifest -------------------------------------------------------------

const manifestPath = path.join(root, "template.manifest.json");
if (!fs.existsSync(manifestPath)) {
  failures.push("template.manifest.json is missing (see TEMPLATE-CONVERSION.md step 9).");
} else {
  let manifest = null;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    failures.push(`template.manifest.json does not parse as JSON: ${err.message}`);
  }
  if (manifest !== null) {
    if (typeof manifest !== "object" || Array.isArray(manifest)) {
      failures.push("template.manifest.json must be a JSON object.");
    } else {
      if (!isNonEmptyString(manifest.templateId)) {
        failures.push("manifest: templateId must be a non-empty string.");
      }
      if (!isNonEmptyString(manifest.version) || !SEMVERISH_RE.test(manifest.version)) {
        failures.push("manifest: version must be semver (e.g. 1.0.0).");
      }
      if (!Number.isInteger(manifest.schemaVersion) || manifest.schemaVersion < 1) {
        failures.push("manifest: schemaVersion must be a positive integer.");
      } else if (manifest.schemaVersion > KIT_SCHEMA_VERSION) {
        failures.push(
          `manifest: schemaVersion ${manifest.schemaVersion} is newer than this kit's ` +
            `KIT_SCHEMA_VERSION ${KIT_SCHEMA_VERSION} — upgrade @olivv/template-kit.`,
        );
      }
      if (!isNonEmptyString(manifest.displayName)) {
        failures.push("manifest: displayName must be a non-empty string.");
      }
      if (manifest.previewClientId !== undefined && !isNonEmptyString(manifest.previewClientId)) {
        failures.push("manifest: previewClientId, when present, must be a non-empty string.");
      }
      if (manifest.engines !== undefined) {
        if (typeof manifest.engines !== "object" || manifest.engines === null) {
          failures.push("manifest: engines, when present, must be an object.");
        } else if (manifest.engines.next !== undefined && !isNonEmptyString(manifest.engines.next)) {
          failures.push("manifest: engines.next, when present, must be a non-empty string.");
        }
      }
    }
  }
}

// --- 2. content schema -------------------------------------------------------

if (!fs.existsSync(path.join(root, "src", "content", "schema.ts"))) {
  failures.push("src/content/schema.ts is missing (the zod content schema drives builder forms).");
}

// --- 3. forbidden env vars ---------------------------------------------------

const srcDir = path.join(root, "src");
for (const name of ["NEXT_PUBLIC_THEME", "NEXT_PUBLIC_RESTAURANT_ID"]) {
  const hits = grep(srcDir, new RegExp(name));
  if (hits.length > 0) {
    failures.push(
      `${name} found under src/ — replace with runtime content (TEMPLATE-CONVERSION.md step 7):\n` +
        hits.map((h) => `      ${h.file}:${h.line}: ${h.text}`).join("\n"),
    );
  }
}

// Secrets must NEVER be exposed via NEXT_PUBLIC_ — the content key (and any
// key/secret/token) is server-only by contract.
const publicSecretHits = grep(srcDir, /NEXT_PUBLIC_\w*(KEY|SECRET|TOKEN)/);
if (publicSecretHits.length > 0) {
  failures.push(
    "NEXT_PUBLIC_*KEY/SECRET/TOKEN found under src/ — secrets (e.g. CONTENT_API_KEY) are " +
      "server-only and must never be NEXT_PUBLIC_:\n" +
      publicSecretHits.map((h) => `      ${h.file}:${h.line}: ${h.text}`).join("\n"),
  );
}

// --- 4. req.geo --------------------------------------------------------------

const geoHits = grep(srcDir, /req\.geo/);
if (geoHits.length > 0) {
  failures.push(
    "req.geo found under src/ — Vercel-only; use getGeo() from @olivv/template-kit instead:\n" +
      geoHits.map((h) => `      ${h.file}:${h.line}: ${h.text}`).join("\n"),
  );
}

// --- 5. next.config standalone (warn only) -----------------------------------

const nextConfig = ["next.config.js", "next.config.mjs", "next.config.ts"]
  .map((f) => path.join(root, f))
  .find((f) => fs.existsSync(f));
if (!nextConfig) {
  warnings.push("no next.config.{js,mjs,ts} found — cannot check output: 'standalone'.");
} else if (!/output\s*:\s*["']standalone["']/.test(fs.readFileSync(nextConfig, "utf8"))) {
  warnings.push(
    `${path.basename(nextConfig)} lacks output: 'standalone' (k8s-ready; harmless on Vercel).`,
  );
}

// --- report ------------------------------------------------------------------

for (const w of warnings) console.log(`WARN  ${w}`);
if (failures.length > 0) {
  console.error(`\nverify-template: ${failures.length} check(s) FAILED in ${root}\n`);
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}`));
  console.error("");
  process.exit(1);
}
console.log(`\nverify-template: all checks passed in ${root}\n`);
