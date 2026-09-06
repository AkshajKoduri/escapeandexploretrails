export type AdventureDescriptionBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; items: string[] };

export type AdventureDescriptionSection = {
  heading?: string;
  blocks: AdventureDescriptionBlock[];
};

const SECTION_HEADINGS = new Map(
  [
    ["summary", "Summary"],
    ["overview", "Overview"],
    ["about the trek", "About the trek"],
    ["about this trek", "About this trek"],
    ["itinerary", "Itinerary"],
    ["detailed itinerary", "Detailed itinerary"],
    ["inclusion", "Inclusions"],
    ["inclusions", "Inclusions"],
    ["what is included", "What's included"],
    ["what's included", "What's included"],
    ["exclusion", "Exclusions"],
    ["exclusions", "Exclusions"],
    ["not included", "Not included"],
    ["what's not included", "What's not included"],
    ["payment", "Payment"],
    ["payment terms", "Payment terms"],
    ["payment details", "Payment details"],
    ["package", "Package"],
    ["package cost", "Package cost"],
    ["package details", "Package details"],
    ["trek package", "Trek package"],
    ["cancellation", "Cancellation"],
    ["cancellation policy", "Cancellation policy"],
    ["important note", "Important note"],
    ["important notes", "Important notes"],
    ["notes", "Notes"],
  ].map(([key, label]) => [key.toLowerCase(), label]),
);

function cleanMarkdown(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s*/, "")
    .replace(/\*\*|__/g, "")
    .replace(/`/g, "")
    .replace(/^_([^_]+)_$/, "$1")
    .trim();
}

function sectionHeading(line: string): { heading: string; remainder: string } | null {
  const cleaned = cleanMarkdown(line);
  const colon = cleaned.indexOf(":");
  const candidate = (colon >= 0 ? cleaned.slice(0, colon) : cleaned).trim().toLowerCase();
  const heading = SECTION_HEADINGS.get(candidate);
  if (!heading) return null;
  if (colon < 0 && candidate !== cleaned.toLowerCase()) return null;
  return { heading, remainder: colon >= 0 ? cleaned.slice(colon + 1).trim() : "" };
}

/**
 * Conservatively turns familiar headings and bullets into renderable blocks.
 * Unknown text is preserved as prose; no factual content is rewritten.
 */
export function formatAdventureDescription(
  description: string | null | undefined,
  adventureName?: string,
): AdventureDescriptionSection[] {
  if (!description?.trim()) return [];

  const sections: AdventureDescriptionSection[] = [];
  let current: AdventureDescriptionSection = { blocks: [] };
  let paragraph: string[] = [];
  let list: string[] = [];

  const ensureCurrent = () => {
    if (!sections.includes(current)) sections.push(current);
  };
  const flushParagraph = () => {
    if (!paragraph.length) return;
    ensureCurrent();
    current.blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    ensureCurrent();
    current.blocks.push({ type: "list", items: list });
    list = [];
  };

  for (const rawLine of description.replace(/\r\n?/g, "\n").split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const cleaned = cleanMarkdown(trimmed);
    if (!cleaned) continue;
    if (adventureName && cleaned.toLowerCase() === adventureName.trim().toLowerCase()) continue;

    const heading = sectionHeading(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      current = { heading: heading.heading, blocks: [] };
      sections.push(current);
      if (heading.remainder) paragraph.push(heading.remainder);
      continue;
    }

    if (/^day\s+\d+\b/i.test(cleaned)) {
      flushParagraph();
      flushList();
      ensureCurrent();
      current.blocks.push({ type: "subheading", text: cleaned });
      continue;
    }

    const listMatch = trimmed.match(/^\s*(?:[-*•▪◦]|\d+[.)])\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      list.push(cleanMarkdown(listMatch[1]));
      continue;
    }

    if (/^[A-Za-z][A-Za-z &/()+-]{1,30}:\s+\S/.test(cleaned)) {
      flushParagraph();
      list.push(cleaned);
      continue;
    }

    flushList();
    paragraph.push(cleaned);
    flushParagraph();
  }

  flushParagraph();
  flushList();
  return sections.filter((section) => section.blocks.length > 0);
}
