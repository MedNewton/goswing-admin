import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { insertInto, upsertInto } from "@/lib/supabase/mutations";

export interface ProvisionUserInput {
  userId: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

function normalizeDisplayName(input: ProvisionUserInput) {
  const raw = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  if (raw.length > 0) {
    return raw;
  }
  return `User ${input.userId.slice(-8)}`;
}

function normalizeInitials(displayName: string) {
  return displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function normalizeOrganizerName(displayName: string, userId: string) {
  return `${displayName} Organizer ${userId.slice(-6)}`;
}

export interface ProvisionUserResult {
  needsOnboarding: boolean;
}

export async function provisionUser(input: ProvisionUserInput): Promise<ProvisionUserResult> {
  const supabase = createSupabaseAdminClient();

  const displayName = normalizeDisplayName(input);
  const initials = normalizeInitials(displayName);

  const { error: upsertProfileError } = await upsertInto(
    supabase,
    "profiles",
    {
      user_id: input.userId,
      display_name: displayName,
      initials,
      email: input.email ?? null,
      avatar_url: input.imageUrl ?? null,
    },
    { onConflict: "user_id" },
  );

  if (upsertProfileError) {
    throw new Error(`Failed to provision profile: ${upsertProfileError.message}`);
  }

  const { data: existingOrganizers, error: selectOrganizerError } = await supabase
    .from("organizers")
    .select("id, city")
    .eq("owner_user_id", input.userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectOrganizerError) {
    throw new Error(
      `Failed to check existing organizer: ${selectOrganizerError.message}`,
    );
  }

  if (existingOrganizers && existingOrganizers.length > 0) {
    const organizer = existingOrganizers[0] as unknown as { id: string; city: string | null };
    return { needsOnboarding: !organizer.city };
  }

  const organizerName = normalizeOrganizerName(displayName, input.userId);
  const { error: insertOrganizerError } = await insertInto(supabase, "organizers", {
    owner_user_id: input.userId,
    name: organizerName,
  });

  if (!insertOrganizerError) {
    return { needsOnboarding: true };
  }

  // Retry once with a stronger unique suffix when the generated name collides.
  if (insertOrganizerError.code === "23505") {
    const fallbackName = `${organizerName}-${Date.now().toString().slice(-4)}`;
    const { error: retryInsertError } = await insertInto(supabase, "organizers", {
      owner_user_id: input.userId,
      name: fallbackName,
    });

    if (!retryInsertError) {
      return { needsOnboarding: true };
    }

    throw new Error(
      `Failed to provision organizer after retry: ${retryInsertError.message}`,
    );
  }

  throw new Error(`Failed to provision organizer: ${insertOrganizerError.message}`);
}
