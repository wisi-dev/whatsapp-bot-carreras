/**
 * Guarda los datos de los interesados en carreras en data/leads.jsonl
 * (un JSON por línea; se abre con cualquier editor o se importa a Excel).
 * Si más adelante usan un CRM, este es el lugar para integrarlo.
 */
const fs = require('fs/promises');
const path = require('path');

async function saveLead(lead) {
  const LEADS_FILE = path.join(__dirname, '..', 'data', process.env.LEADS_FILE || 'leads.jsonl');
  await fs.mkdir(path.dirname(LEADS_FILE), { recursive: true });
  await fs.appendFile(LEADS_FILE, JSON.stringify({ ...lead, fecha: new Date().toISOString() }) + '\n');
}

module.exports = { saveLead };
