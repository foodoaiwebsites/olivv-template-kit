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
/**
 * Route-scoped content override. Nest one per page INSIDE the layout's
 * site-wide `ContentProvider` to re-seed ONLY `content` for that page's
 * client islands — `theme`, `clientId` and `restaurantId` are inherited from
 * the parent provider unchanged.
 *
 * Typical use (template `app/<page>/page.tsx`):
 *
 *   <PageContentProvider content={pageScopedContent(config, "home")}>
 *     ...page sections...
 *   </PageContentProvider>
 *
 * Client sections keep calling `useContent<T>()` exactly as before; under a
 * `PageContentProvider` they now read the page-scoped content (global brand
 * fields + that page's sections) instead of the site-wide flatten. Components
 * OUTSIDE it (Navbar/Footer rendered by the layout) still read the site-wide
 * provider. SERVER sections are unaffected — they read `getSiteConfig()`.
 */
export declare function PageContentProvider<T>({ content, children, }: {
    content: T;
    children: ReactNode;
}): import("react").JSX.Element;
