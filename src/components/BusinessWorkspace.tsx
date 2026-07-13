"use client";

import Link from "next/link";
import {
  Bot,
  Building2,
  CheckCircle2,
  Clock3,
  HelpCircle,
  Link2,
  MessageSquareText,
  Plus,
  Settings2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createBusinessWithFeedback,
  deleteBusinessWithFeedback,
} from "@/app/server-actions/businesses";
import { ActionMessage } from "@/components/ActionForms";
import { BusinessLinksEditor } from "@/components/business/BusinessLinksEditor";
import { BusinessProfileForm } from "@/components/business/BusinessProfileForm";
import { FaqEditor } from "@/components/business/FaqEditor";
import { ScheduleEditor } from "@/components/business/ScheduleEditor";
import { ServicesEditor } from "@/components/business/ServicesEditor";
import { WhatsAppStatus, type WhatsAppEnvironmentStatus } from "@/components/business/WhatsAppStatus";
import type {
  AvailabilitySlot,
  Business,
  BusinessFaq,
  BusinessHour,
  BusinessLink,
  BusinessService,
  Profile,
} from "@/lib/types";

type SetupStepId = "business" | "services" | "knowledge" | "schedule" | "links" | "whatsapp" | "test";

export function BusinessWorkspace({
  businesses,
  profiles,
  viewerProfile,
  faqs,
  businessServices,
  businessHours,
  availabilitySlots,
  businessLinks,
  whatsappBusinessSlug,
  whatsappEnvironmentStatus,
}: {
  businesses: Business[];
  profiles: Profile[];
  viewerProfile: Profile;
  faqs: BusinessFaq[];
  businessServices: BusinessService[];
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
  businessLinks: BusinessLink[];
  whatsappBusinessSlug: string;
  whatsappEnvironmentStatus: WhatsAppEnvironmentStatus;
}) {
  const [selectedId, setSelectedId] = useState(businesses[0]?.id ?? "");
  const [activeStep, setActiveStep] = useState<SetupStepId>("business");
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0];
  const businessFaqs = useMemo(
    () => (selectedBusiness ? faqs.filter((faq) => faq.businessId === selectedBusiness.id) : []),
    [faqs, selectedBusiness],
  );
  const selectedBusinessServices = useMemo(
    () => (selectedBusiness ? businessServices.filter((service) => service.businessId === selectedBusiness.id) : []),
    [businessServices, selectedBusiness],
  );
  const selectedBusinessHours = useMemo(
    () => (selectedBusiness ? businessHours.filter((hour) => hour.businessId === selectedBusiness.id) : []),
    [businessHours, selectedBusiness],
  );
  const selectedAvailabilitySlots = useMemo(
    () => (selectedBusiness ? availabilitySlots.filter((slot) => slot.businessId === selectedBusiness.id) : []),
    [availabilitySlots, selectedBusiness],
  );
  const selectedBusinessLinks = useMemo(
    () => (selectedBusiness ? businessLinks.filter((link) => link.businessId === selectedBusiness.id) : []),
    [businessLinks, selectedBusiness],
  );
  const completion = selectedBusiness
    ? getCompletion(selectedBusiness, businessFaqs.length, selectedBusinessServices.filter((service) => service.isActive).length)
    : [];
  const setupSteps = selectedBusiness
    ? getSetupSteps({
        business: selectedBusiness,
        completion,
        hasSchedule: selectedBusinessHours.length > 0 || selectedAvailabilitySlots.length > 0,
        hasLinks: selectedBusinessLinks.some((link) => link.isActive),
      })
    : [];
  const essentialCompleted = completion.filter((item) => item.done).length;
  const completionPercent = completion.length > 0 ? Math.round((essentialCompleted / completion.length) * 100) : 0;

  return (
    <div className="grid gap-6">
      <SetupIntro hasBusinesses={businesses.length > 0} />

      {businesses.length === 0 ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ManualSetupGuide />
          <CreateBusinessForm variant="empty" profiles={profiles} viewerProfile={viewerProfile} />
        </div>
      ) : (
        <>
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#706d62]">Negocio activo</p>
              <p className="mt-1 text-sm leading-6 text-[#706d62]">
                Este selector solo cambia el negocio que estas editando abajo. No crea ni modifica negocios por si solo.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  className="h-12 rounded-lg border border-black/15 bg-[#f8f6f1] px-3 text-sm font-semibold outline-none focus:border-black sm:min-w-80"
                  value={selectedBusiness?.id ?? ""}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setActiveStep("business");
                  }}
                >
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
                {selectedBusiness && (
                  <Link
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-black/15 px-4 text-sm font-semibold transition hover:bg-black hover:text-white"
                    href={`/b/${selectedBusiness.slug}`}
                  >
                    Probar pagina publica
                  </Link>
                )}
              </div>
            </div>
          </section>

          <CreateBusinessForm variant="compact" profiles={profiles} viewerProfile={viewerProfile} />

          {selectedBusiness && (
            <div className="grid gap-6">
              <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#706d62]">Configuracion guiada</p>
                    <h2 className="mt-1 text-2xl font-semibold">Prepara el asistente de {selectedBusiness.name}</h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#706d62]">
                      Completa lo esencial primero. La agenda, los enlaces y WhatsApp se activan solo si este negocio los necesita.
                    </p>
                  </div>
                  <div className="min-w-52 rounded-lg bg-[#f8f6f1] p-4">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span>Listo para responder</span>
                      <span>{completionPercent}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                      <div className="h-full rounded-full bg-[#6d8a2f]" style={{ width: `${completionPercent}%` }} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#706d62]">
                      {essentialCompleted}/{completion.length} elementos esenciales listos.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label="Pasos de configuracion">
                  {setupSteps.map((step, index) => {
                    const active = activeStep === step.id;

                    return (
                      <button
                        key={step.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setActiveStep(step.id)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition ${
                          active ? "border-black bg-black text-white" : "border-black/10 bg-[#f8f6f1] hover:border-black/35"
                        }`}
                      >
                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                          active ? "bg-[#e2f26b] text-black" : step.done ? "bg-[#dfecc2] text-[#4d6419]" : "bg-white text-[#706d62]"
                        }`}>
                          {step.done ? <CheckCircle2 size={15} /> : index + 1}
                        </span>
                        <span>
                          <span className="block font-semibold">{step.label}</span>
                          {step.optional && <span className={`block text-xs ${active ? "text-white/65" : "text-[#706d62]"}`}>Opcional</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <div role="tabpanel">
                {activeStep === "business" && <BusinessProfileForm business={selectedBusiness} />}

                {activeStep === "services" && (
                  <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                    <FormHeader
                      icon={Sparkles}
                      eyebrow="Paso 2"
                      title="Servicios y precios"
                      description="Estos datos estructurados son la fuente de precios del bot. Si un precio no esta configurado, la IA no lo inventa."
                    />
                    <ServicesEditor businessId={selectedBusiness.id} services={selectedBusinessServices} />
                  </section>
                )}

                {activeStep === "knowledge" && (
                  <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                    <FormHeader
                      icon={HelpCircle}
                      eyebrow="Paso 3"
                      title="Conocimiento y preguntas frecuentes"
                      description="Agrega respuestas aprobadas. El bot las usa como fuente principal antes de improvisar."
                    />
                    <FaqEditor businessId={selectedBusiness.id} faqs={businessFaqs} />
                  </section>
                )}

                {activeStep === "schedule" && (
                  <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                    <FormHeader
                      icon={Clock3}
                      eyebrow="Opcional"
                      title="Agenda y disponibilidad"
                      description="Activalo solo si este negocio trabaja con horarios definidos. Si lo dejas vacio, el bot toma solicitudes pendientes para que el negocio las revise."
                    />
                    <ScheduleEditor
                      business={selectedBusiness}
                      businessHours={selectedBusinessHours}
                      availabilitySlots={selectedAvailabilitySlots}
                    />
                  </section>
                )}

                {activeStep === "links" && (
                  <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                    <FormHeader
                      icon={Link2}
                      eyebrow="Opcional"
                      title="Enlaces y redirecciones"
                      description="Agrega links aprobados para catalogos, pagos, reservas, ubicacion o soporte. El bot solo debe enviar enlaces que esten aqui."
                    />
                    <BusinessLinksEditor businessId={selectedBusiness.id} links={selectedBusinessLinks} />
                  </section>
                )}

                {activeStep === "whatsapp" && (
                  <WhatsAppStatus
                    business={selectedBusiness}
                    whatsappBusinessSlug={whatsappBusinessSlug}
                    environmentStatus={whatsappEnvironmentStatus}
                  />
                )}

                {activeStep === "test" && (
                  <section className="rounded-xl border border-black/10 bg-[#111111] p-5 text-white shadow-sm">
                    <FormHeader
                      icon={Sparkles}
                      eyebrow="Paso final"
                      title="Prueba el asistente"
                      description="Prueba la pagina publica antes de conectar clientes reales. WhatsApp es opcional y usa el numero conectado en Meta."
                      dark
                    />
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <Link
                        href={`/b/${selectedBusiness.slug}`}
                        className="inline-flex h-12 items-center justify-center rounded-lg bg-[#e2f26b] px-4 text-sm font-semibold text-black"
                      >
                        Abrir chat web de prueba
                      </Link>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70">
                        El chat web funciona sin pedir nombre ni telefono. El bot los solicita solo cuando hacen falta para una cita o seguimiento.
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <details className="rounded-xl border border-black/10 bg-[#f8f6f1] p-5">
                <summary className="cursor-pointer text-sm font-semibold">Reglas avanzadas y zona de administracion</summary>
                <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                  <BotInstructionCard />
                  <DangerZone business={selectedBusiness} />
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SetupIntro({ hasBusinesses }: { hasBusinesses: boolean }) {
  return (
    <section className="overflow-hidden rounded-xl border border-black/10 bg-[#111111] text-white shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.7fr] lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e2f26b] px-3 py-1 text-sm font-semibold text-black">
            <Bot size={16} />
            Configuracion guiada del bot
          </div>
          <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-normal sm:text-5xl">
            Primero configura el negocio. Despues el bot responde con esos datos.
          </h2>
        <p className="mt-4 max-w-2xl leading-7 text-white/70">
            No necesitas tocar la base de datos. Llena servicios, precios, horarios, reglas y FAQs desde aqui.
            Para peluquerias, comercios o restaurantes usa la plantilla general.
        </p>
        </div>
        <div className="grid content-center gap-3 rounded-xl border border-white/10 bg-white/5 p-5">
          <StepPill number="1" label="Datos del negocio" done={hasBusinesses} />
          <StepPill number="2" label="Servicios, precios y reglas" done={false} />
          <StepPill number="3" label="FAQs y prueba del bot" done={false} />
          <StepPill number="+" label="Agenda opcional si aplica" done={false} />
        </div>
      </div>
    </section>
  );
}

function ManualSetupGuide() {
  const items = [
    {
      icon: Building2,
      title: "Crea el negocio real",
      text: "Nombre, telefono, direccion y una descripcion corta de lo que vende.",
    },
    {
      icon: Clock3,
      title: "Agrega servicios con precio",
      text: "Escribe un servicio por linea: precio, duracion, condiciones y si requiere valoracion.",
    },
    {
      icon: Settings2,
      title: "Define reglas del bot",
      text: "Indica que no debe inventar precios, cuando pedir datos y cuando dejar pendiente.",
    },
    {
      icon: MessageSquareText,
      title: "Carga preguntas frecuentes",
      text: "Las FAQs son respuestas oficiales que evitan respuestas vagas o incorrectas.",
    },
  ];

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#706d62]">Empieza aqui</p>
      <h2 className="mt-2 text-2xl font-semibold">Tu base esta limpia</h2>
      <p className="mt-2 leading-7 text-[#706d62]">
        No hay negocios demo. Crea el primero manualmente y la app te mostrara los siguientes pasos.
      </p>
      <div className="mt-5 grid gap-3">
        {items.map((item) => (
          <div key={item.title} className="flex gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-black text-white">
              <item.icon size={17} />
            </span>
            <div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-[#706d62]">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BotInstructionCard() {
  return (
    <section className="rounded-xl border border-black/10 bg-[#f8f6f1] p-5">
      <div className="flex items-center gap-2 font-semibold">
        <Settings2 size={18} />
        Como escribir instrucciones utiles
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-[#706d62]">
        <li>• Especifica precios como rangos si no son fijos.</li>
        <li>• Di cuando una cita queda pendiente y no confirmada.</li>
        <li>• Indica que datos debe pedir: nombre, telefono, fecha y servicio.</li>
        <li>• Agrega excepciones: urgencias, domicilios, pagos o restricciones.</li>
      </ul>
    </section>
  );
}

function DangerZone({ business }: { business: Business }) {
  const [state, formAction] = useActionState(deleteBusinessWithFeedback, null);

  return (
    <details className="rounded-xl border border-red-200 bg-red-50 p-5">
      <summary className="cursor-pointer text-sm font-semibold text-red-800">Eliminar negocio</summary>
      <form action={formAction} className="mt-4 grid gap-3">
        <input type="hidden" name="id" value={business.id} />
        <input type="hidden" name="name" value={business.name} />
        <p className="text-sm leading-6 text-red-800">
          Esto borra el negocio y sus FAQs, clientes, conversaciones, citas y cotizaciones asociadas.
        </p>
        <label className="grid gap-2 text-sm font-semibold text-red-900">
          Escribe exactamente: <span className="font-mono">{business.name}</span>
          <input
            className="h-11 rounded-lg border border-red-200 bg-white px-3 text-sm outline-none focus:border-red-500"
            name="confirmation"
            placeholder={business.name}
          />
        </label>
        <button className="inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-semibold text-white">
          Eliminar definitivamente
        </button>
        <ActionMessage state={state} />
      </form>
    </details>
  );
}

function CreateBusinessForm({
  variant,
  profiles,
  viewerProfile,
}: {
  variant: "empty" | "compact";
  profiles: Profile[];
  viewerProfile: Profile;
}) {
  const [state, formAction] = useActionState(createBusinessWithFeedback, null);
  const compact = variant === "compact";

  if (compact) {
    return (
      <details className="rounded-xl border border-black/10 bg-[#f8f6f1] p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold">Agregar negocio nuevo</summary>
        <p className="mt-3 text-sm leading-6 text-[#706d62]">
          Este formulario crea un registro nuevo. El negocio activo de arriba seguira igual hasta que lo selecciones.
        </p>
        <CreateBusinessFields state={state} formAction={formAction} compact profiles={profiles} viewerProfile={viewerProfile} />
      </details>
    );
  }

  return (
    <form id="crear-negocio" action={formAction} className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <FormHeader
        icon={Plus}
        eyebrow="Paso 1"
        title="Crea tu primer negocio"
        description="Llena lo minimo para que el bot tenga una fuente de verdad desde el inicio."
      />
      <CreateBusinessFields state={state} formAction={formAction} profiles={profiles} viewerProfile={viewerProfile} />
    </form>
  );
}

function CreateBusinessFields({
  state,
  formAction,
  compact,
  profiles,
  viewerProfile,
}: {
  state: Parameters<typeof ActionMessage>[0]["state"];
  formAction: (payload: FormData) => void;
  compact?: boolean;
  profiles: Profile[];
  viewerProfile: Profile;
}) {
  const ownerProfiles = profiles.filter((profile) => profile.role === "business_owner" || profile.id === viewerProfile.id);
  const fields = (
    <>
      {viewerProfile.role === "platform_admin" && (
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#706d62] md:col-span-2">
          Dueño del negocio
          <select className={inputClass("white")} name="owner_id" defaultValue={ownerProfiles[0]?.id ?? viewerProfile.id}>
            {ownerProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.email ?? profile.fullName ?? profile.id} · {profile.role === "platform_admin" ? "admin" : "negocio"}
              </option>
            ))}
          </select>
        </label>
      )}
      <input className={inputClass("white")} name="name" placeholder="Nombre del negocio" required />
      <input className={inputClass("white")} name="slug" placeholder="slug-publico opcional" />
      <select className={inputClass("white")} name="type" defaultValue="repair" aria-label="Plantilla del bot">
        <option value="repair">Negocio local / general</option>
        <option value="repair">Belleza / peluqueria</option>
        <option value="repair">Restaurante / comida</option>
        <option value="repair">Tienda / comercio</option>
        <option value="repair">Servicios profesionales</option>
        <option value="dentist">Salud / odontologia</option>
      </select>
      <input className={inputClass("white")} name="phone" placeholder="Telefono/WhatsApp" required />
      <input
        className={inputClass("white")}
        name="whatsapp_phone_number_id"
        placeholder="WhatsApp Phone Number ID opcional"
      />
      <input className={inputClass("white", "md:col-span-2")} name="location" placeholder="Direccion o zona de cobertura" required />
      <textarea
        className={textareaClass("md:col-span-2")}
        name="description"
        placeholder="Describe en una frase que hace el negocio"
        required
      />
      <textarea
        className={textareaClass()}
        name="services"
        placeholder={"Servicios y precios\nEj: Blanqueamiento dental - desde $180.000 - requiere valoracion"}
        required
      />
      <textarea
        className={textareaClass()}
        name="hours"
        placeholder={"Horarios disponibles\nEj: Lunes a viernes 8:00 a.m. a 6:00 p.m."}
        required
      />
      <textarea
        className={textareaClass("md:col-span-2")}
        name="rules"
        placeholder={"Instrucciones del bot\nEj: No confirmar citas; dejarlas pendientes para revision del negocio."}
        required
      />
    </>
  );

  if (compact) {
    return (
      <form action={formAction} className="mt-4 grid gap-3">
        <div className="grid gap-3 md:grid-cols-2">{fields}</div>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton icon={Plus} label="Crear negocio" />
          <ActionMessage state={state} />
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="mt-4">
        <ActionMessage state={state} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{fields}</div>
      <div className="mt-5">
        <SubmitButton icon={Plus} label="Crear negocio" />
      </div>
    </>
  );
}


function FormHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  dark,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${dark ? "bg-white text-black" : "bg-black text-white"}`}>
          <Icon size={18} />
        </span>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${dark ? "text-white/50" : "text-[#706d62]"}`}>
            {eyebrow}
          </p>
          <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
          <p className={`mt-1 max-w-2xl text-sm leading-6 ${dark ? "text-white/65" : "text-[#706d62]"}`}>{description}</p>
        </div>
      </div>
      {action}
    </div>
  );
}


function SubmitButton({
  icon: Icon,
  label,
  small,
}: {
  icon: LucideIcon;
  label: string;
  small?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
        small ? "h-9" : "h-11"
      }`}
      disabled={pending}
    >
      <Icon size={16} />
      {pending ? "Guardando..." : label}
    </button>
  );
}

function StepPill({ number, label, done }: { number: string; label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className={`flex size-8 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-[#e2f26b] text-black" : "bg-white/10 text-white"}`}>
        {done ? <CheckCircle2 size={16} /> : number}
      </span>
      <span className="text-sm font-medium text-white/80">{label}</span>
    </div>
  );
}

function getCompletion(business: Business, faqCount: number, activeServiceCount: number) {
  return [
    { label: "Nombre y contacto", done: Boolean(business.name && business.phone) },
    { label: "Descripcion del negocio", done: business.description.trim().length > 20 },
    { label: "Servicios y precios", done: activeServiceCount > 0 || business.services.length > 0 },
    { label: "Reglas del bot", done: business.rules.length > 0 },
    { label: "FAQs cargadas", done: faqCount > 0 },
  ];
}

function getSetupSteps({
  business,
  completion,
  hasSchedule,
  hasLinks,
}: {
  business: Business;
  completion: { label: string; done: boolean }[];
  hasSchedule: boolean;
  hasLinks: boolean;
}) {
  return [
    { id: "business" as const, label: "Negocio", done: completion[0]?.done && completion[1]?.done && completion[3]?.done },
    { id: "services" as const, label: "Servicios y precios", done: completion[2]?.done },
    { id: "knowledge" as const, label: "Conocimiento y FAQs", done: completion[4]?.done },
    { id: "schedule" as const, label: "Agenda", done: hasSchedule, optional: true },
    { id: "links" as const, label: "Enlaces", done: hasLinks, optional: true },
    { id: "whatsapp" as const, label: "WhatsApp", done: Boolean(business.whatsappPhoneNumberId), optional: true },
    { id: "test" as const, label: "Probar asistente", done: false },
  ];
}

function inputClass(variant: "default" | "white" = "default", extra = "") {
  return `h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-black ${
    variant === "white" ? "bg-white" : "bg-[#f8f6f1]"
  } ${extra}`;
}

function textareaClass(extra = "") {
  return `min-h-24 rounded-lg border border-black/15 bg-[#f8f6f1] px-3 py-2 text-sm font-normal leading-6 outline-none focus:border-black ${extra}`;
}
