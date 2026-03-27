"use client";

import HeroAscii from "@/components/ui/hero-ascii";
import { LandingVariant } from "@/lib/marketing/landing-variants";

export function Hero({ variant }: { variant: LandingVariant }) {
  return <HeroAscii variant={variant} />;
}
