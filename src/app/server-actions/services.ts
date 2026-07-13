"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { getAuthenticatedClient } from "@/lib/server/auth";
import { optionalInteger, optionalText, requiredText, requiredUuid } from "@/lib/validation";

export async function createBusinessServiceWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => createBusinessService(formData), "Servicio creado.");
}

export async function updateBusinessServiceWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => updateBusinessService(formData), "Servicio actualizado.");
}

export async function deleteBusinessServiceWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => deleteBusinessService(formData), "Servicio eliminado.");
}

async function createBusinessService(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const input = parseServiceInput(formData);
  const businessId = requiredUuid(formData, "business_id", "Negocio");

  const { error } = await supabase.from("business_services").insert({
    business_id: businessId,
    ...input,
  });
  if (error) throwFriendlyServiceError(error);
  revalidateBusinessConfiguration();
}

async function updateBusinessService(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Servicio");
  const input = parseServiceInput(formData);

  const { error } = await supabase
    .from("business_services")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throwFriendlyServiceError(error);
  revalidateBusinessConfiguration();
}

async function deleteBusinessService(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Servicio");
  const { error } = await supabase.from("business_services").delete().eq("id", id).select("id").single();
  if (error) throw error;
  revalidateBusinessConfiguration();
}

function parseServiceInput(formData: FormData) {
  const minPrice = optionalInteger(formData, "min_price", "Precio minimo", { min: 0, max: 2_000_000_000 });
  const maxPrice = optionalInteger(formData, "max_price", "Precio maximo", { min: 0, max: 2_000_000_000 });
  if (minPrice !== null && maxPrice !== null && maxPrice < minPrice) {
    throw new Error("El precio maximo no puede ser menor que el precio minimo.");
  }

  return {
    name: requiredText(formData, "name", "Nombre del servicio", 120),
    description: optionalText(formData, "description", "Descripcion", 1000),
    min_price: minPrice,
    max_price: maxPrice,
    duration_minutes: optionalInteger(formData, "duration_minutes", "Duracion", { min: 1, max: 1440 }),
    requires_evaluation: formData.get("requires_evaluation") === "on",
    is_active: formData.get("is_active") === "on",
  };
}

function throwFriendlyServiceError(error: { code?: string; message: string }): never {
  if (error.code === "23505") throw new Error("Ya existe un servicio con ese nombre en el negocio.");
  throw error;
}

function revalidateBusinessConfiguration() {
  revalidatePath("/businesses");
  revalidatePath("/");
}
