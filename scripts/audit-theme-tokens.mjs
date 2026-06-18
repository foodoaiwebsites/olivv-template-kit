#!/usr/bin/env node
/**
 * audit-theme-tokens — verify every THEME_TOKENS entry is wired to a Tailwind
 * utility, with the correct hsl() channel wrapping. Runs against one or many
 * templates (Tailwind v3 JS-config OR v4 CSS @theme — auto-detected).
 *
 *   node themes/template-kit/scripts/audit-theme-tokens.mjs themes/vu-lounge themes/chocoberry
 *   node themes/template-kit/scripts/audit-theme-tokens.mjs themes/*
 *
 * For each template it reads template-schema.json (run the template's
 * `emit-schema` first) and the template's wiring source:
 *   - v3: tailwind.config.{ts,js,cjs,mjs}
 *   - v4: every src/**\/*.css (globals.css + any @import-ed @theme files)
 *
 * A color token must appear as `hsl(var(--<key>))`. Flags:
 *   UNWIRED   — token never referenced in the wiring source (dead token)
 *   UNWRAPPED — referenced as `var(--<key>)` but missing the hsl() wrapper
 * A font token must appear as `var(--<key>)` somewhere in the wiring source.
 *
 * Exit code is the number of templates with problems (0 = all clean), so it can
 * gate CI.  See MIGRATE-TO-STATIC-PUBLISH.md §11 for the fixes.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Token key → Tailwind class stem (must match @olivv/template-kit colorTokenStem). */
const stem = (k) => (k === "text" ? "fg" : k.startsWith("text-") ? `fg-${k.slice(5)}` : k);

function walkCss(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist" || name === "out") continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkCss(p, out);
    else if (name.endsWith(".css")) out.push(p);
  }
  return out;
}

function wiringSource(themeDir) {
  const v3 = ["tailwind.config.ts", "tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs"]
    .map((f) => join(themeDir, f))
    .find(existsSync);
  if (v3) return { mode: "v3", text: readFileSync(v3, "utf8") };
  const srcDir = join(themeDir, "src");
  if (existsSync(srcDir)) {
    const text = walkCss(srcDir).map((f) => readFileSync(f, "utf8")).join("\n");
    if (/@theme/.test(text)) return { mode: "v4", text };
  }
  return { mode: "unknown", text: "" };
}

function auditTheme(themeDir) {
  const schemaPath = join(themeDir, "template-schema.json");
  if (!existsSync(schemaPath)) return { skip: "no template-schema.json (run emit-schema)" };
  const tokens = JSON.parse(readFileSync(schemaPath, "utf8"))?.theme?.tokens ?? [];
  const { mode, text } = wiringSource(themeDir);
  if (mode === "unknown") return { skip: "no tailwind.config.* and no @theme CSS found" };

  const unwired = [];
  const unwrapped = [];
  for (const t of tokens) {
    if (t.type === "color") {
      const hasVar = text.includes(`var(--${t.key})`);
      const hasHsl = text.includes(`hsl(var(--${t.key}))`);
      if (!hasVar && !hasHsl) unwired.push(t.key);
      else if (hasVar && !hasHsl) unwrapped.push(t.key);
    } else if (t.type === "font") {
      if (!text.includes(`var(--${t.key})`)) unwired.push(t.key);
    }
  }
  return { mode, total: tokens.length, unwired, unwrapped };
}

const targets = process.argv.slice(2).filter((p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
});
if (!targets.length) {
  console.error("usage: audit-theme-tokens <theme-dir> [<theme-dir> ...]");
  process.exit(2);
}

let failed = 0;
for (const dir of targets) {
  const r = auditTheme(dir);
  const name = dir.replace(/\/$/, "");
  if (r.skip) {
    console.log(`• ${name}: SKIP (${r.skip})`);
    continue;
  }
  const problems = r.unwired.length + r.unwrapped.length;
  if (problems === 0) {
    console.log(`✓ ${name} [${r.mode}] — ${r.total} tokens, all wired`);
  } else {
    failed++;
    console.log(`✗ ${name} [${r.mode}] — ${problems} problem(s) of ${r.total} tokens`);
    if (r.unwrapped.length) console.log(`    UNWRAPPED (missing hsl()): ${r.unwrapped.join(", ")}`);
    if (r.unwired.length) console.log(`    UNWIRED (no utility):       ${r.unwired.join(", ")}`);
  }
}
process.exit(failed);
