"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isPortalPath(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/");
}

function isModifiedEvent(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export function RouteTransitionOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
      hideTimerRef.current = null;
    }, 250);

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedEvent(event)) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!anchor.href || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const current = new URL(window.location.href);
      const next = new URL(anchor.href, window.location.href);

      if (current.origin !== next.origin) return;
      if (current.pathname === next.pathname && current.search === next.search && current.hash === next.hash) return;

      setVisible(true);

      const crossingPortalBoundary = isPortalPath(current.pathname) !== isPortalPath(next.pathname);
      if (crossingPortalBoundary) {
        event.preventDefault();
        window.location.assign(`${next.pathname}${next.search}${next.hash}`);
      }
    };

    const onPopState = () => {
      setVisible(true);
    };

    const onBeforeUnload = () => {
      setVisible(true);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`route-transition-overlay ${visible ? "route-transition-overlay--visible" : ""}`}
    >
      <div className="route-transition-overlay__spinner" />
    </div>
  );
}
