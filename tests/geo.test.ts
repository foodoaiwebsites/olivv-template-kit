import { describe, expect, test } from "bun:test";

import { getGeo } from "../src/geo";

describe("getGeo", () => {
  test("prefers req.geo when populated", () => {
    const geo = getGeo({
      geo: { country: "AE", region: "DU", city: "Dubai" },
      headers: new Headers({ "x-vercel-ip-country": "US", "cf-ipcountry": "GB" }),
    });
    expect(geo).toEqual({ country: "AE", region: "DU", city: "Dubai" });
  });

  test("falls back to x-vercel-ip-* headers before cf-* (Next 15 on Vercel)", () => {
    const geo = getGeo({
      headers: new Headers({
        "x-vercel-ip-country": "US",
        "x-vercel-ip-country-region": "CA",
        "x-vercel-ip-city": "San Francisco",
        "cf-ipcountry": "GB",
        "cf-region": "LND",
        "cf-ipcity": "London",
      }),
    });
    expect(geo).toEqual({ country: "US", region: "CA", city: "San Francisco" });
  });

  test("falls back to cf-* headers when no req.geo and no Vercel headers", () => {
    const geo = getGeo({
      headers: new Headers({ "cf-ipcountry": "GB", "cf-region": "LND", "cf-ipcity": "London" }),
    });
    expect(geo).toEqual({ country: "GB", region: "LND", city: "London" });
  });

  test("ignores an empty req.geo object and still reads headers", () => {
    const geo = getGeo({ geo: {}, headers: new Headers({ "x-vercel-ip-country": "US" }) });
    expect(geo).toEqual({ country: "US", region: undefined, city: undefined });
  });

  test("returns {} when nothing is available (local dev)", () => {
    expect(getGeo({ headers: new Headers() })).toEqual({});
  });
});
