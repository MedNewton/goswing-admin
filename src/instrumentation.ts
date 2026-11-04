/**
 * Runs once when the Next.js server starts (`next start` / `next dev`).
 * Flags missing Clerk keys immediately in the server logs, instead of only
 * showing up as a login page that keeps reloading.
 */
export function register(): void {
  // register() runs once per server runtime; report from the Node one only.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const missing = ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"].filter(
    (key) => !process.env[key],
  );

  if (missing.length > 0) {
    console.error(
      `[startup] Missing ${missing.join(", ")}. Sign-in will not work: ` +
        "protected pages will keep redirecting to /login. Add the keys to the " +
        "server environment (.env.production or your process manager) and restart.",
    );
    return;
  }

  const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const secret = process.env.CLERK_SECRET_KEY ?? "";
  const publishableIsLive = publishable.startsWith("pk_live_");
  const secretIsLive = secret.startsWith("sk_live_");
  if (publishableIsLive !== secretIsLive) {
    console.error(
      "[startup] Clerk keys don't match: one is a live key and the other a test key. " +
        "Both must come from the same Clerk app (Dashboard → API Keys).",
    );
  }
}
