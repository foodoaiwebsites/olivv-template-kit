import { describe, expect, test } from "bun:test";

import {
  hexToHslChannels,
  hslChannelsToHex,
  themeStyleVars,
  colorTokenStem,
  fontTokenName,
  tailwindColorsFromTokens,
  tailwindFontsFromTokens,
  cssThemeFromTokens,
} from "../src/theme";
import type { ThemeTokenSpec } from "../src/template-schema";

describe("hexToHslChannels / hslChannelsToHex", () => {
  test("round-trips representative colors", () => {
    for (const hex of ["#ff0000", "#00ff00", "#0000ff", "#1a2b3c", "#c0ffee", "#778899"]) {
      const channels = hexToHslChannels(hex);
      expect(channels).not.toBeNull();
      expect(hslChannelsToHex(channels as string)).toBe(hex);
    }
  });

  test("handles black and white (zero-delta branch)", () => {
    expect(hexToHslChannels("#000000")).toBe("0 0% 0%");
    expect(hexToHslChannels("#ffffff")).toBe("0 0% 100%");
    expect(hslChannelsToHex("0 0% 100%")).toBe("#ffffff");
  });

  test("accepts hex without the # prefix", () => {
    expect(hexToHslChannels("ff0000")).toBe("0 100% 50%");
  });

  test("rejects malformed input", () => {
    expect(hexToHslChannels("#fff")).toBeNull();
    expect(hexToHslChannels("not-a-color")).toBeNull();
    expect(hslChannelsToHex("#ff0000")).toBeNull();
    expect(hslChannelsToHex("12 34")).toBeNull();
  });
});

describe("themeStyleVars", () => {
  test("renders :root block with -- prefix normalization", () => {
    expect(themeStyleVars({ "--primary": "24 95% 53%", accent: "#fff" })).toBe(
      ":root{--primary:24 95% 53%;--accent:#fff}",
    );
  });

  test("strips ;{} from names and <>;{} from values defensively", () => {
    expect(themeStyleVars({ "pri;ma{r}y": "red", safe: "</style><script>" })).toBe(
      ":root{--primary:red;--safe:/stylescript}",
    );
  });

  test("neutralizes a CSS-injection attempt in a value", () => {
    const out = themeStyleVars({ "--primary": "red} body{background:url(//evil)}" });
    // The injected braces/semicolons are stripped, so the value cannot escape :root{}.
    expect(out).toBe(":root{--primary:red bodybackground:url(//evil)}");
    expect(out.indexOf("}")).toBe(out.length - 1); // only the closing :root brace survives
  });

  test("renders empty token map as empty :root", () => {
    expect(themeStyleVars({})).toBe(":root{}");
  });
});

const SAMPLE_TOKENS: ThemeTokenSpec[] = [
  { key: "primary", type: "color", label: "Primary" },
  { key: "primary-foreground", type: "color", label: "Primary fg" },
  { key: "text", type: "color", label: "Body text" },
  { key: "text-heading", type: "color", label: "Heading text" },
  { key: "btn-primary", type: "color", label: "Primary button" },
  { key: "btn-primary-hover", type: "color", label: "Primary button hover" },
  { key: "radius", type: "text", label: "Radius" },
  { key: "font-heading", type: "font", label: "Heading font" },
  { key: "font-body", type: "font", label: "Body font" },
];

describe("colorTokenStem / fontTokenName", () => {
  test("maps semantic text colors into the fg namespace, everything else verbatim", () => {
    expect(colorTokenStem("text")).toBe("fg");
    expect(colorTokenStem("text-heading")).toBe("fg-heading");
    expect(colorTokenStem("text-inverted")).toBe("fg-inverted");
    expect(colorTokenStem("primary")).toBe("primary");
    expect(colorTokenStem("primary-foreground")).toBe("primary-foreground");
    expect(colorTokenStem("btn-primary-hover")).toBe("btn-primary-hover");
    expect(colorTokenStem("menuprimaryforeground")).toBe("menuprimaryforeground");
  });

  test("strips the font- prefix for the fontFamily name", () => {
    expect(fontTokenName("font-heading")).toBe("heading");
    expect(fontTokenName("font-script")).toBe("script");
  });
});

describe("tailwindColorsFromTokens (v3)", () => {
  test("hsl()-wraps every color token, skips font/text tokens, applies fg stem", () => {
    expect(tailwindColorsFromTokens(SAMPLE_TOKENS)).toEqual({
      primary: "hsl(var(--primary))",
      "primary-foreground": "hsl(var(--primary-foreground))",
      fg: "hsl(var(--text))",
      "fg-heading": "hsl(var(--text-heading))",
      "btn-primary": "hsl(var(--btn-primary))",
      "btn-primary-hover": "hsl(var(--btn-primary-hover))",
    });
  });
});

describe("tailwindFontsFromTokens (v3)", () => {
  test("emits a fontFamily slot per font token with the given fallback", () => {
    expect(tailwindFontsFromTokens(SAMPLE_TOKENS, ["serif"])).toEqual({
      heading: ["var(--font-heading)", "serif"],
      body: ["var(--font-body)", "serif"],
    });
  });

  test("defaults the fallback to sans-serif", () => {
    expect(tailwindFontsFromTokens([{ key: "font-body", type: "font", label: "Body" }])).toEqual({
      body: ["var(--font-body)", "sans-serif"],
    });
  });
});

describe("cssThemeFromTokens (v4)", () => {
  test("emits an @theme inline block: hsl()-wrapped colors + var() fonts", () => {
    expect(cssThemeFromTokens(SAMPLE_TOKENS)).toBe(
      [
        "@theme inline {",
        "  --color-primary: hsl(var(--primary));",
        "  --color-primary-foreground: hsl(var(--primary-foreground));",
        "  --color-fg: hsl(var(--text));",
        "  --color-fg-heading: hsl(var(--text-heading));",
        "  --color-btn-primary: hsl(var(--btn-primary));",
        "  --color-btn-primary-hover: hsl(var(--btn-primary-hover));",
        "  --font-heading: var(--font-heading);",
        "  --font-body: var(--font-body);",
        "}",
      ].join("\n"),
    );
  });

  test("wrap:false returns only the declarations", () => {
    const body = cssThemeFromTokens([{ key: "primary", type: "color", label: "P" }], {
      wrap: false,
    });
    expect(body).toBe("  --color-primary: hsl(var(--primary));");
  });
});
