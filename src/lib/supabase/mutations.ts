import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type PublicTableName = keyof Database["public"]["Tables"];
type TableInsert<T extends PublicTableName> = Database["public"]["Tables"][T]["Insert"];
type TableUpdate<T extends PublicTableName> = Database["public"]["Tables"][T]["Update"];

type CountOption = "exact" | "planned" | "estimated";

type InsertOptions = {
  count?: CountOption;
  defaultToNull?: boolean;
};

type UpsertOptions = InsertOptions & {
  onConflict?: string;
  ignoreDuplicates?: boolean;
};

export function insertInto<T extends PublicTableName>(
  supabase: SupabaseClient<Database, "public">,
  table: T,
  values: TableInsert<T> | TableInsert<T>[],
  options?: InsertOptions,
) {
  return supabase.from(table).insert(values as never, options as never);
}

export function updateTable<T extends PublicTableName>(
  supabase: SupabaseClient<Database, "public">,
  table: T,
  values: TableUpdate<T>,
  options?: { count?: CountOption },
) {
  return supabase.from(table).update(values as never, options as never);
}

export function upsertInto<T extends PublicTableName>(
  supabase: SupabaseClient<Database, "public">,
  table: T,
  values: TableInsert<T> | TableInsert<T>[],
  options?: UpsertOptions,
) {
  return supabase.from(table).upsert(values as never, options as never);
}
