"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password.length < 10) {
      setMessage("La contraseña debe tener al menos 10 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <input
        className="h-11 rounded-md border border-black/15 px-3 text-sm"
        minLength={10}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Nueva contraseña"
        required
        type="password"
        value={password}
      />
      <input
        className="h-11 rounded-md border border-black/15 px-3 text-sm"
        minLength={10}
        onChange={(event) => setConfirmation(event.target.value)}
        placeholder="Confirmar contraseña"
        required
        type="password"
        value={confirmation}
      />
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        Guardar contraseña
      </button>
      {message && <p className="rounded-md bg-[#f1eee6] p-3 text-sm text-[#5f5b50]">{message}</p>}
    </form>
  );
}
