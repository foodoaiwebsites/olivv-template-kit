"use client";
import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Generic content context. The kit never knows a concrete content shape —
 * each template instantiates `ContentProvider<BrandText>` / `useContent<BrandText>()`
 * with its own `src/content/types.ts` interface.
 */
import { createContext, useContext } from "react";
const ContentContext = createContext(null);
export function ContentProvider({ value, children, }) {
    return (_jsx(ContentContext.Provider, { value: value, children: children }));
}
export function useContent() {
    const value = useContext(ContentContext);
    if (!value) {
        throw new Error("@olivv/template-kit: useContent must be used inside <ContentProvider>.");
    }
    return value;
}
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
export function PageContentProvider({ content, children, }) {
    // Inherit theme/clientId/restaurantId from the layout's site-wide provider;
    // build a NEW value object (no mutation) overriding only `content`.
    const parent = useContext(ContentContext);
    const value = parent ? { ...parent, content } : null;
    if (!value) {
        throw new Error("@olivv/template-kit: PageContentProvider must be nested inside <ContentProvider>.");
    }
    return (_jsx(ContentContext.Provider, { value: value, children: children }));
}
