# Tactio

MVP SaaS para que negocios locales configuren un asistente comercial, atiendan conversaciones web y WhatsApp, capturen clientes, reciban solicitudes de cita y administren cotizaciones.

## Stack

- Next.js 16 App Router, React 19 y TypeScript
- Supabase Auth, PostgreSQL, RLS y Storage
- DeepSeek u OpenAI mediante API compatible
- WhatsApp Business Cloud API

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

```bash
npm run lint
npm test
npm run build
```

## Rutas

- `/`: dashboard privado
- `/admin`: usuarios y negocios, solo para el administrador de plataforma
- `/businesses`: configuración del negocio, FAQs, enlaces y agenda opcional
- `/conversations`: clientes e historial
- `/appointments`: solicitudes de cita
- `/quotes`: cotizaciones
- `/payments`: comprobantes privados
- `/b/[slug]`: chat web público
- `/api/whatsapp/webhook`: webhook de Meta

## Configuración

Copia `.env.example` a `.env.local`. Nunca guardes llaves reales en Git.

Tactio no incluye valores de respaldo para Supabase. Si estas variables faltan, la aplicacion se detiene con un error claro para evitar que localhost termine escribiendo por accidente en la base de produccion.

### Desarrollo separado de produccion

1. Crea un proyecto o una rama de desarrollo en Supabase.
2. Copia su URL y publishable key a `.env.local`.
3. Conserva las credenciales del proyecto productivo solamente en Vercel Production.
4. Usa proyectos distintos para desarrollo, preview y produccion.

Variables del servidor:

- `DEEPSEEK_API_KEY` o `OPENAI_API_KEY`
- `INTERNAL_API_TOKEN`: token aleatorio de al menos 24 caracteres
- `WHATSAPP_VERIFY_TOKEN`: token usado para verificar el webhook; también funciona como respaldo local de `INTERNAL_API_TOKEN`
- `WHATSAPP_APP_SECRET`: App Secret de Meta usado para validar `x-hub-signature-256`; obligatorio en producción
- `WHATSAPP_ACCESS_TOKEN`: token de WhatsApp Cloud API
- `WHATSAPP_PHONE_NUMBER_ID`: número emisor de respaldo
- `WHATSAPP_DEFAULT_BUSINESS_SLUG`: negocio de respaldo para la configuración antigua de un solo número
- `WHATSAPP_APPOINTMENT_TEMPLATE_NAME`: plantilla aprobada para confirmar citas fuera de la ventana de 24 horas
- `WHATSAPP_QUOTE_TEMPLATE_NAME`: plantilla aprobada para enviar cotizaciones fuera de la ventana de 24 horas
- `WHATSAPP_TEMPLATE_LANGUAGE`: idioma de las plantillas; por defecto `es_CO`
- `BUSINESS_TIME_ZONE`: zona horaria usada por la agenda; por defecto `America/Bogota`

Variables públicas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

La publishable key de Supabase puede estar en el navegador. Las llaves de IA, Meta y cualquier service-role nunca deben usar el prefijo `NEXT_PUBLIC_`.

## Supabase

Las migraciones están en `supabase/migrations`. Incluyen:

- aislamiento por propietario y rol de administrador
- agenda opcional con horarios, bloqueos y prevención de doble reserva
- almacenamiento privado de comprobantes
- persistencia de conversaciones web y WhatsApp
- rate limiting e idempotencia de webhooks
- RPC internos protegidos por un token cuyo hash SHA-256 se guarda en `private.app_secrets`

Después de elegir `INTERNAL_API_TOKEN`, registra únicamente su hash en Supabase:

```sql
insert into private.app_secrets (key, value_hash)
values ('internal_api_token', '<sha256-en-hexadecimal>')
on conflict (key)
do update set value_hash = excluded.value_hash, updated_at = now();
```

## Agenda

La agenda estructurada es opcional. Si un negocio configura horarios y bloqueos, Tactio valida apertura, intervalos ocupados y solicitudes activas. Si no configura agenda, la solicitud se guarda como `pending` para revisión manual. El bot no confirma citas automáticamente.

## WhatsApp

Cada negocio puede guardar su `WhatsApp Phone Number ID`. El webhook usa el `phone_number_id` recibido de Meta para seleccionar el negocio correcto y responder desde ese mismo número.

Para producción:

1. Configura la URL pública `/api/whatsapp/webhook` y `WHATSAPP_VERIFY_TOKEN` en Meta.
2. Agrega `WHATSAPP_APP_SECRET` al entorno del servidor.
3. Suscribe el campo `messages`.
4. Guarda el Phone Number ID correspondiente en cada negocio.

En Vercel abre **Project Settings > Environment Variables**, crea `WHATSAPP_APP_SECRET` para Production y vuelve a desplegar. La pantalla **Configurar bot** muestra solo si cada variable existe; nunca muestra sus valores.

Los botones **Confirmar y notificar** y **Enviar por WhatsApp** solo cambian el estado después de que Meta devuelve un identificador de mensaje. Si falla, la entrega queda como `failed` y el estado comercial anterior se conserva. Para conversaciones fuera de la ventana de 24 horas, crea las dos plantillas aprobadas en Meta y configura sus nombres. La plantilla de cita espera cinco variables (cliente, negocio, servicio, fecha y hora); la de cotización espera cinco (cliente, negocio, servicio, rango y descripción).

## IA

`AI_PROVIDER` acepta `deepseek`, `openai` o `none`. Sin una llave válida, el sistema usa respuestas deterministas basadas en la configuración del negocio. El historial se lee desde Supabase; el navegador no puede inyectar historial ni escribir directamente en las tablas privadas del chat.
