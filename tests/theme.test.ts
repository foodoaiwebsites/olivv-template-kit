import { describe, expect, test } from "bun:test";

import { hexToHslChannels, hslChannelsToHex, themeStyleVars } from "../src/theme";

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

  test("strips ;{} from names and <> from values defensively", () => {
    expect(themeStyleVars({ "pri;ma{r}y": "red", safe: "</style><script>" })).toBe(
      ":root{--primary:red;--safe:/stylescript}",
    );
  });

  test("renders empty token map as empty :root", () => {
    expect(themeStyleVars({})).toBe(":root{}");
  });
});
