import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";

import { verifyHmacSignature } from "../src/hmac";

const KEY = "test-hmac-key";
const sign = (body: string, key: string = KEY): string =>
  createHmac("sha256", key).update(body).digest("hex");

describe("verifyHmacSignature", () => {
  test("accepts a valid signature", async () => {
    const body = JSON.stringify({ clientId: "nur" });
    expect(await verifyHmacSignature(body, sign(body), KEY)).toBe(true);
  });

  test("accepts uppercase hex", async () => {
    const body = JSON.stringify({ clientId: "nur" });
    expect(await verifyHmacSignature(body, sign(body).toUpperCase(), KEY)).toBe(true);
  });

  test("rejects a signature made with the wrong key", async () => {
    const body = JSON.stringify({ clientId: "nur" });
    expect(await verifyHmacSignature(body, sign(body, "other-key"), KEY)).toBe(false);
  });

  test("rejects a signature for a different body", async () => {
    expect(await verifyHmacSignature('{"clientId":"b"}', sign('{"clientId":"a"}'), KEY)).toBe(
      false,
    );
  });

  test("rejects malformed hex and empty inputs", async () => {
    expect(await verifyHmacSignature("body", "not-hex", KEY)).toBe(false);
    expect(await verifyHmacSignature("body", "abc", KEY)).toBe(false); // odd length
    expect(await verifyHmacSignature("body", "", KEY)).toBe(false);
    expect(await verifyHmacSignature("body", sign("body"), "")).toBe(false);
  });
});
