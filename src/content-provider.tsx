"use client";
/**
 * Generic content context. The kit never knows a concrete content shape —
 * each template instantiates `ContentProvider<BrandText>` / `useContent<BrandText>()`
 * with its own `src/content/types.ts` interface.
 */
import { createContext, useContext, type ReactNode } from "react";

export interface ContentValue<T> {
  content: T;
  theme: Record<string, string>;
  clientId: string;
  restaurantId?: string;
}

const ContentContext = createContext<ContentValue<unknown> | null>(null);

export function ContentProvider<T>({
  value,
  children,
}: {
  value: ContentValue<T>;
  children: ReactNode;
}) {
  return (
    <ContentContext.Provider value={value as ContentValue<unknown>}>
      {children}
    </ContentContext.Provider>
  );
}

export function useContent<T>(): ContentValue<T> {
  const value = useContext(ContentContext);
  if (!value) {
    throw new Error("@olivv/template-kit: useContent must be used inside <ContentProvider>.");
  }
  return value as ContentValue<T>;
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
export function PageContentProvider<T>({
  content,
  children,
}: {
  content: T;
  children: ReactNode;
}) {
  // Inherit theme/clientId/restaurantId from the layout's site-wide provider;
  // build a NEW value object (no mutation) overriding only `content`.
  const parent = useContext(ContentContext);
  const value = parent ? { ...parent, content } : null;
  if (!value) {
    throw new Error(
      "@olivv/template-kit: PageContentProvider must be nested inside <ContentProvider>.",
    );
  }
  return (
    <ContentContext.Provider value={value as ContentValue<unknown>}>
      {children}
    </ContentContext.Provider>
  );
}
