/**
 * Ruta Puente — recibe las respuestas del formulario y las guarda en esta hoja.
 * Instalación: Extensiones > Apps Script > pegar este código > Implementar > Nueva implementación
 * Tipo: Aplicación web · Ejecutar como: Yo · Quién tiene acceso: Cualquier persona.
 */
const HOJA = 'Respuestas';
const AVISAR_POR_CORREO = true; // te llega un correo por cada respuesta nueva

const COLUMNAS = [
  'fecha', 'prioridad', 'nombre', 'whatsapp', 'ciudad', 'pais', 'fuente',
  'profesion', 'titulo', 'anios_exp', 'tiempo_eeuu', 'autorizado',
  'trabajo_actual', 'horas_trabajo', 'busco_12m', 'aplicaciones', 'respuestas',
  'barrera', 'horas_disponibles', 'horario', 'comentario', 'consentimiento', 'estado'
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};
    if (p.website) return salida({ ok: false }); // bots
    const hoja = obtenerHoja();
    const d = Object.assign({}, p);
    d.fecha = new Date();
    d.prioridad = calcularPrioridad(d); // se recalcula aquí, no se confía en el navegador
    d.estado = 'Nuevo';
    hoja.appendRow(COLUMNAS.map(c => limpiar(d[c])));
    if (AVISAR_POR_CORREO) {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(),
        'Ruta Puente: nueva respuesta (' + d.prioridad + ') — ' + limpiar(d.nombre),
        'Profesión: ' + limpiar(d.profesion) + '\nBuscó en 12 meses: ' + limpiar(d.busco_12m) +
        '\nBarrera: ' + limpiar(d.barrera) + '\nWhatsApp: ' + limpiar(d.whatsapp) +
        '\nHorario: ' + limpiar(d.horario) + '\n\nAbre la hoja para ver todo.');
    }
    return salida({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function calcularPrioridad(d) {
  if (d.autorizado === 'No') return 'Fuera de perfil';
  const pts = (d.titulo && d.titulo !== 'No' ? 1 : 0) + (d.busco_12m === 'Sí' ? 1 : 0) + (d.autorizado === 'Sí' ? 1 : 0);
  return pts === 3 ? 'Alta' : pts === 2 ? 'Media' : 'Baja';
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) hoja = libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#e1efe7');
  }
  return hoja;
}

// Evita que un texto empiece con = + - @ y se ejecute como fórmula
function limpiar(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v;
  const s = String(v).slice(0, 2000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Para probar desde el editor: Ejecutar > prueba
function prueba() {
  doPost({ parameter: { nombre: 'Prueba', whatsapp: '000', profesion: 'Contadora', titulo: 'Sí, universitario', autorizado: 'Sí', busco_12m: 'Sí', barrera: 'El inglés', horario: 'Tarde', consentimiento: 'Sí' } });
}
