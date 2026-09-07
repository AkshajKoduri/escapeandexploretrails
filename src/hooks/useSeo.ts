import { useEffect } from "react";

const SITE_URL = "https://e2trails.in";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

type SeoOptions = {
  title: string;
  description: string;
  /** Route path, e.g. "/upcoming-treks" */
  path: string;
  /** Utility routes (booking, 404, missing content) should stay out of search indexes. */
  noindex?: boolean;
};

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Sets per-route head metadata: title, description, canonical and OpenGraph/Twitter tags.
 * Runs client-side, so JS-executing crawlers (Googlebot) see the per-page values.
 * All URLs resolve to the production domain so canonicals never point at preview hosts.
 */
export function useSeo({ title, description, path, noindex = false }: SeoOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;

    upsertMeta("name", "description", description);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:image", OG_IMAGE);
    upsertMeta("property", "og:image:width", "1200");
    upsertMeta("property", "og:image:height", "630");
    upsertMeta("property", "og:image:alt", "E2 Trails guided adventures from Hyderabad");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", OG_IMAGE);
    upsertMeta("name", "twitter:image:alt", "E2 Trails guided adventures from Hyderabad");

    const robotsSelector = 'meta[name="robots"]';
    let robots = document.head.querySelector<HTMLMetaElement>(robotsSelector);
    if (noindex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex, nofollow");
    } else {
      robots?.remove();
    }

    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement("link");
      canon.setAttribute("rel", "canonical");
      document.head.appendChild(canon);
    }
    canon.setAttribute("href", url);
  }, [title, description, path, noindex]);
}
