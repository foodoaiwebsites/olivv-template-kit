/**
 * Generic content context. The kit never knows a concrete content shape —
 * each template instantiates `ContentProvider<BrandText>` / `useContent<BrandText>()`
 * with its own `src/content/types.ts` interface.
 */
import { type ReactNode } from "react";
export interface ContentValue<T> {
    content: T;
    theme: Record<string, string>;
    clientId: string;
    restaurantId?: string;
}
export declare function ContentProvider<T>({ value, children, }: {
    value: ContentValue<T>;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useContent<T>(): ContentValue<T>;
