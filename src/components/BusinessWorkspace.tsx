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
  Save,
  Settings2,
  Sparkles,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createBusinessWithFeedback,
  createAvailabilitySlotWithFeedback,
  createBusinessLinkWithFeedback,
  createFaqWithFeedback,
  deleteAvailabilitySlotWithFeedback,
  deleteBusinessWithFeedback,
  deleteBusinessLinkWithFeedback,
  deleteFaqWithFeedback,
  saveBusinessHoursWithFeedback,
  updateBusinessWithFeedback,
  updateBusinessLinkWithFeedback,
  updateFaqWithFeedback,
} from "@/app/actions";
import { ActionMessage } from "@/components/ActionForms";
import type { AvailabilitySlot, Business, BusinessFaq, BusinessHour, BusinessLink } from "@/lib/types";

export function BusinessWorkspace({
  businesses,
  faqs,
  businessHours,
  availabilitySlots,
  businessLinks,
  whatsappBusinessSlug,
}: {
  businesses: Business[];
  faqs: BusinessFaq[];
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
  businessLinks: BusinessLink[];
  whatsappBusinessSlug: string;
}) {
  const [selectedId, setSelectedId] = useState(businesses[0]?.id ?? "");
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? businesses[0];
  const [businessState, businessAction] = useActionState(updateBusinessWithFeedback, null);
  const businessFaqs = useMemo(
    () => (selectedBusiness ? faqs.filter((faq) => faq.businessId === selectedBusiness.id) : []),
    [faqs, selectedBusiness],
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
  const completion = selectedBusiness ? getCompletion(selectedBusiness, businessFaqs.length) : [];

  return (
    <div className="grid gap-6">
      <SetupIntro hasBusinesses={businesses.length > 0} />

      {businesses.length === 0 ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <ManualSetupGuide />
          <CreateBusinessForm variant="empty" />
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
                  onChange={(event) => setSelectedId(event.target.value)}
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

          <CreateBusinessForm variant="compact" />

          {selectedBusiness && (
            <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
              <aside className="grid content-start gap-4">
                <CompletionCard completion={completion} business={selectedBusiness} faqCount={businessFaqs.length} />
                <WhatsAppStatusCard business={selectedBusiness} whatsappBusinessSlug={whatsappBusinessSlug} />
                <BotInstructionCard />
                <DangerZone business={selectedBusiness} />
              </aside>

              <div className="grid gap-6">
                <form
                  key={selectedBusiness.id}
                  action={businessAction}
                  className="rounded-xl border border-black/10 bg-white p-5 shadow-sm"
                >
                  <input type="hidden" name="id" value={selectedBusiness.id} />
                  <FormHeader
                    icon={Building2}
                    eyebrow="Paso 1"
                    title="Datos del negocio"
                    description="Esto identifica al negocio y le da contexto basico al asistente."
                    action={<IconSubmitButton label="Guardar negocio" />}
                  />
                  <div className="mt-4">
                    <ActionMessage state={businessState} />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field name="name" label="Nombre visible" defaultValue={selectedBusiness.name} required />
                    <Field name="phone" label="Telefono o WhatsApp" defaultValue={selectedBusiness.phone} required />
                    <Field name="location" label="Direccion o zona de cobertura" defaultValue={selectedBusiness.location} required />
                    <Field name="hours" label="Horarios y disponibilidad" defaultValue={selectedBusiness.hours} textarea required />
                    <Field
                      name="description"
                      label="Que hace el negocio"
                      defaultValue={selectedBusiness.description}
                      textarea
                      required
                    />
                    <Field
                      name="services"
                      label="Servicios y precios"
                      defaultValue={selectedBusiness.services.join("\n")}
                      textarea
                      required
                      hint="Un servicio por linea. Incluye precio, duracion o condicion si aplica."
                    />
                    <Field
                      name="rules"
                      label="Instrucciones del bot"
                      defaultValue={selectedBusiness.rules.join("\n")}
                      textarea
                      required
                      hint="Ej: no confirmar citas sin validacion, pedir nombre y telefono, no inventar precios."
                      className="md:col-span-2"
                    />
                  </div>
                </form>

                <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <FormHeader
                    icon={Link2}
                    eyebrow="Opcional"
                    title="Enlaces y redirecciones"
                    description="Agrega links aprobados para catalogos, pagos, reservas, ubicacion o soporte. El bot solo debe enviar enlaces que esten aqui."
                  />

                  <BusinessLinksEditor businessId={selectedBusiness.id} links={selectedBusinessLinks} />
                </section>

                <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <FormHeader
                    icon={Clock3}
                    eyebrow="Opcional"
                    title="Agenda y disponibilidad avanzada"
                    description="Usa esto solo si el negocio trabaja con horarios definidos. Si no lo configuras, el bot deja las citas como solicitudes pendientes."
                  />
                  <ScheduleEditor
                    business={selectedBusiness}
                    businessHours={selectedBusinessHours}
                    availabilitySlots={selectedAvailabilitySlots}
                  />
                </section>

                <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
                  <FormHeader
                    icon={HelpCircle}
                    eyebrow="Paso 2"
                    title="Preguntas frecuentes"
                    description="Agrega respuestas aprobadas. El bot las usa como fuente principal antes de improvisar."
                  />

                  <CreateFaqForm businessId={selectedBusiness.id} />

                  <div className="mt-5 grid gap-3">
                    {businessFaqs.map((faq) => (
                      <FaqEditor key={faq.id} faq={faq} />
                    ))}
                    {businessFaqs.length === 0 && (
                      <div className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-5 text-sm text-[#706d62]">
                        Todavia no hay FAQs. Crea al menos una con una pregunta real de cliente.
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-black/10 bg-[#111111] p-5 text-white shadow-sm">
                  <FormHeader
                    icon={Sparkles}
                    eyebrow="Paso 3"
                    title="Prueba el asistente"
                    description="Cuando termines la configuracion, prueba la pagina publica o escribe al WhatsApp conectado."
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
                      WhatsApp responde con el negocio cuyo slug coincida con `WHATSAPP_DEFAULT_BUSINESS_SLUG`.
                    </div>
                  </div>
                </section>
              </div>
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

function CompletionCard({
  completion,
  business,
  faqCount,
}: {
  completion: { label: string; done: boolean }[];
  business: Business;
  faqCount: number;
}) {
  const completed = completion.filter((item) => item.done).length;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#706d62]">Checklist</p>
      <h2 className="mt-2 text-2xl font-semibold">{business.name}</h2>
      <p className="mt-1 text-sm text-[#706d62]">
        {completed}/{completion.length} partes listas. FAQs creadas: {faqCount}.
      </p>
      <div className="mt-5 grid gap-2">
        {completion.map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] px-3 py-2">
            <CheckCircle2 size={17} className={item.done ? "text-[#5f7f23]" : "text-[#c5bfae]"} />
            <span className="text-sm font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ScheduleEditor({
  business,
  businessHours,
  availabilitySlots,
}: {
  business: Business;
  businessHours: BusinessHour[];
  availabilitySlots: AvailabilitySlot[];
}) {
  const [hoursState, hoursAction] = useActionState(saveBusinessHoursWithFeedback, null);
  const [slotState, slotAction] = useActionState(createAvailabilitySlotWithFeedback, null);

  return (
    <div className="mt-5 grid gap-5">
      <form action={hoursAction} className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <input type="hidden" name="business_id" value={business.id} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Horario semanal opcional</h3>
            <p className="mt-1 text-sm text-[#706d62]">
              Si lo dejas vacio, el bot no bloquea horarios: solo registra solicitudes pendientes para revision.
            </p>
          </div>
          <SubmitButton icon={Save} label="Guardar horario" />
        </div>
        <div className="mt-4 grid gap-3">
          {weekDays.map((day) => {
            const current = businessHours.find((hour) => hour.dayOfWeek === day.value);
            return (
              <div key={day.value} className="grid gap-3 rounded-lg border border-black/10 bg-white p-3 md:grid-cols-[1fr_1fr_1fr] md:items-center">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" name={`day_${day.value}_enabled`} defaultChecked={Boolean(current)} />
                  {day.label}
                </label>
                <input
                  className={inputClass("default")}
                  type="time"
                  name={`day_${day.value}_opens`}
                  defaultValue={current?.opensAt ?? "09:00"}
                />
                <input
                  className={inputClass("default")}
                  type="time"
                  name={`day_${day.value}_closes`}
                  defaultValue={current?.closesAt ?? "18:00"}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <ActionMessage state={hoursState} />
        </div>
      </form>

      <form action={slotAction} className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
        <input type="hidden" name="business_id" value={business.id} />
        <div>
          <h3 className="font-semibold">Excepciones por fecha</h3>
          <p className="mt-1 text-sm text-[#706d62]">
            Usa esto solo para negocios que manejan agenda: abre cupos especiales, bloquea horas o marca horas ocupadas.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className={inputClass("white")} type="date" name="date" required />
          <select className={inputClass("white")} name="status" defaultValue="blocked">
            <option value="available">Disponible especial</option>
            <option value="blocked">Bloqueado</option>
            <option value="booked">Ocupado</option>
          </select>
          <input className={inputClass("white")} type="time" name="start_time" defaultValue="09:00" required />
          <input className={inputClass("white")} type="time" name="end_time" defaultValue="09:30" required />
          <input className={inputClass("white", "md:col-span-2")} name="notes" placeholder="Nota opcional" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SubmitButton icon={Plus} label="Agregar excepcion" />
          <ActionMessage state={slotState} />
        </div>
      </form>

      <div className="rounded-lg border border-black/10 bg-white p-4">
        <h3 className="font-semibold">Excepciones guardadas</h3>
        <div className="mt-3 grid gap-2">
          {availabilitySlots.map((slot) => (
            <AvailabilitySlotRow key={slot.id} slot={slot} />
          ))}
          {availabilitySlots.length === 0 && (
            <p className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-4 text-sm text-[#706d62]">
              No hay excepciones. Si tampoco hay horario semanal, el bot registrara citas como pendientes sin validar cupos.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailabilitySlotRow({ slot }: { slot: AvailabilitySlot }) {
  const [state, formAction] = useActionState(deleteAvailabilitySlotWithFeedback, null);
  const statusLabel: Record<AvailabilitySlot["status"], string> = {
    available: "Disponible",
    blocked: "Bloqueado",
    booked: "Ocupado",
  };

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <p className="font-semibold">
          {slot.date} · {slot.startTime} - {slot.endTime}
        </p>
        <p className="mt-1 text-[#706d62]">
          {statusLabel[slot.status]}
          {slot.notes ? ` · ${slot.notes}` : ""}
        </p>
      </div>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={slot.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold">
          <Trash2 size={15} />
          Eliminar
        </button>
        <ActionMessage state={state} compact />
      </form>
    </article>
  );
}

function WhatsAppStatusCard({
  business,
  whatsappBusinessSlug,
}: {
  business: Business;
  whatsappBusinessSlug: string;
}) {
  const isConnected = Boolean(whatsappBusinessSlug) && whatsappBusinessSlug === business.slug;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 font-semibold">
        <Link2 size={18} />
        WhatsApp
      </div>
      <div
        className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${
          isConnected
            ? "border-[#93b35d]/40 bg-[#eef7d2] text-[#3f551c]"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {isConnected ? "Este negocio esta conectado al WhatsApp." : "Este negocio aun no es el activo de WhatsApp."}
      </div>
      <dl className="mt-4 grid gap-3 text-sm">
        <div>
          <dt className="font-semibold">Slug de este negocio</dt>
          <dd className="mt-1 rounded-md bg-[#f8f6f1] px-3 py-2 font-mono text-xs">{business.slug}</dd>
        </div>
        <div>
          <dt className="font-semibold">Slug activo en WhatsApp</dt>
          <dd className="mt-1 rounded-md bg-[#f8f6f1] px-3 py-2 font-mono text-xs">
            {whatsappBusinessSlug || "sin configurar"}
          </dd>
        </div>
      </dl>
      {!isConnected && (
        <p className="mt-3 text-sm leading-6 text-[#706d62]">
          Cuando quieras probar este negocio por WhatsApp, actualizamos la variable de entorno a este slug.
        </p>
      )}
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

function CreateBusinessForm({ variant }: { variant: "empty" | "compact" }) {
  const [state, formAction] = useActionState(createBusinessWithFeedback, null);
  const compact = variant === "compact";

  if (compact) {
    return (
      <details className="rounded-xl border border-black/10 bg-[#f8f6f1] p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold">Agregar negocio nuevo</summary>
        <p className="mt-3 text-sm leading-6 text-[#706d62]">
          Este formulario crea un registro nuevo. El negocio activo de arriba seguira igual hasta que lo selecciones.
        </p>
        <CreateBusinessFields state={state} formAction={formAction} compact />
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
      <CreateBusinessFields state={state} formAction={formAction} />
    </form>
  );
}

function CreateBusinessFields({
  state,
  formAction,
  compact,
}: {
  state: Parameters<typeof ActionMessage>[0]["state"];
  formAction: (payload: FormData) => void;
  compact?: boolean;
}) {
  const fields = (
    <>
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

function CreateFaqForm({ businessId }: { businessId: string }) {
  const [state, formAction] = useActionState(createFaqWithFeedback, null);

  return (
    <form action={formAction} className="mt-5 grid gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <input type="hidden" name="business_id" value={businessId} />
      <input className={inputClass()} name="question" placeholder="Pregunta real del cliente" required />
      <textarea
        className={textareaClass()}
        name="answer"
        placeholder="Respuesta exacta que quieres que use el bot"
        required
      />
      <input className={inputClass()} name="category" placeholder="Categoria opcional: precios, horarios, citas..." />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton icon={Plus} label="Crear FAQ" />
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function FaqEditor({ faq }: { faq: BusinessFaq }) {
  const [updateState, updateAction] = useActionState(updateFaqWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteFaqWithFeedback, null);

  return (
    <article className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <form action={updateAction} className="grid gap-3">
        <input type="hidden" name="id" value={faq.id} />
        <input className={inputClass("white", "font-semibold")} name="question" defaultValue={faq.question} />
        <textarea className={textareaClass("bg-white")} name="answer" defaultValue={faq.answer} />
        <input className={inputClass("white")} name="category" defaultValue={faq.category ?? ""} placeholder="Categoria" />
        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton icon={Save} label="Guardar FAQ" small />
          <ActionMessage state={updateState} compact />
        </div>
      </form>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={faq.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold">
          <Trash2 size={15} />
          Eliminar
        </button>
        <ActionMessage state={deleteState} compact />
      </form>
    </article>
  );
}

function BusinessLinksEditor({ businessId, links }: { businessId: string; links: BusinessLink[] }) {
  const [state, formAction] = useActionState(createBusinessLinkWithFeedback, null);

  return (
    <div className="mt-5 grid gap-4">
      <form action={formAction} className="grid gap-3 rounded-lg border border-black/10 bg-[#f8f6f1] p-4 md:grid-cols-2">
        <input type="hidden" name="business_id" value={businessId} />
        <input className={inputClass()} name="label" placeholder="Nombre del enlace. Ej: Catalogo" required />
        <input className={inputClass()} name="url" placeholder="https://..." required />
        <select className={inputClass()} name="purpose" defaultValue="general" aria-label="Uso del enlace">
          <option value="general">General</option>
          <option value="booking">Reserva / agenda externa</option>
          <option value="payment">Pago</option>
          <option value="catalog">Catalogo</option>
          <option value="location">Ubicacion</option>
          <option value="support">Soporte</option>
        </select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-black/15 bg-[#f8f6f1] px-3 text-sm">
          <input type="checkbox" name="is_active" defaultChecked />
          Activo para el bot
        </label>
        <textarea
          className={textareaClass("md:col-span-2")}
          name="notes"
          placeholder="Cuando debe enviarlo. Ej: Si piden pagar anticipo, enviar este link."
        />
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <SubmitButton icon={Plus} label="Agregar enlace" />
          <ActionMessage state={state} />
        </div>
      </form>

      <div className="grid gap-3">
        {links.map((link) => (
          <BusinessLinkEditor key={link.id} link={link} />
        ))}
        {links.length === 0 && (
          <p className="rounded-lg border border-dashed border-black/15 bg-[#f8f6f1] p-4 text-sm text-[#706d62]">
            No hay enlaces. Si el cliente pide un link, el bot respondera que debe confirmarlo con el negocio.
          </p>
        )}
      </div>
    </div>
  );
}

function BusinessLinkEditor({ link }: { link: BusinessLink }) {
  const [updateState, updateAction] = useActionState(updateBusinessLinkWithFeedback, null);
  const [deleteState, deleteAction] = useActionState(deleteBusinessLinkWithFeedback, null);

  return (
    <article className="rounded-lg border border-black/10 bg-[#f8f6f1] p-4">
      <form action={updateAction} className="grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={link.id} />
        <input className={inputClass("white", "font-semibold")} name="label" defaultValue={link.label} />
        <input className={inputClass("white")} name="url" defaultValue={link.url} />
        <select className={inputClass("white")} name="purpose" defaultValue={link.purpose} aria-label="Uso del enlace">
          <option value="general">General</option>
          <option value="booking">Reserva / agenda externa</option>
          <option value="payment">Pago</option>
          <option value="catalog">Catalogo</option>
          <option value="location">Ubicacion</option>
          <option value="support">Soporte</option>
        </select>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={link.isActive} />
          Activo para el bot
        </label>
        <textarea className={textareaClass("bg-white md:col-span-2")} name="notes" defaultValue={link.notes} />
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <SubmitButton icon={Save} label="Guardar enlace" small />
          <ActionMessage state={updateState} compact />
        </div>
      </form>
      <form action={deleteAction} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={link.id} />
        <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/15 bg-white px-3 text-sm font-semibold">
          <Trash2 size={15} />
          Eliminar
        </button>
        <ActionMessage state={deleteState} compact />
      </form>
    </article>
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

function Field({
  name,
  label,
  defaultValue,
  textarea,
  required,
  hint,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue: string;
  textarea?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm font-semibold ${className}`}>
      {label}
      {textarea ? (
        <textarea name={name} className={textareaClass()} defaultValue={defaultValue} required={required} />
      ) : (
        <input name={name} className={inputClass()} defaultValue={defaultValue} required={required} />
      )}
      {hint && <span className="text-xs font-normal leading-5 text-[#706d62]">{hint}</span>}
    </label>
  );
}

function IconSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="flex size-11 items-center justify-center rounded-lg bg-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={label}
      disabled={pending}
    >
      {pending ? <span className="size-4 rounded-full border-2 border-white/40 border-t-white" /> : <Save size={17} />}
    </button>
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

const weekDays = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
];

function getCompletion(business: Business, faqCount: number) {
  return [
    { label: "Nombre y contacto", done: Boolean(business.name && business.phone) },
    { label: "Descripcion del negocio", done: business.description.trim().length > 20 },
    { label: "Servicios y precios", done: business.services.length > 0 },
    { label: "Reglas del bot", done: business.rules.length > 0 },
    { label: "FAQs cargadas", done: faqCount > 0 },
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
