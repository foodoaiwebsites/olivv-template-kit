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
