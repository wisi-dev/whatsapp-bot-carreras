/**
 * Estado de la conversación de cada cliente (en memoria).
 *
 * Para un solo servidor alcanza. Si escalás a varias instancias o no querés
 * perder las conversaciones al reiniciar, reemplazá el Map por Redis o una base de datos.
 */

const STATES = {
  START: 'START',
  MAIN_MENU: 'MAIN_MENU',
  // Interesados en carreras
  LEAD_NAME: 'LEAD_NAME',
  LEAD_DNI: 'LEAD_DNI',
  LEAD_EMAIL: 'LEAD_EMAIL',
  CAREER_MENU: 'CAREER_MENU',
  CAREER_FOLLOWUP: 'CAREER_FOLLOWUP',
  // Estudiantes
  STUDENT_DNI: 'STUDENT_DNI',
  STUDENT_MENU: 'STUDENT_MENU',
  PAYMENTS_MENU: 'PAYMENTS_MENU',
  // Comunes
  ANYTHING_ELSE: 'ANYTHING_ELSE',
  HANDOFF: 'HANDOFF', // el cliente está hablando con un asesor humano: el bot no responde
};

// Si el cliente no escribe durante este tiempo, la próxima vez arranca de cero.
const SESSION_TTL_MS = 30 * 60 * 1000;
// Tiempo que el bot queda en silencio mientras atiende un asesor.
const HANDOFF_TTL_MS = (Number(process.env.HANDOFF_HOURS) || 24) * 60 * 60 * 1000;

const sessions = new Map();

function isExpired(session, now) {
  const ttl = session.state === STATES.HANDOFF ? HANDOFF_TTL_MS : SESSION_TTL_MS;
  return now - session.updatedAt > ttl;
}

function getSession(waId) {
  const now = Date.now();
  let session = sessions.get(waId);
  if (!session || isExpired(session, now)) {
    session = { state: STATES.START, data: {}, updatedAt: now };
    sessions.set(waId, session);
  }
  return session;
}

function setState(session, state) {
  session.state = state;
  session.updatedAt = Date.now();
}

function resetSession(waId) {
  sessions.delete(waId);
}

// Limpieza periódica para no acumular memoria.
setInterval(() => {
  const now = Date.now();
  for (const [waId, session] of sessions) {
    if (isExpired(session, now)) sessions.delete(waId);
  }
}, 10 * 60 * 1000).unref();

module.exports = { STATES, getSession, setState, resetSession };
