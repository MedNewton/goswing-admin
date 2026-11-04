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

/** Upper bound for the role/onboarding lookup done on every page request. */
const ADMIN_CONTEXT_TIMEOUT_MS = 5000;

/**
 * True when the browser carries Clerk cookies of a signed-in user.
 * `__client_uat` is a non-zero timestamp while a session exists (it may be
 * suffixed per instance, e.g. `__client_uat_AbCd`).
 */
function hasClerkSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some(({ name, value }) => {
    if (name === "__session" || name.startsWith("__session_")) {
      return value.length > 0;
    }
    if (name === "__client_uat" || name.startsWith("__client_uat_")) {
      return value !== "" && value !== "0";
    }
    return false;
  });
}

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
      // Never let a slow API hang the middleware (and the whole page load).
      { timeoutMs: ADMIN_CONTEXT_TIMEOUT_MS },
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

  // Clerk is configured but its middleware failed (e.g. a transient error
  // fetching JWKS or completing the handshake). If the user is signed in,
  // sending them to /login makes <SignIn/> render nothing and bounce them
  // straight back here — the "blank login page" loop. Show a retryable
  // error instead.
  if (hasClerkConfig && hasClerkSessionCookie(req)) {
    return temporarilyUnavailable(req);
  }

  const loginUrl = new URL("/login", req.url);
  const redirectPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  loginUrl.searchParams.set("redirect_url", redirectPath);
  return NextResponse.redirect(loginUrl);
};

function temporarilyUnavailable(req: NextRequest) {
  if (isApiRoute(req)) {
    return NextResponse.json(
      { error: { code: "auth_unavailable", message: "Please retry." } },
      { status: 503, headers: { "Retry-After": "2" } },
    );
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GoSwing</title></head><body style="font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f9fafb;color:#111827"><div style="text-align:center;padding:24px"><h1 style="font-size:20px;margin:0 0 8px">Connexion momentanément indisponible</h1><p style="margin:0 0 20px;color:#6b7280">Sign-in is temporarily unavailable. Please try again.</p><a href="" onclick="location.reload();return false" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#111827;color:#fff;text-decoration:none">Réessayer / Retry</a></div></body></html>`;

  return new NextResponse(html, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Retry-After": "2",
    },
  });
}

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent,
) {
  if (!hasClerkConfig) {
    return fallbackMiddleware(req);
  }

  // Clerk failures here are usually transient (network hiccup reaching
  // Clerk's API), so retry once before falling back.
  for (let attempt = 1; ; attempt++) {
    try {
      return await protectedMiddleware(req, event);
    } catch (error) {
      console.error("[middleware] Clerk middleware failed", {
        path: req.nextUrl.pathname,
        attempt,
        message: error instanceof Error ? error.message : String(error),
      });
      if (attempt >= 2) {
        return fallbackMiddleware(req);
      }
    }
  }
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
