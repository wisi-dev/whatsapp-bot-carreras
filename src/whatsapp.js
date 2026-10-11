/**
 * Cliente mínimo de la WhatsApp Cloud API.
 *
 * Todos los envíos van a:
 *   POST https://graph.facebook.com/{version}/{PHONE_NUMBER_ID}/messages
 *   Header: Authorization: Bearer {TOKEN}
 *
 * Límites oficiales de Meta que conviene recordar:
 *   - Mensaje tipo "button": máximo 3 botones, título de cada botón ≤ 20 caracteres.
 *   - Mensaje tipo "list":   máximo 10 filas, título de fila ≤ 24, descripción ≤ 72,
 *                            texto del botón que abre la lista ≤ 20.
 * Por eso el menú de 6 opciones de carreras se envía como LISTA y no como botones.
 */

const MAX_BUTTONS = 3;
const MAX_BUTTON_TITLE = 20;
const MAX_ROWS = 10;
const MAX_ROW_TITLE = 24;
const MAX_ROW_DESCRIPTION = 72;

function apiUrl() {
  const version = process.env.GRAPH_API_VERSION || 'v23.0';
  return `https://graph.facebook.com/${version}/${process.env.PHONE_NUMBER_ID}/messages`;
}

// Si se define, reemplaza el envío real a Meta (lo usa el simulador local).
let transport = null;
function setTransport(fn) {
  transport = fn;
}

async function callApi(payload) {
  const body = { messaging_product: 'whatsapp', ...payload };
  if (transport) return transport(body);

  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error ? `${data.error.code} - ${data.error.message}` : res.statusText;
    throw new Error(`WhatsApp API ${res.status}: ${detail}`);
  }
  return data;
}

/** Mensaje de texto simple. previewUrl=true muestra la vista previa del link. */
function sendText(to, body, { previewUrl = false } = {}) {
  return callApi({
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: previewUrl, body },
  });
}

/**
 * Mensaje interactivo con botones de respuesta rápida (Quick Reply Buttons).
 *
 * JSON que se envía a la API:
 * {
 *   "messaging_product": "whatsapp",
 *   "recipient_type": "individual",
 *   "to": "5493511234567",
 *   "type": "interactive",
 *   "interactive": {
 *     "type": "button",
 *     "header": { "type": "text", "text": "Opcional" },
 *     "body":   { "text": "¡Hola! ¿Con qué tema seguimos?" },
 *     "footer": { "text": "Opcional" },
 *     "action": {
 *       "buttons": [
 *         { "type": "reply", "reply": { "id": "MAIN_ASESOR",     "title": "Chatear con asesor" } },
 *         { "type": "reply", "reply": { "id": "MAIN_CARRERAS",   "title": "Interés en carreras" } },
 *         { "type": "reply", "reply": { "id": "MAIN_ESTUDIANTE", "title": "Soy estudiante" } }
 *       ]
 *     }
 *   }
 * }
 *
 * Cuando el usuario toca un botón, Meta nos devuelve el "id" en
 * message.interactive.button_reply.id → así sabemos qué eligió.
 */
function sendButtons(to, body, buttons, { header, footer } = {}) {
  if (buttons.length > MAX_BUTTONS) {
    throw new Error(`Un mensaje de botones admite como máximo ${MAX_BUTTONS} botones`);
  }
  for (const b of buttons) {
    if (b.title.length > MAX_BUTTON_TITLE) {
      throw new Error(`El botón "${b.title}" supera los ${MAX_BUTTON_TITLE} caracteres`);
    }
  }

  const interactive = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
    },
  };
  if (header) interactive.header = { type: 'text', text: header };
  if (footer) interactive.footer = { text: footer };

  return callApi({ recipient_type: 'individual', to, type: 'interactive', interactive });
}

/**
 * Mensaje interactivo de tipo lista (para más de 3 opciones, hasta 10).
 *
 * JSON que se envía a la API:
 * {
 *   "type": "interactive",
 *   "interactive": {
 *     "type": "list",
 *     "body":   { "text": "..." },
 *     "action": {
 *       "button": "Ver carreras",
 *       "sections": [
 *         { "title": "Carreras", "rows": [ { "id": "CAR_ABOGACIA", "title": "Abogacía", "description": "Duración: 5 años" } ] }
 *       ]
 *     }
 *   }
 * }
 *
 * La elección llega en message.interactive.list_reply.id
 */
function sendList(to, body, buttonText, sections, { header, footer } = {}) {
  const rows = sections.flatMap((s) => s.rows);
  if (rows.length > MAX_ROWS) throw new Error(`Una lista admite como máximo ${MAX_ROWS} opciones`);
  if (buttonText.length > MAX_BUTTON_TITLE) {
    throw new Error(`El texto del botón de lista supera los ${MAX_BUTTON_TITLE} caracteres`);
  }
  for (const r of rows) {
    if (r.title.length > MAX_ROW_TITLE) throw new Error(`La opción "${r.title}" supera los ${MAX_ROW_TITLE} caracteres`);
    if (r.description && r.description.length > MAX_ROW_DESCRIPTION) {
      throw new Error(`La descripción de "${r.title}" supera los ${MAX_ROW_DESCRIPTION} caracteres`);
    }
  }

  const interactive = {
    type: 'list',
    body: { text: body },
    action: { button: buttonText, sections },
  };
  if (header) interactive.header = { type: 'text', text: header };
  if (footer) interactive.footer = { text: footer };

  return callApi({ recipient_type: 'individual', to, type: 'interactive', interactive });
}

/** Marca el mensaje como leído (tildes azules). */
function markAsRead(messageId) {
  return callApi({ status: 'read', message_id: messageId });
}

module.exports = { sendText, sendButtons, sendList, markAsRead, setTransport };
