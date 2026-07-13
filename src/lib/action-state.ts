export type ActionState = {
  status: "success" | "error";
  message: string;
} | null;

export async function withActionFeedback(
  action: () => Promise<void>,
  successMessage: string,
): Promise<ActionState> {
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
