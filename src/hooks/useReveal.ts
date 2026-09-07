import { useEffect } from "react";

export function useReveal() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) =>
        el.classList.add("in-view"),
      );
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    const selector = ".reveal:not(.in-view), .reveal-left:not(.in-view), .reveal-right:not(.in-view)";
    const observeWithin = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.matches(selector)) io.observe(root);
      root.querySelectorAll<HTMLElement>(selector).forEach((el) => io.observe(el));
    };

    observeWithin(document);

    // Re-observe when new nodes (e.g. async-loaded trek cards) appear.
    const mo = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) observeWithin(node);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
