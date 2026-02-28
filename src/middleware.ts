import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/api/webhooks/clerk(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isApiRoute = createRouteMatcher(["/api(.*)"]);

const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkOnboardingNeeded(userId: string): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) return false;

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

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

  // No organizer yet (provisioning hasn't run) or city is null → needs onboarding
  if (!data) return true;
  return !data.city;
}

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth.protect({
    unauthenticatedUrl: new URL("/login", req.url).toString(),
  });

  // Skip onboarding check for API routes and the onboarding page itself
  if (isApiRoute(req) || isOnboardingRoute(req)) {
    return NextResponse.next();
  }

  // Check if user needs onboarding
  if (userId) {
    const needsOnboarding = await checkOnboardingNeeded(userId);
    if (needsOnboarding) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
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

export default hasClerkSecret
  ? protectedMiddleware
  : fallbackMiddleware;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
