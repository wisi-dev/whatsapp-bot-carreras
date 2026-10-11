/**
 * Lógica de la conversación.
 *
 *  - Los CLICS EN BOTONES / LISTAS se procesan por su ID (handleReply), así funcionan
 *    aunque el usuario toque un botón de un mensaje anterior.
 *  - Los MENSAJES DE TEXTO se procesan según el paso en que está el usuario (handleText),
 *    por ejemplo cuando le pedimos el nombre, el DNI o el mail.
 */
const wa = require('./whatsapp');
const { ID, CARRERAS, MENUS, TEXTOS, infoCarrera } = require('./messages');
const { STATES, getSession, setState, resetSession } = require('./sessions');
const { saveLead } = require('./leads');

// Palabras que en cualquier momento llevan al menú principal.
const MENU_KEYWORDS = ['menu', 'inicio', 'hola', 'empezar', 'comenzar'];
// Mientras habla con un asesor, solo estas reactivan el bot (para no interrumpir la charla).
const REACTIVATE_KEYWORDS = ['menu', 'inicio'];
const EXIT_KEYWORDS = ['salir', 'finalizar', 'chau', 'adios'];

// ---------- Utilidades ----------

function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function capitalizeName(name) {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\p{L}/gu, (c) => c.toUpperCase());
}

const isValidName = (t) => /^\p{L}[\p{L}'.-]*(\s+\p{L}[\p{L}'.-]*)+$/u.test(t.trim()) && t.length <= 80;
const cleanDni = (t) => t.replace(/[\s.\-]/g, '');
const isValidDni = (dni) => /^\d{7,8}$/.test(dni);
const isValidEmail = (t) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t.trim());

function firstName(session) {
  const full = session.data.nombre || session.data.perfil || '';
  return full.split(' ')[0] || '';
}

// Meta puede reenviar el mismo webhook si tardamos: evitamos procesar dos veces.
const processedIds = new Set();
function alreadyProcessed(id) {
  if (processedIds.has(id)) return true;
  processedIds.add(id);
  if (processedIds.size > 5000) processedIds.delete(processedIds.values().next().value);
  return false;
}

// Cola por usuario: si manda dos mensajes seguidos, se procesan en orden.
const queues = new Map();
function enqueue(key, task) {
  const next = (queues.get(key) || Promise.resolve())
    .then(task)
    .catch((err) => console.error(`[${key}] Error procesando mensaje:`, err.message))
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    });
  queues.set(key, next);
  return next;
}

/** Convierte el mensaje crudo de Meta en algo fácil de manejar. */
function parseMessage(msg) {
  switch (msg.type) {
    case 'text':
      return { kind: 'text', text: msg.text.body.trim() };
    case 'interactive':
      if (msg.interactive.type === 'button_reply') return { kind: 'reply', id: msg.interactive.button_reply.id };
      if (msg.interactive.type === 'list_reply') return { kind: 'reply', id: msg.interactive.list_reply.id };
      return { kind: 'other' };
    case 'button': // respuesta a un botón de plantilla (template)
      return { kind: 'text', text: msg.button.text };
    default: // audio, imagen, sticker, ubicación, etc.
      return { kind: 'other' };
  }
}

// ---------- Acciones reutilizables ----------

async function sendMenu(to, menu) {
  if (menu.sections) return wa.sendList(to, menu.body, menu.buttonText, menu.sections);
  return wa.sendButtons(to, menu.body, menu.buttons);
}

async function showMainMenu(to, session) {
  setState(session, STATES.MAIN_MENU);
  await sendMenu(to, MENUS.principal(firstName(session)));
}

async function showCareerMenu(to, session) {
  setState(session, STATES.CAREER_MENU);
  const primeraVez = !session.data.vioCarreras;
  session.data.vioCarreras = true;
  await sendMenu(to, MENUS.carreras(firstName(session), { primeraVez }));
}

async function showStudentMenu(to, session) {
  setState(session, STATES.STUDENT_MENU);
  await sendMenu(to, MENUS.estudiante());
}

async function askAnythingElse(to, session) {
  setState(session, STATES.ANYTHING_ELSE);
  await sendMenu(to, MENUS.algoMas());
}

async function finish(to, session) {
  await wa.sendText(to, TEXTOS.despedida(firstName(session)));
  resetSession(to); // el próximo mensaje vuelve a empezar desde el menú principal
}

/** Deriva la conversación a un asesor humano y deja al bot en silencio. */
async function handoff(to, session, motivo) {
  setState(session, STATES.HANDOFF);
  await wa.sendText(to, TEXTOS.derivarAsesor());

  const d = session.data;
  const resumen = [
    '🔔 *Nuevo cliente para atender*',
    `Motivo: ${motivo}`,
    `WhatsApp: +${to}`,
    d.perfil && `Nombre de perfil: ${d.perfil}`,
    d.nombre && `Nombre: ${d.nombre}`,
    d.dni && `DNI: ${d.dni}`,
    d.email && `Email: ${d.email}`,
    d.carrera && `Carrera consultada: ${d.carrera}`,
  ]
    .filter(Boolean)
    .join('\n');

  console.log(`[HANDOFF] ${resumen.replace(/\n/g, ' | ')}`);

  // Aviso opcional al asesor. Ojo: WhatsApp solo deja enviar texto libre si ese número
  // le escribió al bot en las últimas 24 h; si no, hay que usar una plantilla aprobada.
  if (process.env.ADVISOR_PHONE) {
    await wa.sendText(process.env.ADVISOR_PHONE, resumen).catch((err) => {
      console.error('No se pudo avisar al asesor:', err.message);
    });
  }
}

// Qué menú reenviar si el usuario escribe texto cuando esperábamos que toque un botón.
const MENU_BY_STATE = {
  [STATES.MAIN_MENU]: showMainMenu,
  [STATES.CAREER_MENU]: showCareerMenu,
  [STATES.CAREER_FOLLOWUP]: (to, s) => sendMenu(to, MENUS.despuesDeCarrera()),
  [STATES.STUDENT_MENU]: showStudentMenu,
  [STATES.PAYMENTS_MENU]: (to, s) => sendMenu(to, MENUS.pagos()),
  [STATES.ANYTHING_ELSE]: askAnythingElse,
};

// ---------- Procesamiento de CLICS en botones y listas ----------

async function handleReply(to, session, id) {
  switch (id) {
    // --- Menú principal ---
    case ID.MAIN_ASESOR:
      return handoff(to, session, 'Consulta general');

    case ID.MAIN_CARRERAS:
      setState(session, STATES.LEAD_NAME);
      return wa.sendText(to, TEXTOS.pedirNombre);

    case ID.MAIN_ESTUDIANTE:
      setState(session, STATES.STUDENT_DNI);
      return wa.sendText(to, TEXTOS.pedirDniEstudiante);

    // --- Carreras ---
    case ID.CAR_ABOGACIA:
    case ID.CAR_CONTADOR:
    case ID.CAR_LIC_ADMIN:
      session.data.carrera = CARRERAS[id].nombre;
      setState(session, STATES.CAREER_FOLLOWUP);
      await wa.sendText(to, infoCarrera(id));
      return sendMenu(to, MENUS.despuesDeCarrera());

    case ID.CAR_OTRA:
      session.data.carrera = 'Otra carrera';
      return handoff(to, session, 'Interés en otra carrera');

    case ID.CAR_ASESOR:
      return handoff(to, session, 'Quiere inscribirse / dudas sobre una carrera');

    case ID.CAR_VER_OTRAS:
      return showCareerMenu(to, session);

    case ID.CAR_VOLVER:
      return showMainMenu(to, session);

    // --- Estudiantes ---
    case ID.STU_ASESOR:
      return handoff(to, session, 'Estudiante');

    case ID.STU_FECHAS:
      await wa.sendText(to, TEXTOS.fechasCursado());
      return askAnythingElse(to, session);

    case ID.STU_PAGOS:
      setState(session, STATES.PAYMENTS_MENU);
      return sendMenu(to, MENUS.pagos());

    // --- Pagos ---
    case ID.PAY_SI:
      await wa.sendText(to, TEXTOS.linkPagos, { previewUrl: true });
      return askAnythingElse(to, session);

    case ID.PAY_NO:
      await wa.sendText(to, TEXTOS.comoGenerarAranceles);
      return askAnythingElse(to, session);

    case ID.PAY_ASESOR:
      return handoff(to, session, 'Estudiante - consulta de pagos');

    // --- Comunes ---
    case ID.MORE_MENU:
      // Si ya se identificó como estudiante, vuelve a su menú; si no, al principal.
      return session.data.esEstudiante ? showStudentMenu(to, session) : showMainMenu(to, session);

    case ID.FINALIZAR:
      return finish(to, session);

    default:
      return showMainMenu(to, session);
  }
}

// ---------- Procesamiento de TEXTO según el paso de la conversación ----------

async function handleText(to, session, text) {
  switch (session.state) {
    // Interesado en carreras: nombre → DNI → email → lista de carreras
    case STATES.LEAD_NAME:
      if (!isValidName(text)) return wa.sendText(to, TEXTOS.nombreInvalido);
      session.data.nombre = capitalizeName(text);
      setState(session, STATES.LEAD_DNI);
      return wa.sendText(to, TEXTOS.pedirDniLead(firstName(session)));

    case STATES.LEAD_DNI: {
      const dni = cleanDni(text);
      if (!isValidDni(dni)) return wa.sendText(to, TEXTOS.dniInvalido);
      session.data.dni = dni;
      setState(session, STATES.LEAD_EMAIL);
      return wa.sendText(to, TEXTOS.pedirEmail);
    }

    case STATES.LEAD_EMAIL: {
      if (!isValidEmail(text)) return wa.sendText(to, TEXTOS.emailInvalido);
      session.data.email = text.trim().toLowerCase();
      const { nombre, dni, email } = session.data;
      await saveLead({ whatsapp: to, nombre, dni, email }).catch((err) =>
        console.error('No se pudo guardar el lead:', err.message)
      );
      return showCareerMenu(to, session);
    }

    // Estudiante: DNI → menú de estudiante
    case STATES.STUDENT_DNI: {
      const dni = cleanDni(text);
      if (!isValidDni(dni)) return wa.sendText(to, TEXTOS.dniInvalido);
      session.data.dni = dni;
      session.data.esEstudiante = true;
      // Acá podrías validar el DNI contra el sistema académico si tuvieran una API.
      return showStudentMenu(to, session);
    }

    // Escribió texto cuando esperábamos un clic: le recordamos usar los botones.
    default: {
      const resend = MENU_BY_STATE[session.state];
      if (resend) {
        await wa.sendText(to, TEXTOS.usaBotones);
        return resend(to, session);
      }
      // Primer mensaje de la conversación → menú principal.
      return showMainMenu(to, session);
    }
  }
}

// ---------- Punto de entrada (lo llama el webhook POST) ----------

function handleIncomingMessage(msg, contact) {
  if (alreadyProcessed(msg.id)) return Promise.resolve();
  const from = msg.from;

  return enqueue(from, async () => {
    wa.markAsRead(msg.id).catch(() => {});

    const session = getSession(from);
    if (contact?.profile?.name && !session.data.perfil) session.data.perfil = contact.profile.name;

    const input = parseMessage(msg);
    const keyword = input.kind === 'text' ? normalize(input.text) : '';

    // Hablando con un asesor: el bot no interviene, salvo que pidan el menú.
    if (session.state === STATES.HANDOFF) {
      if (REACTIVATE_KEYWORDS.includes(keyword)) return showMainMenu(from, session);
      setState(session, STATES.HANDOFF); // renueva el tiempo de silencio
      return;
    }

    if (input.kind === 'reply') return handleReply(from, session, input.id);

    if (input.kind === 'text') {
      if (MENU_KEYWORDS.includes(keyword)) return showMainMenu(from, session);
      if (EXIT_KEYWORDS.includes(keyword)) return finish(from, session);
      return handleText(from, session, input.text);
    }

    // Audio, imagen, etc.
    const waitingForText = [STATES.LEAD_NAME, STATES.LEAD_DNI, STATES.LEAD_EMAIL, STATES.STUDENT_DNI];
    if (waitingForText.includes(session.state)) return wa.sendText(from, TEXTOS.soloTexto);
    return handleText(from, session, ''); // reenvía el menú que corresponda
  });
}

module.exports = { handleIncomingMessage };
