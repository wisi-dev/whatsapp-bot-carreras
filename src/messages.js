/**
 * Textos y menús del bot.
 * Si querés cambiar la redacción de algún mensaje, este es el archivo.
 *
 * IMPORTANTE: los títulos de botón tienen un máximo de 20 caracteres
 * y los de las opciones de lista 24 (límite de Meta).
 */
const calendario = require('./config/calendario');

const LINKS = {
  pagos: 'https://pagonline.ues21.edu.ar/main',
  portalEstudiantes: 'https://estudiantes.uesiglo21.edu.ar/es-AR/',
};

// IDs de cada botón/opción. Es lo que Meta nos devuelve cuando el usuario toca uno.
const ID = {
  MAIN_ASESOR: 'MAIN_ASESOR',
  MAIN_CARRERAS: 'MAIN_CARRERAS',
  MAIN_ESTUDIANTE: 'MAIN_ESTUDIANTE',

  CAR_ABOGACIA: 'CAR_ABOGACIA',
  CAR_CONTADOR: 'CAR_CONTADOR',
  CAR_LIC_ADMIN: 'CAR_LIC_ADMIN',
  CAR_OTRA: 'CAR_OTRA',
  CAR_VOLVER: 'CAR_VOLVER',
  CAR_ASESOR: 'CAR_ASESOR',
  CAR_VER_OTRAS: 'CAR_VER_OTRAS',

  STU_ASESOR: 'STU_ASESOR',
  STU_FECHAS: 'STU_FECHAS',
  STU_PAGOS: 'STU_PAGOS',

  PAY_SI: 'PAY_SI',
  PAY_NO: 'PAY_NO',
  PAY_ASESOR: 'PAY_ASESOR',

  MORE_MENU: 'MORE_MENU',
  FINALIZAR: 'FINALIZAR',
};

// ---------- Carreras ----------

const CARRERAS = {
  [ID.CAR_ABOGACIA]: {
    nombre: 'Abogacía',
    tituloLista: 'Abogacía',
    emoji: '⚖️',
    duracion: '5 años',
    perfil: 'Te formás para asesorar, representar y defender los derechos de personas y organizaciones.',
  },
  [ID.CAR_CONTADOR]: {
    nombre: 'Contador Público',
    tituloLista: 'Contador Público',
    emoji: '📊',
    duracion: '4 años',
    perfil: 'Te preparás para gestionar la información contable, impositiva y financiera de empresas y organizaciones.',
  },
  [ID.CAR_LIC_ADMIN]: {
    nombre: 'Licenciatura en Administración',
    tituloLista: 'Lic. en Administración', // la versión completa supera los 24 caracteres
    emoji: '💼',
    duracion: '5 años',
    perfil: 'Aprendés a planificar, organizar y liderar equipos y proyectos en todo tipo de organizaciones.',
  },
};

function infoCarrera(carreraId) {
  const c = CARRERAS[carreraId];
  return (
    `${c.emoji} *${c.nombre}*\n` +
    `${c.perfil}\n\n` +
    `⏱️ *Duración:* ${c.duracion}.\n` +
    `💻 *Evaluaciones 100% online:* los exámenes y trabajos prácticos los rendís desde tu casa, sin necesidad de trasladarte.\n` +
    `📚 *Cursado semestral:* en cada semestre podés cursar hasta 6 materias, organizando tus tiempos como más te convenga.`
  );
}

// ---------- Menús ----------

const MENUS = {
  principal: (nombre) => ({
    body: `¡Hola${nombre ? `, ${nombre}` : ''}! 👋 Gracias por escribirnos.\n\n¿Con qué tema seguimos?`,
    buttons: [
      { id: ID.MAIN_ASESOR, title: 'Chatear con asesor' },
      { id: ID.MAIN_CARRERAS, title: 'Interés en carreras' },
      { id: ID.MAIN_ESTUDIANTE, title: 'Soy estudiante' },
    ],
  }),

  // 6 opciones → se envía como LISTA (los botones admiten solo 3).
  carreras: (nombre, { primeraVez = true } = {}) => ({
    body: !primeraVez
      ? '¿Qué otra carrera te interesa? Tocá *Ver opciones* 👇'
      : `¡Gracias${nombre ? `, ${nombre}` : ''}! 🙌 Ya registramos tus datos.\n\n` +
      `Te cuento que las *Licenciaturas* y *Abogacía* tienen una duración de *4 a 5 años*, ` +
      `mientras que las *Tecnicaturas* duran *2 años y medio*.\n\n` +
      `¿Qué carrera te interesa? Tocá *Ver opciones* 👇`,
    buttonText: 'Ver opciones',
    sections: [
      {
        title: 'Carreras',
        rows: [
          ...Object.entries(CARRERAS).map(([id, c]) => ({
            id,
            title: c.tituloLista,
            description: `Duración: ${c.duracion}`,
          })),
          { id: ID.CAR_OTRA, title: 'Otra carrera', description: 'Te asesora una persona de nuestro equipo' },
        ],
      },
      {
        title: 'Opciones',
        rows: [
          { id: ID.CAR_VOLVER, title: 'Volver atrás', description: 'Ir al menú principal' },
          { id: ID.FINALIZAR, title: 'Finalizar consulta' },
        ],
      },
    ],
  }),

  despuesDeCarrera: () => ({
    body: '¿Querés avanzar con la inscripción o tenés alguna otra duda?',
    buttons: [
      { id: ID.CAR_ASESOR, title: 'Chatear con asesor' },
      { id: ID.CAR_VER_OTRAS, title: 'Ver otras carreras' },
      { id: ID.FINALIZAR, title: 'Finalizar consulta' },
    ],
  }),

  estudiante: () => ({
    body: '¡Gracias! 🙌 ¿En qué podemos ayudarte?',
    buttons: [
      { id: ID.STU_ASESOR, title: 'Chatear con asesor' },
      { id: ID.STU_FECHAS, title: 'Fecha de cursado' },
      { id: ID.STU_PAGOS, title: 'Pagos' },
    ],
  }),

  pagos: () => ({
    body: '💳 ¿Ya generaste los aranceles?',
    buttons: [
      { id: ID.PAY_SI, title: 'Sí, ya los generé' },
      { id: ID.PAY_NO, title: 'Aún no los generé' },
      { id: ID.PAY_ASESOR, title: 'Chatear con asesor' },
    ],
  }),

  algoMas: () => ({
    body: '¿Te puedo ayudar con algo más?',
    buttons: [
      { id: ID.MORE_MENU, title: 'Volver al menú' },
      { id: ID.FINALIZAR, title: 'Finalizar consulta' },
    ],
  }),
};

// ---------- Fechas del calendario ----------

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Fecha de hoy en Argentina (AAAA-MM-DD). FECHA_HOY permite simular otra fecha para probar. */
function hoyISO() {
  if (process.env.FECHA_HOY) return process.env.FECHA_HOY;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
}

/** "2026-10-05" → "lunes 05/10/2026" */
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dia} ${iso.slice(8, 10)}/${iso.slice(5, 7)}/${y}`;
}

/** "2026-10-05" → "05/10" */
const fechaCorta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Períodos cuya inscripción sigue abierta o todavía no empezaron. */
function periodosVigentes(hoy = hoyISO()) {
  return calendario.periodos.filter((p) => p.inscripcionHasta >= hoy);
}

// ---------- Textos sueltos ----------

const TEXTOS = {
  pedirNombre:
    '¡Buenísimo! 🎓 Para asesorarte mejor necesito algunos datos.\n\n*1/3* — ¿Cuál es tu *nombre y apellido*?',
  pedirDniLead: (nombre) => `Gracias, ${nombre}. *2/3* — ¿Cuál es tu *DNI*? (solo números)`,
  pedirEmail: '*3/3* — Por último, ¿cuál es tu *correo electrónico*?',

  pedirDniEstudiante: '👩‍🎓 ¡Hola! Para ayudarte, ingresá tu *DNI* (solo números).',

  nombreInvalido: 'Por favor, escribí tu *nombre y apellido* (por ejemplo: _Juan Pérez_).',
  dniInvalido: 'Mmm, ese DNI no parece válido 🤔. Escribilo solo con números, sin puntos ni espacios (7 u 8 dígitos).',
  emailInvalido: 'Ese correo no parece válido 🤔. Revisalo y volvé a escribirlo (por ejemplo: _nombre@gmail.com_).',
  soloTexto: 'Por ahora solo puedo leer mensajes de texto ✍️. ¿Me lo escribís, por favor?',
  usaBotones: 'Elegí una de las opciones tocando un botón 👇',

  derivarAsesor: () =>
    '👩‍💼 ¡Perfecto! Te comunico con un asesor de nuestro equipo.\n\n' +
    'En breve una persona te va a responder por este mismo chat' +
    (process.env.HORARIO_ATENCION ? ` (horario de atención: ${process.env.HORARIO_ATENCION})` : '') +
    '.\n\nSi en algún momento querés volver al menú automático, escribí *menú*.',

  fechasCursado: () => {
    const hoy = hoyISO();
    const vigentes = periodosVigentes(hoy);
    let txt = `📅 *Calendario académico ${calendario.anioLectivo}*\n_${calendario.modalidad}_\n\n`;

    if (!vigentes.length) {
      return (
        txt +
        `Ya finalizaron los inicios de cursado de ${calendario.anioLectivo}. ` +
        `Muy pronto vamos a publicar el calendario ${calendario.anioLectivo + 1}. 🙌\n\n` +
        'Si necesitás una fecha puntual, podés consultarle a un asesor desde el menú.'
      );
    }

    const [actual, ...siguientes] = vigentes;
    if (actual.inicio > hoy) {
      txt +=
        `🔜 *Próximo inicio:* ${actual.nombre}\n` +
        `• Comienzo de clases: *${fechaLarga(actual.inicio)}*\n` +
        `• Inscripción a materias hasta: *${fechaLarga(actual.inscripcionHasta)}*`;
    } else {
      txt +=
        `🟢 *${actual.nombre}* (ya comenzó)\n` +
        `• Las clases iniciaron el ${fechaLarga(actual.inicio)}.\n` +
        `• ¡Todavía estás a tiempo! Podés inscribirte a materias hasta el *${fechaLarga(actual.inscripcionHasta)}*.`;
    }
    if (actual.nota) txt += `\n• ${actual.nota}`;

    if (siguientes.length) {
      txt +=
        '\n\n📋 *Próximos inicios:*\n' +
        siguientes
          .map((p) => `• ${p.nombre}: ${fechaCorta(p.inicio)} (inscripción hasta ${fechaCorta(p.inscripcionHasta)})`)
          .join('\n');
    }
    if (calendario.nota) txt += `\n\n${calendario.nota}`;
    return txt;
  },

  linkPagos:
    `¡Genial! 💳 Podés abonar tus aranceles ingresando al siguiente link:\n\n👉 ${LINKS.pagos}`,

  comoGenerarAranceles:
    'Para generarlos seguí estos pasos:\n\n' +
    `1️⃣ Ingresá al portal del estudiante: ${LINKS.portalEstudiantes}\n` +
    '2️⃣ Entrá en *Materias*.\n' +
    '3️⃣ Revisá qué materias tenés disponibles.\n' +
    '4️⃣ A la derecha, tocá *Generar aranceles*.\n\n' +
    `Una vez generados, podés pagarlos desde: ${LINKS.pagos}`,

  despedida: (nombre) =>
    `¡Gracias por comunicarte con nosotros${nombre ? `, ${nombre}` : ''}! 😊\n\n` +
    'Fue un gusto ayudarte. Si necesitás algo más, escribinos cuando quieras: estamos para acompañarte en tu camino. 🎓\n\n' +
    '¡Que tengas un excelente día! 👋',
};

module.exports = { ID, CARRERAS, MENUS, TEXTOS, infoCarrera, periodosVigentes };
