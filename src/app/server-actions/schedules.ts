"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { assertCanManageBusiness, getAuthenticatedClient } from "@/lib/server/auth";
import type { AvailabilityStatus } from "@/lib/types";
import { optionalText, requiredDate, requiredTime, requiredUuid } from "@/lib/validation";

export async function saveBusinessHoursWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => saveBusinessHours(formData), "Horario semanal guardado.");
}

export async function createAvailabilitySlotWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => createAvailabilitySlot(formData), "Disponibilidad guardada.");
}

export async function deleteAvailabilitySlotWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withActionFeedback(() => deleteAvailabilitySlot(formData), "Disponibilidad eliminada.");
}

async function saveBusinessHours(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const businessId = requiredUuid(formData, "business_id", "Negocio");
  await assertCanManageBusiness(supabase, businessId, user.id);
  const hours: { business_id: string; day_of_week: number; opens_at: string; closes_at: string }[] = [];

  for (let day = 0; day < 7; day += 1) {
    if (formData.get(`day_${day}_enabled`) !== "on") continue;
    const opensAt = requiredTime(formData, `day_${day}_opens`, "Hora de apertura");
    const closesAt = requiredTime(formData, `day_${day}_closes`, "Hora de cierre");
    if (opensAt >= closesAt) throw new Error("La hora de apertura debe ser menor que la hora de cierre.");
    hours.push({ business_id: businessId, day_of_week: day, opens_at: opensAt, closes_at: closesAt });
  }

  const { error: deleteError } = await supabase.from("business_hours").delete().eq("business_id", businessId);
  if (deleteError) throw deleteError;
  if (hours.length > 0) {
    const { error } = await supabase.from("business_hours").insert(hours);
    if (error) throw error;
  }
  revalidatePath("/businesses");
}

async function createAvailabilitySlot(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const businessId = requiredUuid(formData, "business_id", "Negocio");
  await assertCanManageBusiness(supabase, businessId, user.id);
  const startTime = requiredTime(formData, "start_time", "Hora inicial");
  const endTime = requiredTime(formData, "end_time", "Hora final");
  if (startTime >= endTime) throw new Error("La hora inicial debe ser menor que la hora final.");

  const { error } = await supabase.from("availability_slots").upsert(
    {
      business_id: businessId,
      date: requiredDate(formData, "date"),
      start_time: startTime,
      end_time: endTime,
      status: parseAvailabilityStatus(String(formData.get("status") ?? "")),
      notes: optionalText(formData, "notes", "Notas", 1000) || null,
    },
    { onConflict: "business_id,date,start_time" },
  );
  if (error) throw error;
  revalidatePath("/businesses");
}

async function deleteAvailabilitySlot(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", requiredUuid(formData, "id", "Disponibilidad"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/businesses");
}

function parseAvailabilityStatus(value: string): AvailabilityStatus {
  return value === "blocked" || value === "booked" ? value : "available";
}
