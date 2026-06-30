# LocalQuote AI

MVP de una plataforma SaaS para negocios locales. El producto permite configurar negocios, cargar FAQs, capturar leads desde un chat publico, responder con IA basada en datos del negocio, generar solicitudes de cita y crear cotizaciones estimadas.

La primera pantalla es el dashboard operativo, no una landing page.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- OpenAI API opcional para respuestas IA
- Supabase preparado para base de datos y autenticacion
- Adaptador `MessagingProvider` preparado para WhatsApp, con proveedor web activo en el MVP

## Ejecutar localmente

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

Rutas principales:

- `/` dashboard privado demo
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Sin `OPENAI_API_KEY`, el chat usa un fallback determinista con FAQs, reglas e intencion detectada. Esto permite probar el MVP sin costo ni llaves.

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

El MVP actual usa datos seed en memoria para ser ejecutable inmediatamente. La capa Supabase esta aislada en `src/lib/supabase.ts` para reemplazar el store demo por queries reales.

## IA

La ruta `POST /api/chat` construye respuestas con:

- Datos del negocio
- Servicios
- Horarios
- Reglas
- FAQs
- Historial reciente

Regla clave: si falta informacion, el asistente debe pedir confirmacion del negocio y no inventar datos.

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
