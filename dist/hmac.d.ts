/**
 * Pure HMAC verification — Web Crypto only, no Next imports, so it is testable
 * outside a Next runtime. Used by `createRevalidateRoute`.
 */
/**
 * Verify `signatureHex` is the hex HMAC-SHA256 of `body` under `hmacKey`.
 * Uses `crypto.subtle.verify`, which performs a constant-time comparison.
 */
export declare function verifyHmacSignature(body: string, signatureHex: string, hmacKey: string): Promise<boolean>;
