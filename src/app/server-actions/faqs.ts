"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { getAuthenticatedClient } from "@/lib/server/auth";
import { optionalText, requiredText, requiredUuid } from "@/lib/validation";

export async function createFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => createFaq(formData), "FAQ creada.");
}

export async function updateFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => updateFaq(formData), "FAQ actualizada.");
}

export async function deleteFaqWithFeedback(_state: ActionState, formData: FormData): Promise<ActionState> {
  return withActionFeedback(() => deleteFaq(formData), "FAQ eliminada.");
}

async function createFaq(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase.from("business_faqs").insert({
    business_id: requiredUuid(formData, "business_id", "Negocio"),
    question: requiredText(formData, "question", "Pregunta", 500),
    answer: requiredText(formData, "answer", "Respuesta", 3000),
    category: optionalText(formData, "category", "Categoria", 80) || null,
  });
  if (error) throw error;
  revalidatePath("/businesses");
}

async function updateFaq(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("business_faqs")
    .update({
      question: requiredText(formData, "question", "Pregunta", 500),
      answer: requiredText(formData, "answer", "Respuesta", 3000),
      category: optionalText(formData, "category", "Categoria", 80) || null,
    })
    .eq("id", requiredUuid(formData, "id", "FAQ"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/businesses");
}

async function deleteFaq(formData: FormData) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("business_faqs")
    .delete()
    .eq("id", requiredUuid(formData, "id", "FAQ"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/businesses");
}
