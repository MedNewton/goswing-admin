type ClerkSupabaseTokenGetter = () => Promise<string | null>;

let clerkSupabaseTokenGetter: ClerkSupabaseTokenGetter = async () => null;

export function setClerkSupabaseTokenGetter(getter: ClerkSupabaseTokenGetter) {
  clerkSupabaseTokenGetter = getter;
}

export async function getClerkSupabaseToken() {
  return clerkSupabaseTokenGetter();
}
