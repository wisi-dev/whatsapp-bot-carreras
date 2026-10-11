/**
 * ============================================================
 *  CALENDARIO ACADÉMICO  →  ACTUALIZAR CADA AÑO
 * ============================================================
 * Este es el ÚNICO archivo que hay que tocar cuando cambia el
 * calendario académico. Cargá los inicios del PDF oficial del año
 * y reiniciá el bot.
 *
 * Fechas en formato AAAA-MM-DD.
 *
 * El bot muestra solo lo que le sirve al estudiante HOY:
 *   - el período en curso si la inscripción sigue abierta, o el próximo inicio;
 *   - los inicios siguientes del año.
 * Los períodos que ya cerraron inscripción no se muestran.
 *
 * Fuente: Calendario Académico 2026 – Modalidad Distancia (ED+EDH).
 */
module.exports = {
  anioLectivo: 2026,
  modalidad: 'Modalidad Distancia (ED+EDH)',

  periodos: [
    {
      nombre: '1° semestre – Sub período 1A',
      inicio: '2026-03-16',
      inscripcionHasta: '2026-03-29',
      nota: 'Las Tutorías Cuatrimestrales del 1° semestre también comienzan con este sub período.',
    },
    {
      nombre: '1° semestre – Sub período 1B',
      inicio: '2026-05-18',
      inscripcionHasta: '2026-05-31',
    },
    {
      nombre: '2° semestre – Sub período 2A',
      inicio: '2026-08-03',
      inscripcionHasta: '2026-08-16',
      nota: 'Las Tutorías Cuatrimestrales del 2° semestre también comienzan con este sub período.',
    },
    {
      nombre: '2° semestre – Sub período 2B',
      inicio: '2026-10-05',
      inscripcionHasta: '2026-10-18',
    },
  ],

  // Texto opcional que se agrega al final (dejalo en '' si no lo necesitás).
  nota: 'Las fechas de trabajos prácticos y exámenes de cada materia las encontrás en el portal del estudiante.',
};
