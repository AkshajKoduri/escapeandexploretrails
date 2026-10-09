import type { AdventureExtra, EventType } from "@/lib/treks";

export type TripCoverFact = { label: "Altitude" | "Elevation gain"; value: string };

function configuredValue(extras: AdventureExtra[], key: string): string | null {
  const value = extras.find((item) => item.key === key)?.value.trim();
  if (!value || /^(?:n\/?a|not applicable|unknown|[-–—])$/i.test(value)) return null;
  return value;
}

export function getTripCoverFacts(extras: AdventureExtra[], eventType: EventType): TripCoverFact[] {
  const altitude = /cycling|bike ride/i.test(eventType) ? null : configuredValue(extras, "altitude");
  const elevationGain = configuredValue(extras, "elevation_gain");
  return [
    ...(altitude ? [{ label: "Altitude" as const, value: altitude }] : []),
    ...(elevationGain ? [{ label: "Elevation gain" as const, value: elevationGain }] : []),
  ];
}
