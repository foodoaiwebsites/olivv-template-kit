/**
 * Factory for the template's `POST /api/revalidate` route handler.
 *
 * The platform publishes a client's content by POSTing `{ clientId }` signed
 * with `x-signature: <hex HMAC-SHA256 of the raw body>`; we bust the ISR tag
 * `content:<clientId>` so the next request re-fetches from the Content API.
 *
 * ```ts
 * // src/app/api/revalidate/route.ts
 * import { createRevalidateRoute } from "@olivv/template-kit";
 * export const POST = createRevalidateRoute({ hmacKey: process.env.REVALIDATE_HMAC_KEY ?? "" });
 * ```
 */
import { revalidateTag } from "next/cache";
import { verifyHmacSignature } from "./hmac";
import { contentTag } from "./site-content";
export { verifyHmacSignature };
export function createRevalidateRoute(opts) {
    return async function POST(req) {
        const body = await req.text();
        const signature = req.headers.get("x-signature") ?? "";
        const valid = await verifyHmacSignature(body, signature, opts.hmacKey);
        if (!valid) {
            return Response.json({ revalidated: false, error: "invalid signature" }, { status: 401 });
        }
        let clientId;
        try {
            const parsed = JSON.parse(body);
            if (parsed !== null &&
                typeof parsed === "object" &&
                typeof parsed.clientId === "string" &&
                parsed.clientId.length > 0) {
                clientId = parsed.clientId;
            }
        }
        catch {
            clientId = undefined;
        }
        if (!clientId) {
            return Response.json({ revalidated: false, error: "malformed body" }, { status: 400 });
        }
        revalidateTag(contentTag(clientId));
        return Response.json({ revalidated: true });
    };
}
