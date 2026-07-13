import type {
  AppointmentRequest,
  Business,
  BusinessFaq,
  Conversation,
  Customer,
  Message,
  Quote,
} from "./types";

export const businesses: Business[] = [
  {
    id: "biz-smile",
    ownerId: "demo-owner",
    name: "Clinica Sonrisa Clara",
    slug: "sonrisa-clara",
    type: "dentist",
    description:
      "Clinica odontologica para consultas iniciales, limpiezas, blanqueamiento y valoracion de ortodoncia.",
    services: [
      "Consulta inicial",
      "Limpieza dental",
      "Blanqueamiento",
      "Valoracion de ortodoncia",
    ],
    hours: "Lunes a viernes, 8:00 a.m. a 6:00 p.m. Sabados, 9:00 a.m. a 1:00 p.m.",
    location: "Chapinero, Bogota",
    phone: "+57 300 555 0101",
    rules: [
      "La ortodoncia requiere valoracion presencial antes de cotizar.",
      "La limpieza dental parte de COP 120.000 y puede variar segun valoracion.",
      "Las urgencias se priorizan durante horario laboral.",
      "No prometer disponibilidad sin confirmacion del consultorio.",
    ],
  },
  {
    id: "biz-fix",
    ownerId: "demo-owner",
    name: "FixPro Tecnicos",
    slug: "fixpro-tecnicos",
    type: "repair",
    description:
      "Servicio tecnico local para diagnostico, reparaciones basicas, instalaciones y visitas tecnicas.",
    services: [
      "Diagnostico",
      "Reparacion basica",
      "Instalacion",
      "Visita tecnica",
    ],
    hours: "Lunes a sabado, 7:30 a.m. a 7:00 p.m.",
    location: "Cobertura en Bogota norte y centro",
    phone: "+57 310 555 0202",
    rules: [
      "La visita tecnica tiene un estimado desde COP 80.000.",
      "El precio final depende del repuesto y complejidad.",
      "No confirmar garantia sin revisar el equipo.",
      "Instalaciones requieren direccion completa y fotos del punto.",
    ],
  },
];

export const faqs: BusinessFaq[] = [
  {
    id: "faq-1",
    businessId: "biz-smile",
    question: "Cuanto cuesta una limpieza dental?",
    answer:
      "La limpieza dental parte de COP 120.000. Si hay acumulacion importante o se requiere procedimiento adicional, el odontologo confirma el valor.",
    category: "precios",
  },
  {
    id: "faq-2",
    businessId: "biz-smile",
    question: "Atienden urgencias?",
    answer:
      "Si, se priorizan urgencias durante el horario laboral. El equipo debe confirmar disponibilidad antes de agendar.",
    category: "agenda",
  },
  {
    id: "faq-3",
    businessId: "biz-fix",
    question: "Cuanto vale una visita tecnica?",
    answer:
      "La visita tecnica tiene un estimado desde COP 80.000. El valor final depende de la zona, diagnostico y repuestos.",
    category: "precios",
  },
  {
    id: "faq-4",
    businessId: "biz-fix",
    question: "Reparan el mismo dia?",
    answer:
      "Cuando el dano es basico y hay repuestos disponibles, se puede resolver el mismo dia. Casos complejos requieren diagnostico.",
    category: "servicio",
  },
];

export const customers: Customer[] = [
  {
    id: "cus-1",
    businessId: "biz-smile",
    name: "Laura Medina",
    phone: "+57 301 222 3333",
    status: "appointment",
    createdAt: "2026-06-29T14:20:00.000Z",
  },
  {
    id: "cus-2",
    businessId: "biz-fix",
    name: "Carlos Rios",
    phone: "+57 302 444 5555",
    status: "quoted",
    createdAt: "2026-06-29T16:45:00.000Z",
  },
  {
    id: "cus-3",
    businessId: "biz-smile",
    name: "Marta Leon",
    phone: "+57 320 111 2222",
    status: "new",
    createdAt: "2026-06-30T09:10:00.000Z",
  },
];

export const conversations: Conversation[] = [
  {
    id: "conv-1",
    businessId: "biz-smile",
    customerId: "cus-1",
    channel: "web",
    lastIntent: "appointment",
    createdAt: "2026-06-29T14:20:00.000Z",
    lastMessageAt: "2026-06-29T14:21:20.000Z",
    internalNotes: "",
    tags: [],
  },
  {
    id: "conv-2",
    businessId: "biz-fix",
    customerId: "cus-2",
    channel: "web",
    lastIntent: "quote",
    createdAt: "2026-06-29T16:45:00.000Z",
    lastMessageAt: "2026-06-29T16:46:30.000Z",
    internalNotes: "",
    tags: [],
  },
];

export const messages: Message[] = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    role: "customer",
    body: "Quiero agendar limpieza dental esta semana.",
    createdAt: "2026-06-29T14:21:00.000Z",
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    role: "assistant",
    body: "Puedo tomar tu solicitud. La limpieza parte de COP 120.000 y el consultorio debe confirmar el horario.",
    createdAt: "2026-06-29T14:21:20.000Z",
  },
  {
    id: "msg-3",
    conversationId: "conv-2",
    role: "customer",
    body: "Necesito reparar una lavadora que no centrifuga.",
    createdAt: "2026-06-29T16:46:00.000Z",
  },
  {
    id: "msg-4",
    conversationId: "conv-2",
    role: "assistant",
    body: "Puedo generar una cotizacion estimada. La visita tecnica parte de COP 80.000 y el valor final depende del diagnostico.",
    createdAt: "2026-06-29T16:46:30.000Z",
  },
];

export const appointmentRequests: AppointmentRequest[] = [
  {
    id: "appt-1",
    businessId: "biz-smile",
    customerId: "cus-1",
    service: "Limpieza dental",
    preferredDate: "2026-07-02",
    preferredTime: "10:00",
    status: "pending",
    deliveryStatus: "pending",
  },
];

export const quotes: Quote[] = [
  {
    id: "quote-1",
    businessId: "biz-fix",
    customerId: "cus-2",
    service: "Diagnostico de lavadora",
    description: "Lavadora no centrifuga; requiere visita tecnica.",
    minPrice: 80000,
    maxPrice: 180000,
    notes: "Estimado sujeto a diagnostico y repuestos.",
    status: "sent",
    deliveryStatus: "pending",
  },
];
