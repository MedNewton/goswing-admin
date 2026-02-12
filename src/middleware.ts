import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/api/webhooks/clerk(.*)",
]);
const hasClerkSecret = Boolean(process.env.CLERK_SECRET_KEY);

const protectedMiddleware = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/login", req.url).toString(),
    });
  }
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
