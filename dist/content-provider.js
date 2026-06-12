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
