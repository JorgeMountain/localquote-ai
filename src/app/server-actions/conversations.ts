"use server";

import { revalidatePath } from "next/cache";
import { withActionFeedback, type ActionState } from "@/lib/action-state";
import { getAuthenticatedClient } from "@/lib/server/auth";
import type { LeadStatus } from "@/lib/types";
import { requiredUuid } from "@/lib/validation";

export async function updateCustomerStatusWithFeedback(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const status = parseLeadStatus(String(formData.get("status") ?? ""));
  const labels: Record<LeadStatus, string> = {
    new: "Lead marcado como nuevo.",
    qualified: "Lead calificado.",
    appointment: "Lead marcado con cita.",
    quoted: "Lead marcado como cotizado.",
  };
  return withActionFeedback(() => updateCustomerStatus(formData, status), labels[status]);
}

async function updateCustomerStatus(formData: FormData, status: LeadStatus) {
  const { supabase } = await getAuthenticatedClient();
  const { error } = await supabase
    .from("customers")
    .update({ status })
    .eq("id", requiredUuid(formData, "id", "Cliente"))
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/");
  revalidatePath("/conversations");
}

function parseLeadStatus(value: string): LeadStatus {
  return value === "qualified" || value === "appointment" || value === "quoted" ? value : "new";
}
