/**
 * ============================================================
 *  Bot de WhatsApp (Cloud API) – Carreras y atención a estudiantes
 * ============================================================
 *
 *  Pasos para desplegarlo (detalle completo en README.md):
 *
 *   1. npm install
 *   2. Copiar .env.example como .env y completar TOKEN, PHONE_NUMBER_ID y VERIFY_TOKEN.
 *   3. npm start  → el servidor queda escuchando en http://localhost:3000
 *   4. Exponerlo a internet con HTTPS:
 *        - En pruebas:   ngrok http 3000
 *        - En producción: subirlo a Render / Railway / un VPS.
 *   5. En developers.facebook.com > tu app > WhatsApp > Configuration > Webhook:
 *        - Callback URL:  https://TU-DOMINIO/webhook
 *        - Verify token:  el mismo valor que VERIFY_TOKEN
 *        - Tocar "Verify and save" y suscribirse al campo "messages".
 *   6. Escribirle al número de WhatsApp: el bot responde con el menú.
 */
require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const { handleIncomingMessage } = require('./flow');
const { periodosVigentes } = require('./messages');

const { PORT = 3000, VERIFY_TOKEN, APP_SECRET } = process.env;

// Verificamos que estén las variables obligatorias antes de arrancar.
for (const name of ['TOKEN', 'PHONE_NUMBER_ID', 'VERIFY_TOKEN']) {
  if (!process.env[name]) {
    console.error(`❌ Falta la variable de entorno ${name}. Revisá tu archivo .env`);
    process.exit(1);
  }
}

const app = express();

// Guardamos el body "crudo" para poder validar la firma de Meta.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));

/**
 * Valida la cabecera X-Hub-Signature-256 que firma Meta con tu App Secret.
 * Si no configuraste APP_SECRET, se omite la validación (no recomendado en producción).
 */
function isValidSignature(req) {
  if (!APP_SECRET) return true;
  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * WEBHOOK GET – Verificación de Meta.
 * Cuando tocás "Verify and save" en Meta, envía:
 *   GET /webhook?hub.mode=subscribe&hub.verify_token=XXX&hub.challenge=123
 * Si el token coincide, hay que devolver el challenge tal cual con status 200.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verificado por Meta');
    return res.status(200).send(challenge);
  }
  console.warn('⚠️  Intento de verificación con token incorrecto');
  return res.sendStatus(403);
});

/**
 * WEBHOOK POST – Mensajes entrantes.
 * Estructura que envía Meta (resumida):
 * {
 *   "object": "whatsapp_business_account",
 *   "entry": [{
 *     "changes": [{
 *       "field": "messages",
 *       "value": {
 *         "contacts": [{ "profile": { "name": "Juan" }, "wa_id": "5493511234567" }],
 *         "messages": [{
 *           "from": "5493511234567", "id": "wamid.XXX", "type": "text" | "interactive",
 *           "text": { "body": "Hola" },
 *           "interactive": { "type": "button_reply", "button_reply": { "id": "MAIN_ASESOR", "title": "..." } }
 *         }]
 *       }
 *     }]
 *   }]
 * }
 * También llegan "statuses" (enviado, entregado, leído) que acá ignoramos.
 */
app.post('/webhook', (req, res) => {
  if (!isValidSignature(req)) {
    console.warn('⚠️  Firma inválida: el POST no proviene de Meta');
    return res.sendStatus(401);
  }

  // Respondemos 200 de inmediato: si Meta no recibe respuesta rápido, reintenta el envío.
  res.sendStatus(200);

  if (req.body?.object !== 'whatsapp_business_account') return;

  for (const entry of req.body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      for (const message of value.messages || []) {
        const contact = (value.contacts || []).find((c) => c.wa_id === message.from);
        handleIncomingMessage(message, contact);
      }
    }
  }
});

// Para que Render/Railway (o vos) puedan chequear que el servidor está vivo.
app.get('/', (_req, res) => res.send('Bot de WhatsApp funcionando ✅'));

app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en el puerto ${PORT}`);
  if (!APP_SECRET) console.warn('⚠️  APP_SECRET no configurado: no se valida la firma de Meta.');
  if (!periodosVigentes().length) {
    console.warn('⚠️  Todos los inicios de src/config/calendario.js ya pasaron: cargá el calendario del año nuevo.');
  }
});
