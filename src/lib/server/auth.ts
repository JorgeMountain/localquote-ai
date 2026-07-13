import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function getViewerProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data, error } = await supabase.from("profiles").select("id,role").eq("id", userId).single();
  if (error || !data) throw error ?? new Error("Perfil no encontrado.");
  return data;
}

export async function assertCanManageBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string,
) {
  const viewerProfile = await getViewerProfile(supabase, userId);
  let query = supabase.from("businesses").select("id").eq("id", businessId);
  if (viewerProfile.role !== "platform_admin") query = query.eq("owner_id", userId);
  const { data, error } = await query.single();
  if (error || !data) throw error ?? new Error("Negocio no encontrado.");
}
