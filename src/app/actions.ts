"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { businesses, faqs } from "@/lib/seed";
import { createClient } from "@/lib/supabase/server";

export async function seedDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const id = String(formData.get("id") ?? "");
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
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/businesses");
}

export async function createFaq(formData: FormData) {
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

function splitLinesOrCommas(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
