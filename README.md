# Bot de WhatsApp: carreras y atención a estudiantes

Bot hecho con Node.js + Express sobre la **WhatsApp Cloud API** oficial de Meta, con botones de respuesta rápida y listas interactivas.

## Estructura

```
src/
├── index.js              → Servidor Express + webhooks GET (verificación) y POST (mensajes)
├── flow.js               → Lógica de la conversación (procesa clics y textos)
├── messages.js           → TODOS los textos, botones y menús (editá la redacción acá)
├── whatsapp.js           → Envío de mensajes a la API (texto, botones, listas)
├── sessions.js           → En qué paso está cada cliente
├── leads.js              → Guarda los datos de los interesados en data/leads.jsonl
├── config/calendario.js  → FECHAS DE CURSADO: actualizar cada año
└── simulador.js          → Simulador local (npm run simulador)
public/simulador.html     → Interfaz tipo WhatsApp del simulador
```

## Flujo

```
Cualquier mensaje
└─ [Chatear con asesor] [Interés en carreras] [Soy estudiante]
   ├─ Chatear con asesor → derivación a un asesor humano
   ├─ Interés en carreras → pide Nombre y apellido → DNI → Email
   │   └─ Texto sobre duración + lista: Abogacía | Contador Público | Lic. en Administración
   │                                     | Otra carrera | Volver atrás | Finalizar consulta
   │       ├─ Abogacía / Contador / Lic. Adm. → info de la carrera
   │       │    └─ [Chatear con asesor] [Ver otras carreras] [Finalizar consulta]
   │       ├─ Otra carrera → asesor
   │       ├─ Volver atrás → menú principal
   │       └─ Finalizar consulta → despedida
   └─ Soy estudiante → pide DNI
       └─ [Chatear con asesor] [Fecha de cursado] [Pagos]
           ├─ Fecha de cursado → fechas de config/calendario.js
           └─ Pagos → [Sí, ya los generé] [Aún no los generé] [Chatear con asesor]
                ├─ Sí → link de pago
                └─ No → instrucciones para generar aranceles
Después de cada respuesta final → [Volver al menú] [Finalizar consulta] → despedida
```

Además, en cualquier momento:
- **"menú"**, "inicio" u "hola" → vuelve al menú principal.
- **"salir"** o "finalizar" → mensaje de despedida.

### ¿Por qué algunos botones tienen otro texto?

Meta impone estos límites:

| Tipo | Límite |
|------|--------|
| Botones de respuesta rápida | **máx. 3 por mensaje**, título **≤ 20 caracteres** |
| Lista | máx. 10 opciones, título ≤ 24 caracteres |

Por eso:
- "Chatear con un asesor" (21) → **"Chatear con asesor"**
- "Tengo interés en alguna carrera" (31) → **"Interés en carreras"**
- "No, aún no los generé" (22) → **"Aún no los generé"**
- "Licenciatura en Administración" → **"Lic. en Administración"** (en la respuesta sí aparece el nombre completo)
- El menú de **6 opciones** de carreras se envía como **lista** (un botón "Ver opciones" que despliega las 6). Con botones no es posible.

Si cambiás un texto y supera el límite, el bot te avisa con un error en la consola en vez de fallar en silencio.

---

## Probarlo en tu computadora (simulador, sin Meta)

```bash
npm install
npm run simulador
```

Abrí **http://localhost:3001**. Vas a ver un chat igual a WhatsApp donde hacés de cliente:

- Usa **la misma lógica y los mismos textos** que el bot real.
- **No envía nada a Meta ni a internet** y no necesita token ni `.env`.
- Solo se puede abrir desde tu computadora (escucha en `127.0.0.1`).
- **Ver JSON** muestra el JSON exacto que se le mandaría a la API de Meta en cada mensaje.
- **Fecha simulada** sirve para ver qué responde "Fecha de cursado" en otro día.
- 🎤 simula que el cliente manda un audio.
- Cuando alguien pide un asesor, se muestra el aviso que recibiría el asesor.
- Si editás `messages.js` o `calendario.js`, el simulador se reinicia solo: recargá la página para ver los cambios.
- Los datos que cargues se guardan aparte, en `data/leads-simulador.jsonl`.

---

## Paso a paso para desplegarlo

### 1. Crear la app en Meta
1. Entrá a <https://developers.facebook.com/apps> → **Crear app** → tipo **Business**.
2. Dentro de la app, agregá el producto **WhatsApp**.
3. En **WhatsApp > API Setup** vas a ver:
   - Un **token de acceso temporal** (dura 24 h) → sirve para probar.
   - El **Phone number ID** → va en `PHONE_NUMBER_ID`.
   - Un número de prueba. En modo prueba solo podés escribirle a los números que agregues en "To" (hasta 5).

### 2. Configurar el proyecto
```bash
npm install
```
Copiá `.env.example` como `.env` y completá `TOKEN`, `PHONE_NUMBER_ID` y `VERIFY_TOKEN` (este último lo inventás vos).

```bash
npm start
```

### 3. Exponerlo a internet (pruebas locales)
Meta necesita una URL **HTTPS pública**. Con [ngrok](https://ngrok.com):
```bash
ngrok http 3000
```
Copiá la URL que te da (ej. `https://abcd-1234.ngrok-free.app`).

### 4. Conectar el webhook
En **WhatsApp > Configuration > Webhook > Edit**:
- **Callback URL:** `https://TU-URL/webhook`
- **Verify token:** el mismo valor que `VERIFY_TOKEN`
- Tocá **Verify and save** (en la consola vas a ver `✅ Webhook verificado por Meta`).
- En **Webhook fields**, suscribite a **messages**.

¡Listo! Escribile al número de WhatsApp y el bot responde.

### 5. Pasar a producción
1. **Token permanente:** en Business Settings → Users → **System users** → crear uno con rol Admin → **Generate token** con permisos `whatsapp_business_messaging` y `whatsapp_business_management`. Reemplazá `TOKEN`.
2. **Número real:** en WhatsApp Manager agregá y verificá el número de la institución.
3. **Hosting:** subilo a [Render](https://render.com), [Railway](https://railway.app) o un VPS:
   - Build: `npm install` — Start: `npm start`
   - Cargá las variables de entorno en el panel del hosting (no subas el `.env`).
   - Actualizá la Callback URL del webhook con la URL definitiva.
4. **Seguridad:** cargá `APP_SECRET` (App settings → Basic) para que el bot rechace POST que no vengan de Meta.
5. **Publicar la app** en modo *Live* desde el panel de Meta.

> Nota: en Render el plan gratuito "duerme" el servidor tras un rato sin uso y el primer mensaje puede tardar. Para atención real conviene un plan pago.

---

## Problemas comunes

| Síntoma | Causa probable / solución |
|---|---|
| "Verify and save" da error | El `VERIFY_TOKEN` no coincide, el servidor no está corriendo o la URL no termina en `/webhook`. |
| Con el número de prueba anda, con el real no llega nada | La cuenta de WhatsApp no está suscripta a la app. Ejecutá:<br>`curl -X POST "https://graph.facebook.com/v23.0/WABA_ID/subscribed_apps" -H "Authorization: Bearer TOKEN"` |
| Error `131030` al responder | En modo prueba, tu celular no está agregado en la lista de destinatarios ("To"). |
| Error `190` | El token venció (el temporal dura 24 h): generá el permanente del System User. |
| El bot tarda en contestar el primer mensaje | El hosting gratuito "durmió" el servidor. |

---

## Derivación a asesores ("Chatear con asesor")

Cuando el cliente elige hablar con un asesor:
1. El bot le avisa que lo va a atender una persona y **deja de responder** a ese cliente durante `HANDOFF_HOURS` (24 h por defecto), o hasta que el cliente escriba "menú".
2. Se registra en consola un resumen (nombre, DNI, mail, carrera consultada).
3. Si configurás `ADVISOR_PHONE`, el bot le manda ese resumen por WhatsApp al asesor.
   ⚠️ WhatsApp solo permite enviar texto libre si ese número le escribió al bot en las últimas 24 h. Si no, hay que usar una plantilla aprobada.

**Importante:** un número conectado a la Cloud API no se puede usar desde la app común de WhatsApp. Para que los asesores respondan necesitan una bandeja de entrada conectada a la API, por ejemplo **Chatwoot** (gratis y de código abierto), Respond.io, Callbell, etc. Otra opción es el modo **"coexistence"** de Meta, que permite usar la app WhatsApp Business y la API con el mismo número.

## Mantenimiento anual

Cada año, al salir el calendario académico, editá **`src/config/calendario.js`** con los inicios de cursado y la fecha límite de inscripción de cada período, y reiniciá el bot.

El bot muestra solo el período en curso (si la inscripción sigue abierta) y los próximos inicios. Si todos los períodos ya pasaron, avisa al estudiante que pronto se publica el calendario nuevo, y al arrancar el servidor muestra una advertencia en la consola.

## Datos de los interesados

Se guardan en `data/leads.jsonl` (un registro por línea con nombre, DNI, mail, WhatsApp y fecha).

---

## Créditos

Este proyecto fue construido con la ayuda de **[Claude Code](https://claude.com/claude-code)**, el asistente de programación de Anthropic, que me ayudó a armar : la organización de los archivos, los webhooks, el manejo de la conversación y el simulador local.

El flujo de la conversación, los textos, estructura del código, los datos del calendario académico y el funcionamiento final fueron **definidos y revisados por mí**.
