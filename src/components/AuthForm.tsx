"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const supabase = createClient();
    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
          });

    setIsLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (mode === "register" && !result.data.session) {
      setMessage("Registro creado. Si Supabase exige confirmacion de email, confirma el correo y luego entra.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setMessage("Escribe tu correo para solicitar el cambio de contraseña.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });
    setIsLoading(false);
    setMessage(
      error
        ? error.message
        : "Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.",
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3">
      <div className="grid grid-cols-2 gap-2 rounded-md bg-[#f1eee6] p-1">
        <button
          type="button"
          className={`h-10 rounded-sm text-sm font-semibold ${mode === "login" ? "bg-white shadow-sm" : ""}`}
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={`h-10 rounded-sm text-sm font-semibold ${mode === "register" ? "bg-white shadow-sm" : ""}`}
          onClick={() => setMode("register")}
        >
          Registro
        </button>
      </div>

      {mode === "register" && (
        <input
          autoComplete="name"
          className="h-11 rounded-md border border-black/15 px-3 text-sm"
          placeholder="Nombre"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />
      )}

      <input
        autoComplete="email"
        className="h-11 rounded-md border border-black/15 px-3 text-sm"
        placeholder="Email"
        required
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        autoComplete={mode === "login" ? "current-password" : "new-password"}
        className="h-11 rounded-md border border-black/15 px-3 text-sm"
        minLength={10}
        placeholder="Password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        type="password"
      />
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-black px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={isLoading}
      >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        {mode === "login" ? "Entrar al dashboard" : "Crear cuenta"}
      </button>
      {mode === "login" && (
        <button
          className="h-10 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
          disabled={isLoading}
          onClick={requestPasswordReset}
          type="button"
        >
          Olvidé mi contraseña
        </button>
      )}
      {message && <p className="rounded-md bg-[#f1eee6] p-3 text-sm leading-6 text-[#5f5b50]">{message}</p>}
    </form>
  );
}
