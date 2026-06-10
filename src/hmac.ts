/**
 * Pure HMAC verification — Web Crypto only, no Next imports, so it is testable
 * outside a Next runtime. Used by `createRevalidateRoute`.
 */

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(clean) || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Verify `signatureHex` is the hex HMAC-SHA256 of `body` under `hmacKey`.
 * Uses `crypto.subtle.verify`, which performs a constant-time comparison.
 */
export async function verifyHmacSignature(
  body: string,
  signatureHex: string,
  hmacKey: string,
): Promise<boolean> {
  if (!hmacKey) return false;
  const signature = hexToBytes(signatureHex);
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(hmacKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature as unknown as ArrayBuffer,
    enc.encode(body) as unknown as ArrayBuffer,
  );
}
