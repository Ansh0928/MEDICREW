export const LANDING_VARIANTS = ["speed", "specialist", "reassurance"] as const;
export const LANDING_VARIANT_COOKIE = "mc_lpv";

export type LandingVariant = (typeof LANDING_VARIANTS)[number];

export function resolveLandingVariant(value: string | string[] | undefined): LandingVariant {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isLandingVariant(candidate) ? candidate : "specialist";
}

export function isLandingVariant(value: string | undefined): value is LandingVariant {
  return !!value && LANDING_VARIANTS.includes(value as LandingVariant);
}

export function getRandomLandingVariant(): LandingVariant {
  const index = Math.floor(Math.random() * LANDING_VARIANTS.length);
  return LANDING_VARIANTS[index] ?? "specialist";
}
