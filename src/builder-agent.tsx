"use client";
import { useEffect } from "react";

/**
 * Tiny in-page agent that lets the Olivv Builder live-edit a template site even
 * when it's loaded cross-origin (e.g. the deployed URL inside the builder
 * iframe).
 *
 * It is DORMANT for normal visitors: it only attaches when the page is embedded
 * in an iframe AND opened with `?__edit=1` (the builder adds that param). Edits
 * are visual-only in the viewer's own browser; nothing is persisted here —
 * persistence happens via the builder saving to the draft doc + Publish.
 *
 * Messages handled (all `{ __builder: true, type, ... }`):
 * - `setText  { prev, next }`  — replace the first visible text node matching `prev`
 * - `setImage { prev, next }`  — swap the first img/video/source whose src matches `prev`
 * - `setVar   { name, value }` — set a CSS custom property on <body>
 * - `setField { path, value }` — precise targeting via `[data-field="<path>"]`;
 *   sets textContent (or `src` for IMG/VIDEO/SOURCE) and dispatches a
 *   `builder:field-updated` CustomEvent so templates can re-run animations.
 *
 * Origin locking: pass `allowedOrigin` (e.g. `"https://builder.olivv.app"`) to
 * accept messages only from that origin and target `__builderReady` at it. When
 * the prop is omitted, `NEXT_PUBLIC_BUILDER_ORIGIN` (inlined at build time) is
 * used as the default; if neither is set, the agent falls back to accepting any
 * origin (legacy behavior — set one of the two in production).
 */
export default function BuilderAgent({ allowedOrigin }: { allowedOrigin?: string } = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const embedded = window.parent && window.parent !== window;
    const enabled = new URLSearchParams(window.location.search).has("__edit");
    if (!embedded || !enabled) return;

    const lockedOrigin = allowedOrigin ?? process.env.NEXT_PUBLIC_BUILDER_ORIGIN ?? undefined;

    const norm = (s: string) => s.replace(/\s+/g, " ").trim();

    const setText = (prev: string, next: string) => {
      const target = norm(prev);
      if (!target) return;
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        const tag = (n as Text).parentElement?.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") continue;
        const raw = n.nodeValue ?? "";
        if (norm(raw) === target) {
          const lead = raw.match(/^\s*/)?.[0] ?? "";
          const trail = raw.match(/\s*$/)?.[0] ?? "";
          n.nodeValue = lead + next + trail;
          return;
        }
      }
    };

    const setImage = (prev: string, next: string) => {
      const hit = (cur: string) => {
        if (!cur) return false;
        if (cur === prev || cur.endsWith(prev) || prev.endsWith(cur)) return true;
        try {
          return decodeURIComponent(cur).includes(prev); // next/image rewrites src to /_next/image?url=...
        } catch {
          return false;
        }
      };
      for (const el of Array.from(document.querySelectorAll("img, video, source")) as HTMLElement[]) {
        if (hit(el.getAttribute("src") ?? "")) {
          el.setAttribute("src", next);
          el.removeAttribute("srcset"); // stop the responsive set from overriding our swap
          if (el.tagName === "VIDEO") (el as HTMLVideoElement).load?.();
          return;
        }
      }
      for (const el of Array.from(document.querySelectorAll("video[poster]"))) {
        if (hit(el.getAttribute("poster") ?? "")) {
          el.setAttribute("poster", next);
          return;
        }
      }
    };

    const setField = (path: string, value: string) => {
      if (!path) return;
      const el = document.querySelector('[data-field="' + path.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const tag = el.tagName;
      if (tag === "IMG" || tag === "VIDEO" || tag === "SOURCE") {
        el.setAttribute("src", value);
        el.removeAttribute("srcset");
        if (tag === "VIDEO") (el as HTMLVideoElement).load?.();
      } else {
        el.textContent = value;
      }
      // Let templates re-run animations (GSAP/SplitType measure text geometry).
      window.dispatchEvent(new CustomEvent("builder:field-updated", { detail: { path, value } }));
    };

    const onMsg = (e: MessageEvent) => {
      if (lockedOrigin && e.origin !== lockedOrigin) return;
      const d = e.data as {
        __builder?: boolean;
        type?: string;
        prev?: string;
        next?: string;
        name?: string;
        value?: string;
        path?: string;
      };
      if (!d || d.__builder !== true) return;
      if (d.type === "setText") setText(d.prev ?? "", d.next ?? "");
      else if (d.type === "setImage") setImage(d.prev ?? "", d.next ?? "");
      else if (d.type === "setVar" && d.name) document.body.style.setProperty(d.name, d.value ?? "");
      else if (d.type === "setField" && d.path) setField(d.path, d.value ?? "");
    };

    window.addEventListener("message", onMsg);
    try {
      window.parent.postMessage({ __builderReady: true }, lockedOrigin ?? "*");
    } catch {
      /* ignore */
    }
    return () => window.removeEventListener("message", onMsg);
  }, [allowedOrigin]);

  return null;
}
