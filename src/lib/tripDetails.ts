export type DetailListItem = {
  id: string;
  text: string;
};

export type TripPackage = {
  id: string;
  name: string;
  price: string;
  priceAmount: number | null;
  priceBasis: "per_person" | "per_booking";
  currency: "INR";
  details: string;
};

export type PaymentPolicyRow = {
  id: string;
  title: string;
  terms: string;
};

export type KeepInMindSection = {
  id: string;
  heading: string;
  instructions: DetailListItem[];
};

export type CancellationPolicyRow = {
  id: string;
  window: string;
  charge: string;
};

export type TripDetails = {
  inclusions: DetailListItem[];
  exclusions: DetailListItem[];
  packages: TripPackage[];
  paymentPolicy: PaymentPolicyRow[];
  thingsToCarry: DetailListItem[];
  thingsToKeepInMind: KeepInMindSection[];
  cancellationPolicy: CancellationPolicyRow[];
  cancellationNotes: string;
};

export const STANDARD_CANCELLATION_POLICY: readonly CancellationPolicyRow[] = [
  { id: "standard-21-plus", window: "Up to 21 days before", charge: "Free cancellation allowed" },
  { id: "standard-20-15", window: "20–15 days before", charge: "25% of trip amount charged" },
  { id: "standard-14-8", window: "14–8 days before", charge: "50% of trip amount charged" },
  { id: "standard-7-0", window: "7–0 days before", charge: "100% charged — no refund" },
];

let fallbackId = 0;

export function createTripDetailId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function own(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function normalizeList(value: unknown, prefix: string): DetailListItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") {
      const text = entry.trim();
      return text ? [{ id: createTripDetailId(prefix), text }] : [];
    }
    if (!isRecord(entry) || typeof entry.text !== "string") return [];
    const text = entry.text.trim();
    if (!text) return [];
    return [{
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId(prefix),
      text,
    }];
  });
}

function normalizePackages(value: unknown): TripPackage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    const price = typeof entry.price === "string" ? entry.price.trim() : "";
    const rawAmount = entry.priceAmount;
    const priceAmount = (typeof rawAmount === "number" || typeof rawAmount === "string")
      && rawAmount !== "" && Number.isFinite(Number(rawAmount)) && Number(rawAmount) >= 0
      ? Number(Number(rawAmount).toFixed(2))
      : null;
    const priceBasis = entry.priceBasis === "per_booking" ? "per_booking" : "per_person";
    const details = typeof entry.details === "string" ? entry.details.trim() : "";
    if (!name && !price && priceAmount == null && !details) return [];
    return [{
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId("package"),
      name,
      price,
      priceAmount,
      priceBasis,
      currency: "INR",
      details,
    }];
  });
}

function normalizePaymentPolicy(value: unknown): PaymentPolicyRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === "string") {
      const terms = entry.trim();
      return terms ? [{ id: createTripDetailId("payment"), title: "", terms }] : [];
    }
    if (!isRecord(entry)) return [];
    const title = typeof entry.title === "string" ? entry.title.trim() : "";
    const terms = typeof entry.terms === "string"
      ? entry.terms.trim()
      : typeof entry.text === "string" ? entry.text.trim() : "";
    if (!terms) return [];
    return [{
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId(`payment-${index + 1}`),
      title,
      terms,
    }];
  });
}

function normalizeKeepInMind(value: unknown): KeepInMindSection[] {
  if (!Array.isArray(value)) return [];
  const hasStructuredSections = value.some((entry) => isRecord(entry) && (own(entry, "heading") || own(entry, "instructions")));
  if (!hasStructuredSections) {
    const legacyItems = value.flatMap((entry) => {
      const text = typeof entry === "string"
        ? entry.trim()
        : isRecord(entry) && typeof entry.text === "string" ? entry.text.trim() : "";
      if (!text) return [];
      return [{
        id: isRecord(entry) && typeof entry.id === "string" && entry.id.trim()
          ? entry.id
          : createTripDetailId("instruction"),
        text,
      }];
    });
    const sections: KeepInMindSection[] = [];
    let current: KeepInMindSection | null = null;
    legacyItems.forEach((item) => {
      const headingLike = item.text.length <= 100
        && (item.text.endsWith(":") || (/[A-Z]/.test(item.text) && item.text === item.text.toUpperCase()));
      if (headingLike) {
        current = { id: createTripDetailId("keep-in-mind"), heading: item.text.replace(/:\s*$/, ""), instructions: [] };
        sections.push(current);
      } else {
        if (!current) {
          current = { id: createTripDetailId("keep-in-mind"), heading: "", instructions: [] };
          sections.push(current);
        }
        current.instructions.push(item);
      }
    });
    return sections.filter((section) => section.instructions.length > 0);
  }
  return value.flatMap((entry, sectionIndex) => {
    if (typeof entry === "string") {
      const text = entry.trim();
      return text ? [{
        id: createTripDetailId("keep-in-mind"),
        heading: "",
        instructions: [{ id: createTripDetailId("instruction"), text }],
      }] : [];
    }
    if (!isRecord(entry)) return [];
    if (typeof entry.text === "string") {
      const text = entry.text.trim();
      return text ? [{
        id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId("keep-in-mind"),
        heading: "",
        instructions: [{ id: createTripDetailId("instruction"), text }],
      }] : [];
    }
    const heading = typeof entry.heading === "string" ? entry.heading.trim() : "";
    const instructions = normalizeList(entry.instructions, `keep-in-mind-${sectionIndex + 1}`);
    if (instructions.length === 0) return [];
    return [{
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId("keep-in-mind"),
      heading,
      instructions,
    }];
  });
}

function normalizeCancellation(value: unknown): CancellationPolicyRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const window = typeof entry.window === "string" ? entry.window.trim() : "";
    const charge = typeof entry.charge === "string" ? entry.charge.trim() : "";
    if (!window && !charge) return [];
    return [{
      id: typeof entry.id === "string" && entry.id.trim() ? entry.id : createTripDetailId("cancellation"),
      window,
      charge,
    }];
  });
}

type LegacySection = "inclusions" | "exclusions" | "packages" | "paymentPolicy"
  | "thingsToCarry" | "cancellationPolicy" | "thingsToKeepInMind";

function stripListPrefix(value: string): string {
  return value.replace(/^\s*(?:[-*•]+|\d+[.)])\s*/, "").trim();
}

function pushLegacyListItem(items: DetailListItem[], rawLine: string, prefix: string) {
  const text = stripListPrefix(rawLine);
  if (!text) return;
  const hasExplicitMarker = /^\s*(?:[-*•]+|\d+[.)])\s*/.test(rawLine);
  const previous = items.at(-1);
  const previousEndsSentence = previous ? /[.!?;:]$/.test(previous.text) : true;
  if (previous && !hasExplicitMarker && !previousEndsSentence) {
    previous.text = `${previous.text} ${text}`;
    return;
  }
  items.push({ id: createTripDetailId(prefix), text });
}

function parseLegacyInstructions(instructions?: string | null): TripDetails {
  const parsed = createDefaultTripDetails();
  parsed.cancellationPolicy = [];
  if (!instructions?.trim()) return parsed;

  const lines = instructions.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let section: LegacySection | null = null;
  let foundHeading = false;

  const headingFor = (line: string): LegacySection | "group" | null => {
    const normalized = line.replace(/[:\s]+$/, "").replace(/\s+/g, " ").toUpperCase();
    if (normalized === "INCLUSIONS & EXCLUSIONS") return "group";
    if (normalized === "INCLUSIONS") return "inclusions";
    if (normalized === "EXCLUSIONS") return "exclusions";
    if (["TREK PACKAGE", "TREK PACKAGES", "TRIP PACKAGE", "TRIP PACKAGES"].includes(normalized)) return "packages";
    if (normalized === "PAYMENT POLICY") return "paymentPolicy";
    if (["PACKING LIST", "THINGS TO CARRY", "WHAT TO CARRY"].includes(normalized)) return "thingsToCarry";
    if (["CANCELLATION & REFUND POLICY", "CANCELLATION AND REFUND POLICY"].includes(normalized)) return "cancellationPolicy";
    if (["THINGS TO KEEP IN MIND", "IMPORTANT"].includes(normalized)) return "thingsToKeepInMind";
    return null;
  };

  for (const line of lines) {
    const heading = headingFor(line);
    if (heading) {
      foundHeading = true;
      section = heading === "group" ? null : heading;
      continue;
    }
    if (!section) continue;

    const text = stripListPrefix(line);
    if (!text) continue;

    if (section === "packages") {
      const priceMatch = text.match(/^(₹\s*[\d,]+(?:\s*\/-?)?)\s*(.*)$/);
      parsed.packages.push({
        id: createTripDetailId("package"),
        name: priceMatch?.[2]?.trim() || text,
        price: priceMatch?.[1]?.trim() || "",
        priceAmount: null,
        priceBasis: "per_person",
        currency: "INR",
        details: "",
      });
      continue;
    }

    if (section === "paymentPolicy") {
      const previous = parsed.paymentPolicy.at(-1);
      if (previous && !/[.!?;:]$/.test(previous.terms)) previous.terms = `${previous.terms} ${text}`;
      else parsed.paymentPolicy.push({ id: createTripDetailId("payment"), title: "", terms: text });
      continue;
    }

    if (section === "thingsToKeepInMind") {
      parsed.thingsToKeepInMind.push({
        id: createTripDetailId("keep-in-mind"),
        heading: "",
        instructions: [{ id: createTripDetailId("instruction"), text }],
      });
      continue;
    }

    if (section === "cancellationPolicy") {
      const policyMatch = text.match(/^(Up to\s+\d+\s+days?\s+before|\d{1,2}\s*[-–]\s*\d{1,2}\s+days?\s+before)\s+(.+)$/i);
      if (policyMatch) {
        parsed.cancellationPolicy.push({
          id: createTripDetailId("cancellation"),
          window: policyMatch[1].trim(),
          charge: policyMatch[2].trim(),
        });
      } else {
        parsed.cancellationNotes = [parsed.cancellationNotes, text].filter(Boolean).join("\n");
      }
      continue;
    }

    if (section === "inclusions" || section === "exclusions" || section === "thingsToCarry") {
      pushLegacyListItem(parsed[section], line, section);
    }
  }

  if (!foundHeading) {
    parsed.thingsToCarry = lines.map(stripListPrefix).filter(Boolean).map((text) => ({
      id: createTripDetailId("carry"),
      text,
    }));
  }
  return parsed;
}

function cloneStandardCancellationPolicy(): CancellationPolicyRow[] {
  return STANDARD_CANCELLATION_POLICY.map((row) => ({ ...row }));
}

export function createDefaultTripDetails(): TripDetails {
  return {
    inclusions: [],
    exclusions: [],
    packages: [],
    paymentPolicy: [],
    thingsToCarry: [],
    thingsToKeepInMind: [],
    cancellationPolicy: cloneStandardCancellationPolicy(),
    cancellationNotes: "",
  };
}

export function normalizeTripDetails(value: unknown, legacyInstructions?: string | null): TripDetails {
  const record = isRecord(value) ? value : {};
  const legacy = parseLegacyInstructions(legacyInstructions);
  return {
    inclusions: own(record, "inclusions") ? normalizeList(record.inclusions, "inclusion") : legacy.inclusions,
    exclusions: own(record, "exclusions") ? normalizeList(record.exclusions, "exclusion") : legacy.exclusions,
    packages: own(record, "packages") ? normalizePackages(record.packages) : legacy.packages,
    paymentPolicy: own(record, "paymentPolicy") ? normalizePaymentPolicy(record.paymentPolicy) : legacy.paymentPolicy,
    thingsToCarry: own(record, "thingsToCarry")
      ? normalizeList(record.thingsToCarry, "carry")
      : legacy.thingsToCarry,
    thingsToKeepInMind: own(record, "thingsToKeepInMind")
      ? normalizeKeepInMind(record.thingsToKeepInMind)
      : legacy.thingsToKeepInMind,
    cancellationPolicy: own(record, "cancellationPolicy")
      ? normalizeCancellation(record.cancellationPolicy)
      : (legacy.cancellationPolicy.length > 0 ? legacy.cancellationPolicy : cloneStandardCancellationPolicy()),
    cancellationNotes: own(record, "cancellationNotes") && typeof record.cancellationNotes === "string"
      ? record.cancellationNotes.trim()
      : legacy.cancellationNotes,
  };
}

export function serializeTripDetails(value: TripDetails): TripDetails {
  return {
    inclusions: normalizeList(value.inclusions, "inclusion"),
    exclusions: normalizeList(value.exclusions, "exclusion"),
    packages: normalizePackages(value.packages),
    paymentPolicy: normalizePaymentPolicy(value.paymentPolicy),
    thingsToCarry: normalizeList(value.thingsToCarry, "carry"),
    thingsToKeepInMind: normalizeKeepInMind(value.thingsToKeepInMind),
    cancellationPolicy: normalizeCancellation(value.cancellationPolicy),
    cancellationNotes: value.cancellationNotes.trim(),
  };
}

export function hasTripDetailsContent(value: TripDetails): boolean {
  return value.inclusions.length > 0
    || value.exclusions.length > 0
    || value.packages.length > 0
    || value.paymentPolicy.length > 0
    || value.thingsToCarry.length > 0
    || value.thingsToKeepInMind.length > 0
    || value.cancellationPolicy.length > 0
    || value.cancellationNotes.length > 0;
}
