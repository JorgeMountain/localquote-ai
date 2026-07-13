"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { assertCanManageBusiness, getAuthenticatedClient, getViewerProfile } from "@/lib/server/auth";
import type { BusinessLinkPurpose, BusinessType } from "@/lib/types";
import {
  isUuid,
  optionalText,
  requiredHttpUrl,
  requiredPhone,
  requiredText,
  requiredUuid,
} from "@/lib/validation";

export async function updateBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => updateBusiness(formData), "Negocio actualizado.");
}

export async function deleteBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => deleteBusiness(formData), "Negocio eliminado.");
}

export async function createBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => createBusiness(formData), "Negocio creado.");
}

export async function createBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => createBusinessLink(formData), "Enlace creado.");
}

export async function updateBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => updateBusinessLink(formData), "Enlace actualizado.");
}

export async function deleteBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => deleteBusinessLink(formData), "Enlace eliminado.");
}

async function updateBusiness(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Negocio");
  await assertCanManageBusiness(supabase, id, user.id);

  const { error } = await supabase
    .from("businesses")
    .update({
      name: requiredText(formData, "name", "Nombre", 120),
      description: requiredText(formData, "description", "Descripcion", 2000),
      services: splitLinesOrCommas(optionalText(formData, "services", "Servicios heredados", 8000)),
      hours: requiredText(formData, "hours", "Horarios", 2000),
      location: requiredText(formData, "location", "Ubicacion", 500),
      phone: requiredPhone(formData, "phone"),
      rules: splitLinesOrCommas(requiredText(formData, "rules", "Instrucciones del bot", 8000)),
      whatsapp_phone_number_id: normalizeOptionalPhoneNumberId(formData),
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
  revalidateBusinessPaths();
}

async function deleteBusiness(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Negocio");
  const name = requiredText(formData, "name", "Nombre", 120);
  const confirmation = requiredText(formData, "confirmation", "Confirmacion", 120);
  if (confirmation !== name) throw new Error("Para eliminar, escribe exactamente el nombre del negocio.");
  await assertCanManageBusiness(supabase, id, user.id);
  const { error } = await supabase.from("businesses").delete().eq("id", id).select("id").single();
  if (error) throw error;
  revalidateBusinessPaths();
}

async function createBusiness(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const viewerProfile = await getViewerProfile(supabase, user.id);
  const name = requiredText(formData, "name", "Nombre", 120);
  const slug = slugify(optionalText(formData, "slug", "Slug", 64) || name);
  if (!slug) throw new Error("El negocio necesita un slug valido.");
  const requestedOwnerId = optionalText(formData, "owner_id", "Propietario", 36);
  if (requestedOwnerId && !isUuid(requestedOwnerId)) throw new Error("El propietario no es valido.");
  const ownerId = viewerProfile.role === "platform_admin" && requestedOwnerId ? requestedOwnerId : user.id;

  const { error } = await supabase.from("businesses").insert({
    owner_id: ownerId,
    name,
    slug,
    type: parseBusinessType(String(formData.get("type") ?? "repair")),
    description: requiredText(formData, "description", "Descripcion", 2000),
    services: splitLinesOrCommas(optionalText(formData, "services", "Servicios heredados", 8000)),
    hours: requiredText(formData, "hours", "Horarios", 2000),
    location: requiredText(formData, "location", "Ubicacion", 500),
    phone: requiredPhone(formData, "phone"),
    rules: splitLinesOrCommas(requiredText(formData, "rules", "Instrucciones del bot", 8000)),
    whatsapp_phone_number_id: normalizeOptionalPhoneNumberId(formData),
  });
  if (error) throw error;
  revalidateBusinessPaths();
}

async function createBusinessLink(formData: FormData) {
  const { supabase, user } = await getAuthenticatedClient();
  const businessId = requiredUuid(formData, "business_id", "Negocio");
  await assertCanManageBusiness(supabase, businessId, user.id);
  const { error } = await supabase.from("business_links").insert({
    business_id: businessId,
    label: requiredText(formData, "label", "Nombre del enlace", 120),
    url: requiredHttpUrl(formData, "url"),
    purpose: parseBusinessLinkPurpose(String(formData.get("purpose") ?? "")),
    notes: optionalText(formData, "notes", "Notas", 1000),
    is_active: formData.get("is_active") !== "off",
  });
  if (error) throw error;
  revalidatePath("/businesses");
}

async function updateBusinessLink(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Enlace");
  const { error } = await supabase
    .from("business_links")
    .update({
      label: requiredText(formData, "label", "Nombre del enlace", 120),
      url: requiredHttpUrl(formData, "url"),
      purpose: parseBusinessLinkPurpose(String(formData.get("purpose") ?? "")),
      notes: optionalText(formData, "notes", "Notas", 1000),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/businesses");
}

async function deleteBusinessLink(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const id = requiredUuid(formData, "id", "Enlace");
  const { error } = await supabase.from("business_links").delete().eq("id", id).select("id").single();
  if (error) throw error;
  revalidatePath("/businesses");
}

function parseBusinessType(value: string): BusinessType {
  return value === "dentist" ? "dentist" : "repair";
}

function parseBusinessLinkPurpose(value: string): BusinessLinkPurpose {
  return ["booking", "payment", "catalog", "location", "support"].includes(value)
    ? (value as BusinessLinkPurpose)
    : "general";
}

function normalizeOptionalPhoneNumberId(formData: FormData) {
  const value = optionalText(formData, "whatsapp_phone_number_id", "Phone Number ID", 32);
  if (value && !/^\d{5,32}$/.test(value)) throw new Error("El Phone Number ID debe contener solo numeros.");
  return value || null;
}

function splitLinesOrCommas(value: string) {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function revalidateBusinessPaths() {
  revalidatePath("/");
  revalidatePath("/businesses");
  revalidatePath("/conversations");
  revalidatePath("/appointments");
  revalidatePath("/quotes");
}
