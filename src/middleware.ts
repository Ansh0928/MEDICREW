import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getRandomLandingVariant,
  isLandingVariant,
  LANDING_VARIANT_COOKIE,
} from "@/lib/marketing/landing-variants";

const isProtectedRoute = createRouteMatcher([
  "/patient(.*)",
  "/doctor(.*)",
  "/consult(.*)",
  "/onboarding(.*)",
  "/consent(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  if (req.method === "GET" && req.nextUrl.pathname === "/") {
    const currentVariant = req.cookies.get(LANDING_VARIANT_COOKIE)?.value;
    if (!isLandingVariant(currentVariant)) {
      const response = NextResponse.next();
      response.cookies.set(LANDING_VARIANT_COOKIE, getRandomLandingVariant(), {
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
