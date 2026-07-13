# Operacion de IA y WhatsApp

## Consumo de IA

Configura las tarifas del modelo en variables del servidor para que Tactio estime el costo por generacion:

- `DEEPSEEK_INPUT_COST_PER_MILLION_USD`
- `DEEPSEEK_OUTPUT_COST_PER_MILLION_USD`
- `OPENAI_INPUT_COST_PER_MILLION_USD`
- `OPENAI_OUTPUT_COST_PER_MILLION_USD`

Si una tarifa no esta configurada, su componente se calcula como cero. La tabla `ai_generations` solo almacena negocio, proveedor, modelo, tokens, costo estimado, latencia, estado y codigo de error. No almacena prompts, respuestas ni API keys.

## Cola de WhatsApp

El webhook de Meta valida la firma y encola cada mensaje antes de responder `200`. El trabajo de IA y el envio a WhatsApp se ejecutan despues de la respuesta mediante `after()`, por lo que Meta no espera al modelo ni al proveedor.

La cola privada reintenta un trabajo hasta tres veces. Para recuperar trabajos pendientes cuando no lleguen nuevos webhooks, configura un cron seguro que haga `POST` a `/api/internal/whatsapp/outbox?limit=5` con este encabezado:

```text
Authorization: Bearer <INTERNAL_API_TOKEN o CRON_SECRET>
```

El endpoint responde solo conteos de trabajos procesados, enviados, reintentados y fallidos; nunca expone mensajes de clientes ni secretos.
