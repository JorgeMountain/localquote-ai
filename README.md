# LocalQuote AI

MVP de una plataforma SaaS para negocios locales. El producto permite configurar negocios, cargar FAQs, capturar leads desde un chat publico, responder con IA basada en datos del negocio, generar solicitudes de cita y crear cotizaciones estimadas.

La primera pantalla es el dashboard operativo, no una landing page.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- OpenAI API opcional para respuestas IA
- Supabase real para base de datos y autenticacion
- Adaptador `MessagingProvider` preparado para WhatsApp, con proveedor web activo en el MVP

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Rutas principales:

- `/` dashboard privado protegido por Supabase Auth
- `/businesses` configuracion de negocios y FAQs
- `/conversations` conversaciones recientes
- `/appointments` solicitudes de cita
- `/quotes` cotizaciones
- `/b/sonrisa-clara` chat publico odontologo
- `/b/fixpro-tecnicos` chat publico tecnico

## Variables de entorno

Copia `.env.example` a `.env.local` si vas a conectar servicios reales.

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Sin `OPENAI_API_KEY`, el chat usa un fallback determinista con FAQs, reglas e intencion detectada. Esto permite probar el MVP sin costo ni llaves.

El proyecto Supabase creado para este MVP es:

```text
https://psyqztntvnrbdbyckgip.supabase.co
```

## Base de datos

La migracion esta en:

```text
supabase/migrations/001_initial_schema.sql
```

Tablas incluidas:

- `profiles`
- `businesses`
- `business_faqs`
- `customers`
- `conversations`
- `messages`
- `appointment_requests`
- `quotes`

La migracion ya fue aplicada al proyecto Supabase real. El dashboard usa queries reales con RLS y el chat publico inserta leads desde la publishable key.

`/businesses` permite crear negocios, editar la ficha del negocio seleccionado, crear FAQs, editar FAQs y eliminarlas. Las paginas de conversaciones, citas y cotizaciones permiten actualizar estados desde el dashboard.

Al registrarte e iniciar sesion, si el dashboard no tiene datos, usa **Cargar demo** para crear:

- Clinica Sonrisa Clara
- FixPro Tecnicos
- FAQs
- Clientes
- Conversaciones
- Solicitudes de cita
- Cotizaciones

## IA

La ruta `POST /api/chat` construye respuestas con:

- Datos del negocio
- Servicios
- Horarios
- Reglas
- FAQs
- Historial reciente

Regla clave: si falta informacion, el asistente debe pedir confirmacion del negocio y no inventar datos.

El flujo comercial solo crea una cita cuando detecta servicio, fecha y hora preferida. Solo crea una cotizacion cuando detecta servicio y descripcion suficiente del caso. Si faltan datos, guarda la conversacion y pide lo faltante.

## WhatsApp

La integracion real no esta construida. La interfaz queda aislada en:

```text
src/lib/messaging.ts
```

Para conectarlo despues:

1. Implementar `WhatsAppProvider` con Twilio o WhatsApp Business API.
2. Normalizar mensajes entrantes al tipo `ChatRequest`.
3. Reutilizar la misma ruta/logica de negocio que usa el chat web.
4. Persistir mensajes en Supabase en lugar del store en memoria.

## Validacion

```bash
npm run lint
npm run build
```
