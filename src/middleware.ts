import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function checkOnboardingNeeded(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("organizers")
    .select("id, city")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[middleware] onboarding check failed:", error.message);
    return false;
  }

  if (!data) return true;
  return !data.city;
}

type MiddlewareRole = "admin" | "dj" | "entrance_manager" | "finance_manager";

async function getUserRole(userId: string): Promise<MiddlewareRole> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return "admin";

  const { data, error } = await supabase
    .from("organizer_members")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[middleware] role check failed:", error.message);
    return "admin";
  }

  if (!data) {
    // No member row — check if organizer owner (backwards compat)
    const { data: orgData } = await supabase
      .from("organizers")
      .select("id")
      .eq("owner_user_id", userId)
      .limit(1)
      .maybeSingle();

    return orgData ? "admin" : "dj";
  }

  const validRoles: MiddlewareRole[] = ["admin", "dj", "entrance_manager", "finance_manager"];
  return validRoles.includes(data.role as MiddlewareRole)
    ? (data.role as MiddlewareRole)
    : "admin";
}

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth.protect({
    unauthenticatedUrl: new URL("/login", req.url).toString(),
  });

  // Skip checks for API routes and the onboarding page itself
  if (isApiRoute(req) || isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  // Check if user needs onboarding (only for organizer owners)
  if (userId) {
    const role = await getUserRole(userId);

    // Owners may need onboarding
    if (role === "admin") {
      const needsOnboarding = await checkOnboardingNeeded(userId);
      if (needsOnboarding) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      }
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
