import { createAdminClient } from "@/lib/supabase-admin";

export async function getPublicFormMetadata(id: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("forms")
    .select("title, description")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}