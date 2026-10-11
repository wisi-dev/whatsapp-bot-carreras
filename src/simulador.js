/**
 * ============================================================
 *  SIMULADOR LOCAL DEL BOT  (npm run simulador)
 * ============================================================
 * Abre un chat tipo WhatsApp en http://localhost:3001 para probar
 * el bot ANTES de conectarlo a Meta.
 *
 *  - Usa exactamente la misma lógica (flow.js) y los mismos textos (messages.js).
 *  - NO envía nada a Meta ni a internet: no hace falta TOKEN ni .env.
 *  - Solo escucha en 127.0.0.1, así que nadie más en la red puede abrirlo.
 *  - Los datos que cargues se guardan aparte, en data/leads-simulador.jsonl.
 */
process.env.LEADS_FILE = 'leads-simulador.jsonl';
// Número ficticio de asesor para poder ver en pantalla el aviso que recibiría.
process.env.ADVISOR_PHONE = process.env.ADVISOR_PHONE || 'ASESOR';

const path = require('path');
const express = require('express');
const wa = require('./whatsapp');
const { handleIncomingMessage } = require('./flow');
const { resetSession } = require('./sessions');

const PORT = Number(process.env.SIM_PORT) || 3001;

// Todo lo que el bot "enviaría" a Meta queda guardado acá en lugar de salir a internet.
const outbox = [];
wa.setTransport(async (payload) => {
  if (payload.status !== 'read') outbox.push(payload);
  return { messages: [{ id: `sim.${Date.now()}` }] };
});

let msgCounter = 0;

/** Arma el mensaje con el mismo formato que manda Meta al webhook. */
function toMetaMessage(from, input) {
  const base = { from, id: `wamid.sim.${++msgCounter}`, timestamp: String(Math.floor(Date.now() / 1000)) };
  if (input.type === 'button_reply' || input.type === 'list_reply') {
    return {
      ...base,
      type: 'interactive',
      interactive: { type: input.type, [input.type]: { id: input.id, title: input.title } },
    };
  }
  if (input.type === 'other') return { ...base, type: 'audio', audio: { id: 'sim' } };
  return { ...base, type: 'text', text: { body: String(input.text || '') } };
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'simulador.html')));

// El navegador manda lo que "escribe el cliente" y recibe lo que respondería el bot.
app.post('/api/mensaje', async (req, res) => {
  const { from = '5490000000001', perfil = 'Cliente de prueba', fechaHoy, mensaje } = req.body || {};
  if (!mensaje) return res.status(400).json({ error: 'Falta el mensaje' });

  // Permite probar cómo se ve el calendario en otra fecha.
  if (fechaHoy && /^\d{4}-\d{2}-\d{2}$/.test(fechaHoy)) process.env.FECHA_HOY = fechaHoy;
  else delete process.env.FECHA_HOY;

  outbox.length = 0;
  try {
    await handleIncomingMessage(toMetaMessage(from, mensaje), { profile: { name: perfil }, wa_id: from });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
  const enviados = outbox.splice(0);
  res.json({
    respuestas: enviados.filter((p) => p.to === from),
    avisosAsesor: enviados.filter((p) => p.to !== from),
  });
});

app.post('/api/reiniciar', (req, res) => {
  resetSession((req.body && req.body.from) || '5490000000001');
  res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🧪 Simulador listo: abrí http://localhost:${PORT} en tu navegador`);
  console.log('   (no se envía nada a Meta; cortalo con Ctrl+C)');
});
