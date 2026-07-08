"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { businesses, faqs } from "@/lib/seed";
import { createClient } from "@/lib/supabase/server";
import type {
  AppointmentStatus,
  AvailabilityStatus,
  BusinessLinkPurpose,
  BusinessType,
  LeadStatus,
  QuoteStatus,
} from "@/lib/types";

export type ActionState = {
  status: "success" | "error";
  message: string;
} | null;

export async function seedDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  await ensureProfile(supabase, user.id, user.email);

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    revalidatePath("/");
    return;
  }

  const insertedBusinesses = [];

  for (const business of businesses) {
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        name: business.name,
        slug: business.slug,
        type: business.type,
        description: business.description,
        services: business.services,
        hours: business.hours,
        location: business.location,
        phone: business.phone,
        rules: business.rules,
      })
      .select("id, slug")
      .single();

    if (error) throw error;
    insertedBusinesses.push(data);
  }

  for (const business of insertedBusinesses) {
    const sourceBusiness = businesses.find((item) => item.slug === business.slug);
    if (!sourceBusiness) continue;

    const businessFaqs = faqs
      .filter((faq) => faq.businessId === sourceBusiness.id)
      .map((faq) => ({
        business_id: business.id,
        question: faq.question,
        answer: faq.answer,
        category: faq.category ?? null,
      }));

    if (businessFaqs.length > 0) {
      const { error } = await supabase.from("business_faqs").insert(businessFaqs);
      if (error) throw error;
    }
  }

  const smile = insertedBusinesses.find((business) => business.slug === "sonrisa-clara");
  const fix = insertedBusinesses.find((business) => business.slug === "fixpro-tecnicos");

  if (smile) {
    await createDemoLead(supabase, {
      businessId: smile.id,
      customerName: "Laura Medina",
      customerPhone: "+57 301 222 3333",
      customerStatus: "appointment",
      intent: "appointment",
      customerMessage: "Quiero agendar limpieza dental esta semana.",
      assistantMessage:
        "Puedo tomar tu solicitud. La limpieza parte de COP 120.000 y el consultorio debe confirmar el horario.",
      appointment: {
        service: "Limpieza dental",
        preferred_date: "2026-07-02",
        preferred_time: "10:00",
      },
    });
  }

  if (fix) {
    await createDemoLead(supabase, {
      businessId: fix.id,
      customerName: "Carlos Rios",
      customerPhone: "+57 302 444 5555",
      customerStatus: "quoted",
      intent: "quote",
      customerMessage: "Necesito reparar una lavadora que no centrifuga.",
      assistantMessage:
        "Puedo generar una cotizacion estimada. La visita tecnica parte de COP 80.000 y el valor final depende del diagnostico.",
      quote: {
        service: "Diagnostico de lavadora",
        description: "Lavadora no centrifuga; requiere visita tecnica.",
        min_price: 80000,
        max_price: 180000,
        notes: "Estimado sujeto a diagnostico y repuestos.",
      },
    });
  }

  revalidatePath("/");
  revalidatePath("/businesses");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateBusiness(formData: FormData) {
  await updateBusinessCore(formData);
}

export async function updateBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => updateBusinessCore(formData), "Negocio actualizado.");
}

export async function deleteBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => deleteBusinessCore(formData), "Negocio eliminado.");
}

async function updateBusinessCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  await assertCanManageBusiness(supabase, id, user.id);
  const services = splitLinesOrCommas(String(formData.get("services") ?? ""));
  const rules = splitLinesOrCommas(String(formData.get("rules") ?? ""));

  const { error } = await supabase
    .from("businesses")
    .update({
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      services,
      hours: String(formData.get("hours") ?? ""),
      location: String(formData.get("location") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      rules,
    })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/businesses");
}

async function deleteBusinessCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!id || confirmation !== name) {
    throw new Error("Para eliminar, escribe exactamente el nombre del negocio.");
  }
  await assertCanManageBusiness(supabase, id, user.id);

  const { error } = await supabase.from("businesses").delete().eq("id", id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/businesses");
  revalidatePath("/conversations");
  revalidatePath("/appointments");
  revalidatePath("/quotes");
}

export async function createBusiness(formData: FormData) {
  await createBusinessCore(formData);
}

export async function createBusinessWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => createBusinessCore(formData), "Negocio creado.");
}

async function createBusinessCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  await ensureProfile(supabase, user.id, user.email);
  const viewerProfile = await getViewerProfile(supabase, user.id);

  const name = String(formData.get("name") ?? "").trim();
  const type = parseBusinessType(String(formData.get("type") ?? "repair"));
  const slug = slugify(String(formData.get("slug") ?? "") || name);
  const requestedOwnerId = String(formData.get("owner_id") ?? "").trim();
  const ownerId = viewerProfile.role === "platform_admin" && requestedOwnerId ? requestedOwnerId : user.id;

  const { error } = await supabase.from("businesses").insert({
    owner_id: ownerId,
    name,
    slug,
    type,
    description: String(formData.get("description") ?? "").trim(),
    services: splitLinesOrCommas(String(formData.get("services") ?? "")),
    hours: String(formData.get("hours") ?? "").trim(),
    location: String(formData.get("location") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    rules: splitLinesOrCommas(String(formData.get("rules") ?? "")),
  });

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/businesses");
}

export async function createFaq(formData: FormData) {
  await createFaqCore(formData);
}

export async function createFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => createFaqCore(formData), "FAQ creada.");
}

async function createFaqCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("business_faqs").insert({
    business_id: String(formData.get("business_id") ?? ""),
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    category: String(formData.get("category") ?? "") || null,
  });

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function updateFaq(formData: FormData) {
  await updateFaqCore(formData);
}

export async function updateFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => updateFaqCore(formData), "FAQ actualizada.");
}

async function updateFaqCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("business_faqs")
    .update({
      question: String(formData.get("question") ?? "").trim(),
      answer: String(formData.get("answer") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim() || null,
    })
    .eq("id", String(formData.get("id") ?? ""));

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function deleteFaq(formData: FormData) {
  await deleteFaqCore(formData);
}

export async function deleteFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => deleteFaqCore(formData), "FAQ eliminada.");
}

async function deleteFaqCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("business_faqs").delete().eq("id", String(formData.get("id") ?? ""));

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function createBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => createBusinessLinkCore(formData), "Enlace creado.");
}

async function createBusinessLinkCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const businessId = String(formData.get("business_id") ?? "");
  await assertCanManageBusiness(supabase, businessId, user.id);

  const { error } = await supabase.from("business_links").insert({
    business_id: businessId,
    label: String(formData.get("label") ?? "").trim(),
    url: normalizeHttpUrl(String(formData.get("url") ?? "")),
    purpose: parseBusinessLinkPurpose(String(formData.get("purpose") ?? "")),
    notes: String(formData.get("notes") ?? "").trim(),
    is_active: formData.get("is_active") !== "off",
  });

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function updateBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => updateBusinessLinkCore(formData), "Enlace actualizado.");
}

async function updateBusinessLinkCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("business_links")
    .update({
      label: String(formData.get("label") ?? "").trim(),
      url: normalizeHttpUrl(String(formData.get("url") ?? "")),
      purpose: parseBusinessLinkPurpose(String(formData.get("purpose") ?? "")),
      notes: String(formData.get("notes") ?? "").trim(),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", String(formData.get("id") ?? ""));

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function deleteBusinessLinkWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => deleteBusinessLinkCore(formData), "Enlace eliminado.");
}

async function deleteBusinessLinkCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("business_links").delete().eq("id", String(formData.get("id") ?? ""));

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function saveBusinessHoursWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withFeedback(() => saveBusinessHoursCore(formData), "Horario semanal guardado.");
}

async function saveBusinessHoursCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const businessId = String(formData.get("business_id") ?? "");
  await assertCanManageBusiness(supabase, businessId, user.id);

  const hours: { business_id: string; day_of_week: number; opens_at: string; closes_at: string }[] = [];

  for (let day = 0; day < 7; day += 1) {
    const enabled = formData.get(`day_${day}_enabled`) === "on";
    const opensAt = String(formData.get(`day_${day}_opens`) ?? "");
    const closesAt = String(formData.get(`day_${day}_closes`) ?? "");

    if (!enabled) continue;
    if (!isValidTime(opensAt) || !isValidTime(closesAt) || opensAt >= closesAt) {
      throw new Error("Revisa los horarios: cada dia activo necesita apertura menor que cierre.");
    }

    hours.push({
      business_id: businessId,
      day_of_week: day,
      opens_at: opensAt,
      closes_at: closesAt,
    });
  }

  const { error: deleteError } = await supabase.from("business_hours").delete().eq("business_id", businessId);
  if (deleteError) throw deleteError;

  if (hours.length > 0) {
    const { error: insertError } = await supabase.from("business_hours").insert(hours);
    if (insertError) throw insertError;
  }

  revalidatePath("/businesses");
}

export async function createAvailabilitySlotWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withFeedback(() => createAvailabilitySlotCore(formData), "Disponibilidad guardada.");
}

async function createAvailabilitySlotCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const businessId = String(formData.get("business_id") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const status = parseAvailabilityStatus(String(formData.get("status") ?? ""));

  if (!date || !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
    throw new Error("Completa fecha, hora inicio y hora fin validas.");
  }

  await assertCanManageBusiness(supabase, businessId, user.id);

  const { error } = await supabase.from("availability_slots").upsert(
    {
      business_id: businessId,
      date,
      start_time: startTime,
      end_time: endTime,
      status,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
    { onConflict: "business_id,date,start_time" },
  );

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function deleteAvailabilitySlotWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return withFeedback(() => deleteAvailabilitySlotCore(formData), "Disponibilidad eliminada.");
}

async function deleteAvailabilitySlotCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("availability_slots")
    .delete()
    .eq("id", String(formData.get("id") ?? ""));

  if (error) throw error;
  revalidatePath("/businesses");
}

export async function updateAppointmentStatus(formData: FormData) {
  await updateAppointmentStatusCore(formData);
}

export async function updateAppointmentStatusWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const status = parseAppointmentStatus(String(formData.get("status") ?? ""));
  const labels: Record<AppointmentStatus, string> = {
    pending: "Cita marcada como pendiente.",
    confirmed: "Cita confirmada.",
    cancelled: "Cita cancelada.",
  };
  return withFeedback(() => updateAppointmentStatusCore(formData), labels[status]);
}

async function updateAppointmentStatusCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = parseAppointmentStatus(String(formData.get("status") ?? ""));
  const { error } = await supabase
    .from("appointment_requests")
    .update({ status })
    .eq("id", String(formData.get("id") ?? ""))
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/appointments");
  revalidatePath("/conversations");
}

export async function updateQuoteStatus(formData: FormData) {
  await updateQuoteStatusCore(formData);
}

export async function updateQuoteStatusWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  const status = parseQuoteStatus(String(formData.get("status") ?? ""));
  const labels: Record<QuoteStatus, string> = {
    draft: "Cotizacion marcada como borrador.",
    sent: "Cotizacion enviada.",
    accepted: "Cotizacion aceptada.",
    rejected: "Cotizacion rechazada.",
  };
  return withFeedback(() => updateQuoteStatusCore(formData), labels[status]);
}

async function updateQuoteStatusCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = parseQuoteStatus(String(formData.get("status") ?? ""));
  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", String(formData.get("id") ?? ""))
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/quotes");
  revalidatePath("/conversations");
}

export async function updateCustomerStatus(formData: FormData) {
  await updateCustomerStatusCore(formData);
}

export async function updateCustomerStatusWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  const status = parseLeadStatus(String(formData.get("status") ?? ""));
  const labels: Record<LeadStatus, string> = {
    new: "Lead marcado como nuevo.",
    qualified: "Lead calificado.",
    appointment: "Lead marcado con cita.",
    quoted: "Lead marcado como cotizado.",
  };
  return withFeedback(() => updateCustomerStatusCore(formData), labels[status]);
}

async function updateCustomerStatusCore(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = parseLeadStatus(String(formData.get("status") ?? ""));
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", String(formData.get("id") ?? ""))
    .select("id")
    .single();

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/conversations");
}

async function withFeedback(action: () => Promise<void>, successMessage: string): Promise<ActionState> {
  try {
    await action();
    return { status: "success", message: successMessage };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No se pudo guardar el cambio.",
    };
  }
}

async function createDemoLead(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    businessId: string;
    customerName: string;
    customerPhone: string;
    customerStatus: "appointment" | "quoted";
    intent: "appointment" | "quote";
    customerMessage: string;
    assistantMessage: string;
    appointment?: { service: string; preferred_date: string; preferred_time: string };
    quote?: { service: string; description: string; min_price: number; max_price: number; notes: string };
  },
) {
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      business_id: input.businessId,
      name: input.customerName,
      phone: input.customerPhone,
      status: input.customerStatus,
    })
    .select("id")
    .single();

  if (customerError) throw customerError;

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      business_id: input.businessId,
      customer_id: customer.id,
      channel: "web",
      last_intent: input.intent,
    })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  const { error: messagesError } = await supabase.from("messages").insert([
    { conversation_id: conversation.id, role: "customer", body: input.customerMessage },
    { conversation_id: conversation.id, role: "assistant", body: input.assistantMessage },
  ]);

  if (messagesError) throw messagesError;

  if (input.appointment) {
    const { error } = await supabase.from("appointment_requests").insert({
      business_id: input.businessId,
      customer_id: customer.id,
      ...input.appointment,
    });
    if (error) throw error;
  }

  if (input.quote) {
    const { error } = await supabase.from("quotes").insert({
      business_id: input.businessId,
      customer_id: customer.id,
      ...input.quote,
      status: "sent",
    });
    if (error) throw error;
  }
}

async function ensureProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, email?: string) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    email: email ?? null,
    full_name: email ? email.split("@")[0] : "Owner",
  });

  if (error) throw error;
}

function splitLinesOrCommas(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function parseBusinessType(value: string): BusinessType {
  return value === "dentist" ? "dentist" : "repair";
}

function parseAppointmentStatus(value: string): AppointmentStatus {
  if (value === "confirmed" || value === "cancelled") return value;
  return "pending";
}

function parseQuoteStatus(value: string): QuoteStatus {
  if (value === "sent" || value === "accepted" || value === "rejected") return value;
  return "draft";
}

function parseAvailabilityStatus(value: string): AvailabilityStatus {
  if (value === "blocked" || value === "booked") return value;
  return "available";
}

function parseBusinessLinkPurpose(value: string): BusinessLinkPurpose {
  if (["booking", "payment", "catalog", "location", "support"].includes(value)) {
    return value as BusinessLinkPurpose;
  }
  return "general";
}

function parseLeadStatus(value: string): LeadStatus {
  if (value === "qualified" || value === "appointment" || value === "quoted") return value;
  return "new";
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeHttpUrl(value: string) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("El enlace debe empezar por http:// o https://.");
    }
    return url.toString();
  } catch {
    throw new Error("Ingresa un enlace valido que empiece por http:// o https://.");
  }
}

async function getViewerProfile(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (error || !data) throw error ?? new Error("Perfil no encontrado.");
  return data as { id: string; role: "platform_admin" | "business_owner" };
}

async function assertCanManageBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessId: string,
  userId: string,
) {
  const viewerProfile = await getViewerProfile(supabase, userId);
  if (viewerProfile.role === "platform_admin") {
    const { data, error } = await supabase.from("businesses").select("id").eq("id", businessId).single();
    if (error || !data) throw error ?? new Error("Negocio no encontrado.");
    return;
  }

  const { data, error } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", userId)
    .single();

  if (error || !data) throw error ?? new Error("Negocio no encontrado.");
}
