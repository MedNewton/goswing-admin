import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";
import { adminApiCallWithToken } from "@/lib/api/client";
import type { ApiAdminContext } from "@/lib/api/types";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/api/webhooks/clerk(.*)",
  "/discover(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

/** Routes a DJ is allowed to access. */
const isDjAllowedRoute = createRouteMatcher([
  "/music(.*)",
  "/settings(.*)",
  "/help(.*)",
  "/api(.*)",
  "/onboarding(.*)",
]);

/** Routes an Entrance Manager is allowed to access. */
const isEntranceManagerAllowedRoute = createRouteMatcher([
  "/orders(.*)",
  "/attendees(.*)",
  "/settings(.*)",
  "/help(.*)",
  "/api(.*)",
  "/onboarding(.*)",
]);

/** Routes a Finance Manager is allowed to access. */
const isFinanceManagerAllowedRoute = createRouteMatcher([
  "/finance(.*)",
  "/analytics(.*)",
  "/settings(.*)",
  "/help(.*)",
  "/api(.*)",
  "/onboarding(.*)",
]);

const hasClerkConfig = Boolean(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
);

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const authObject = await auth.protect({
    unauthenticatedUrl: new URL("/login", req.url).toString(),
  });

  // Skip checks for API routes and the onboarding page itself
  if (isApiRoute(req) || isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  const token = await authObject.getToken();
  if (!token) {
    return NextResponse.next();
  }

  // One API call answers role + onboarding state (route 60).
  let context: ApiAdminContext;
  try {
    context = await adminApiCallWithToken<ApiAdminContext>(
      "/v1/admin/me/context",
      token,
    );
  } catch (error) {
    console.error("[middleware] admin context fetch failed:", {
      message: error instanceof Error ? error.message : String(error),
    });
    // Fail open (same behavior as the old Supabase outage path).
    return NextResponse.next();
  }

  const { role, needsOnboarding } = context;

  // Owners may need onboarding
  if (role === "admin" && needsOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Role-based access control — block non-allowed routes
  if (role === "dj" && !isDjAllowedRoute(req)) {
    return NextResponse.redirect(new URL("/music", req.url));
  }
  if (role === "entrance_manager" && !isEntranceManagerAllowedRoute(req)) {
    return NextResponse.redirect(new URL("/orders", req.url));
  }
  if (role === "finance_manager" && !isFinanceManagerAllowedRoute(req)) {
    return NextResponse.redirect(new URL("/finance", req.url));
  }

  return NextResponse.next();
});

const fallbackMiddleware = (req: NextRequest) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  const redirectPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("redirect_url", redirectPath);
  return NextResponse.redirect(loginUrl);
};

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent,
) {
  if (!hasClerkConfig) {
    return fallbackMiddleware(req);
  }

  try {
    return await protectedMiddleware(req, event);
  } catch (error) {
    console.error("[middleware] falling back after Clerk failure", {
      path: req.nextUrl.pathname,
      message: error instanceof Error ? error.message : String(error),
    });

    return fallbackMiddleware(req);
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
