export type HomepageSettings = {
  id: "homepage";
  hero_image_path: string | null;
  hero_alt_text: string;
  show_trip_icons?: boolean;
};

export const DEFAULT_HERO_ALT = "Golden-hour view across a South Indian fort hilltop";
