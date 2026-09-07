import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/** Moves keyboard focus to the new page after client-side navigation. */
export default function RouteFocus() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const previousMain = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (previousPath.current === pathname) {
      previousMain.current = document.getElementById("main-content");
      return;
    }
    previousPath.current = pathname;

    let frame = 0;
    let observer: MutationObserver | null = null;
    let timeout = 0;
    const outgoingMain = previousMain.current;
    const focusMain = () => {
      const main = document.querySelector<HTMLElement>("#main-content:not([data-route-fallback])");
      if (!main || main === outgoingMain) return false;
      main.focus({ preventScroll: true });
      previousMain.current = main;
      return true;
    };

    frame = requestAnimationFrame(() => {
      if (focusMain()) return;
      observer = new MutationObserver(() => {
        if (focusMain()) observer.disconnect();
      });
      observer.observe(document.getElementById("root") ?? document.body, {
        childList: true,
        subtree: true,
      });
      timeout = window.setTimeout(() => observer?.disconnect(), 2000);
    });

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      if (timeout) window.clearTimeout(timeout);
    };
  }, [pathname]);

  return null;
}
