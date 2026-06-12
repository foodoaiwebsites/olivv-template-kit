import { verifyHmacSignature } from "./hmac";
export { verifyHmacSignature };
export declare function createRevalidateRoute(opts: {
    hmacKey: string;
}): (req: Request) => Promise<Response>;
