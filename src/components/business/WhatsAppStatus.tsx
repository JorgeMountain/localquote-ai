import { Link2 } from "lucide-react";
import type { Business } from "@/lib/types";

export type WhatsAppEnvironmentStatus = {
  appSecret: boolean;
  accessToken: boolean;
  phoneNumberId: boolean;
  verifyToken: boolean;
  appointmentTemplate: boolean;
  quoteTemplate: boolean;
};

export function WhatsAppStatus({
  business,
  whatsappBusinessSlug,
  environmentStatus,
}: {
  business: Business;
  whatsappBusinessSlug: string;
  environmentStatus: WhatsAppEnvironmentStatus;
}) {
  const isConnected =
    Boolean(business.whatsappPhoneNumberId)
    || (Boolean(whatsappBusinessSlug) && whatsappBusinessSlug === business.slug);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-semibold"><Link2 size={18} />WhatsApp</div>
      <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${isConnected ? "border-[#93b35d]/40 bg-[#eef7d2] text-[#3f551c]" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        {isConnected ? "Este negocio esta conectado a WhatsApp." : "Este negocio aun no tiene un numero de WhatsApp asociado."}
      </div>
      <p className="mt-3 text-sm leading-6 text-[#706d62]">
        El identificador del numero conecta los mensajes entrantes de Meta con este negocio. No es el numero que ven tus clientes.
      </p>
      <details className="mt-4 rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <summary className="cursor-pointer text-sm font-semibold">Ver detalles tecnicos de la conexion</summary>
        <dl className="mt-4 grid gap-3 text-sm">
          <StatusValue label="Slug de este negocio" value={business.slug} />
          <StatusValue label="Identificador del numero conectado" value={business.whatsappPhoneNumberId || "sin configurar"} />
          <StatusValue label="Slug global de respaldo" value={whatsappBusinessSlug || "sin configurar"} />
        </dl>
        <div className="mt-4 border-t border-black/10 pt-4">
          <p className="text-sm font-semibold">Configuracion segura del servidor</p>
        <div className="mt-3 grid gap-2">
          <EnvironmentCheck label="App Secret de Meta" configured={environmentStatus.appSecret} required />
          <EnvironmentCheck label="Access Token" configured={environmentStatus.accessToken} required />
          <EnvironmentCheck label="Phone Number ID global" configured={environmentStatus.phoneNumberId} />
          <EnvironmentCheck label="Verify Token" configured={environmentStatus.verifyToken} required />
          <EnvironmentCheck label="Plantilla para confirmar citas" configured={environmentStatus.appointmentTemplate} />
          <EnvironmentCheck label="Plantilla para cotizaciones" configured={environmentStatus.quoteTemplate} />
        </div>
        {!environmentStatus.appSecret && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
            WhatsApp permanece bloqueado en produccion hasta agregar WHATSAPP_APP_SECRET en Vercel.
          </p>
        )}
        {(!environmentStatus.appointmentTemplate || !environmentStatus.quoteTemplate) && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            Configura plantillas aprobadas para notificar fuera de la ventana de 24 horas de WhatsApp.
          </p>
        )}
        </div>
      </details>
      {!isConnected && (
        <p className="mt-3 text-sm leading-6 text-[#706d62]">
          Cuando tengas Meta listo, pega el identificador del numero en la pestaÃ±a Negocio. El slug global queda solo como respaldo para pruebas antiguas.
        </p>
      )}
    </section>
  );
}

function StatusValue({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-semibold">{label}</dt><dd className="mt-1 rounded-md bg-[#f8f6f1] px-3 py-2 font-mono text-xs">{value}</dd></div>;
}

function EnvironmentCheck({ label, configured, required }: { label: string; configured: boolean; required?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f8f6f1] px-3 py-2 text-sm">
      <span>{label}{required ? " *" : ""}</span>
      <span className={`font-semibold ${configured ? "text-[#3f551c]" : "text-red-700"}`}>
        {configured ? "Configurado" : "Falta"}
      </span>
    </div>
  );
}
