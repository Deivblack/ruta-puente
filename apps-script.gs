// BITÁCORA: ejecuta esta función UNA vez (botón Ejecutar). Crea tu clave y la muestra en el registro de ejecución.
function crearClaveBitacora() {
  const props = PropertiesService.getScriptProperties();
  let clave = props.getProperty('BITACORA_CLAVE');
  if (!clave) {
    clave = 'rp' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
    props.setProperty('BITACORA_CLAVE', clave);
  }
  hojaEntrevistas();
  Logger.log('CLAVE BITACORA: ' + clave);
}

// Ejecuta esta función (botón Ejecutar) cuando quieras poner al día la hoja: códigos, enlaces y pestaña Enlaces
function actualizarHoja() {
  const hoja = obtenerHoja();
  const cab = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const cCod = cab.indexOf('codigo') + 1, cEnl = cab.indexOf('enlace') + 1, cNom = cab.indexOf('nombre') + 1;
  const n = hoja.getLastRow();
  for (let f = 2; f <= n; f++) {
    if (!hoja.getRange(f, cNom).getValue()) continue;
    if (!hoja.getRange(f, cCod).getValue()) {
      const c = nuevoCodigo();
      hoja.getRange(f, cCod).setValue(c);
      hoja.getRange(f, cEnl).setValue(APP_URL + '?c=' + c);
    }
  }
  crearPestanaEnlaces();
}

const APP_URL = 'https://deivblack.github.io/ruta-puente/app/';

function nuevoCodigo() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

// La app pide los datos de una persona con su código: solo lectura y solo los campos mínimos
function doGet(e) {
  const c = String((e && e.parameter && (e.parameter.codigo || e.parameter.c)) || '').trim();
  if (!/^[a-f0-9]{10}$/.test(c)) return salida({ ok: false });
  const datos = obtenerHoja().getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const r = datos.find(f => f[i('codigo')] === c);
  if (!r) return salida({ ok: false });
  return salida({ ok: true, persona: {
    nombre: String(r[i('nombre')]).split(' ')[0],
    pais: r[i('pais')], profesion: r[i('profesion')], anios_exp: r[i('anios_exp')],
    ciudad: r[i('ciudad')], barrera: r[i('barrera')]
  } });
}

function crearPestanaEnlaces() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName('Enlaces');
  if (!h) h = libro.insertSheet('Enlaces');
  h.clear();
  const filas = [
    ['Qué es', 'Enlace', 'Para qué'],
    ['Landing con formulario', 'https://deivblack.github.io/ruta-puente/', 'Compartir en redes y por WhatsApp'],
    ['Enlace personal de cada persona', 'Columna "enlace" en la pestaña Respuestas', 'Mandárselo por WhatsApp en la llamada'],
    ['App con datos de ejemplo', APP_URL, 'Ver la app tal como la ve alguien sin código'],
    ['Esta hoja', libro.getUrl(), 'Respuestas, estados y enlaces'],
    ['Script', 'https://script.google.com/home/projects/' + ScriptApp.getScriptId() + '/edit', 'Fichas, resumen semanal y reglas'],
    ['Arquitectura del proyecto', 'https://claude.ai/code/artifact/176f750f-aa08-446d-ae45-a6cd92b843e4', 'Mapa, flujo y decisiones'],
    ['Archivos en GitHub', 'https://github.com/Deivblack/ruta-puente', 'Código de la landing y la app']
  ];
  h.getRange(1, 1, filas.length, 3).setValues(filas);
  h.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#e1efe7');
  h.setColumnWidth(1, 230); h.setColumnWidth(2, 460); h.setColumnWidth(3, 300);
}

// Reenvía la ficha de una persona: cambia FILA por su número de fila en la hoja y pulsa Ejecutar
function reenviarFicha() {
  const FILA = 2;
  const hoja = obtenerHoja();
  const cab = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const val = hoja.getRange(FILA, 1, 1, cab.length).getValues()[0];
  const d = {};
  cab.forEach((c, i) => d[c] = val[i]);
  enviarFicha(d);
}

function configurarTodo() { activarResumenSemanal(); } // ejecutar una vez

/**
 * Ruta Puente — recibe las respuestas del formulario, las guarda en esta hoja
 * y te envía por correo una ficha de entrevista lista para usar.
 * Además, cada lunes te envía un resumen semanal (activar una vez con activarResumenSemanal).
 */
const HOJA = 'Respuestas';
const ESTADOS = ['Nuevo', 'Contactado', 'Agendado', 'Entrevistado', 'No responde', 'Descartado'];

const COLUMNAS = [
  'fecha', 'prioridad', 'nombre', 'whatsapp', 'ciudad', 'pais', 'fuente',
  'profesion', 'titulo', 'anios_exp', 'tiempo_eeuu', 'autorizado',
  'trabajo_actual', 'horas_trabajo', 'busco_12m', 'aplicaciones', 'respuestas',
  'barrera', 'horas_disponibles', 'horario', 'comentario', 'consentimiento', 'estado', 'codigo', 'enlace'
];

/* ---------- Recepción del formulario ---------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    // La Bitácora manda JSON como texto; el formulario de la landing manda campos normales
    if (e && e.postData && String(e.postData.type).indexOf('text/plain') === 0) return bitacora(e.postData.contents);
    const p = (e && e.parameter) || {};
    if (p.website || !p.nombre) return salida({ ok: false }); // bots o envíos vacíos
    const hoja = obtenerHoja();
    const d = Object.assign({}, p);
    d.fecha = new Date();
    d.prioridad = calcularPrioridad(d); // se recalcula aquí, no se confía en el navegador
    d.estado = 'Nuevo';
    d.codigo = nuevoCodigo();
    d.enlace = APP_URL + '?c=' + d.codigo;
    hoja.appendRow(COLUMNAS.map(c => limpiar(d[c])));
    try { enviarFicha(d); } catch (err) { console.error(err); }
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

/* ---------- Ficha de entrevista por correo ---------- */

const PREGUNTAS_BARRERA = {
  'El inglés': [
    '¿En qué momento concreto sientes que el inglés te frena: el CV, la entrevista o el trabajo en sí?',
    '¿Has tomado clases o practicado por tu cuenta? ¿Qué funcionó y qué no?'
  ],
  'Validar mis títulos': [
    '¿Averiguaste cómo evaluar tu título (por ejemplo WES o ECE)? ¿Qué te detuvo?',
    '¿Algún empleador te pidió la equivalencia de tu título?'
  ],
  'No tengo contactos': [
    '¿Conoces a alguien que trabaje en tu área aquí, aunque sea de lejos?',
    '¿Usas LinkedIn? ¿Le has escrito alguna vez a alguien de una empresa?'
  ],
  'No tengo tiempo': [
    '¿Cómo es tu semana típica? ¿En qué momento podrías dedicarle 15 minutos?',
    'Si tuvieras 1 hora libre a la semana para tu carrera, ¿en qué la usarías?'
  ],
  'No sé cómo funciona el sistema aquí': [
    '¿Qué parte te resulta más confusa: dónde buscar, cómo aplicar o qué poner en el CV?',
    '¿A quién le has preguntado cómo funciona? ¿Qué te dijeron?'
  ],
  'Otra': [
    'Cuéntame más sobre eso que te frena. ¿Desde cuándo lo sientes así?',
    '¿Qué tendría que cambiar para que dejara de ser un obstáculo?'
  ]
};

function alertas(d) {
  const a = [];
  const apps = parseInt(d.aplicaciones, 10) || 0;
  const resp = parseInt(d.respuestas, 10) || 0;
  if (d.autorizado === 'No') a.push('Fuera de perfil: no puede trabajar legalmente aún. No agendar; agradécele y guarda el contacto.');
  if (d.titulo === 'No') a.push('Sin título universitario: confirma si encaja en el perfil antes de dedicarle la llamada completa.');
  if (d.busco_12m === 'No') a.push('No buscó en los últimos 12 meses: usa la pregunta 1B ("¿qué pasó antes de que dejaras de buscar?").');
  if (d.busco_12m === 'Sí' && apps >= 20 && resp / apps < 0.05) a.push('Muchas aplicaciones y casi ninguna respuesta (' + tasa(apps, resp) + '): pregunta qué vacantes eligió y si aplicó en frío.');
  if (d.busco_12m === 'Sí' && apps > 0 && resp === 0) a.push('Cero respuestas: revisa con ella/él cómo es su CV y dónde aplica.');
  if (d.busco_12m === 'Sí' && apps > 0 && apps < 5) a.push('Buscó pero aplicó muy poco: pregunta qué lo detuvo.');
  if (d.horas_disponibles === 'Menos de 2') a.push('Tiene menos de 2 horas a la semana: la app tendría que funcionar con 15 minutos.');
  if (d.horas_trabajo === 'Más de 40') a.push('Trabaja más de 40 horas: ofrécele una llamada corta y flexible.');
  if (d.tiempo_eeuu === 'Menos de 1 año') a.push('Recién llegado (menos de 1 año): su necesidad puede ser más de orientación general.');
  return a;
}

function tasa(apps, resp) {
  return apps > 0 ? Math.round(resp / apps * 1000) / 10 + '%' : '—';
}

function linkWhatsApp(num) {
  let n = String(num || '').replace(/\D/g, '');
  if (n.length === 10) n = '1' + n;
  return n.length >= 10 ? 'https://wa.me/' + n : '';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function enviarFicha(d) {
  const nombre = esc(d.nombre), prof = esc(d.profesion || 'su profesión'), trabajo = esc(d.trabajo_actual || 'otra cosa');
  const pais = esc(d.pais || 'su país'), barrera = esc(d.barrera || '—');
  const apps = parseInt(d.aplicaciones, 10) || 0, resp = parseInt(d.respuestas, 10) || 0;
  const wa = linkWhatsApp(d.whatsapp);
  const colores = { 'Alta': '#2E7D5B', 'Media': '#C98A1B', 'Baja': '#7A8580', 'Fuera de perfil': '#B4462F' };
  const color = colores[d.prioridad] || '#7A8580';

  const resumen = [
    prof + ' de ' + pais + ' · ' + esc(d.anios_exp || '?') + ' años de experiencia · ' + esc(d.titulo || '') + '.',
    'Hoy trabaja en ' + trabajo + ' (' + esc(d.horas_trabajo || '?') + ' h/sem) · ' + esc(d.tiempo_eeuu || '?') + ' en EE.UU.',
    d.busco_12m === 'Sí'
      ? 'Buscó en su profesión: aplicó a ' + apps + ', le respondieron ' + resp + ' (' + tasa(apps, resp) + '). Barrera: ' + barrera + '.'
      : 'No buscó en su profesión en los últimos 12 meses. Barrera: ' + barrera + '.'
  ];

  const p1 = d.busco_12m === 'Sí'
    ? '1. "Me contaste que aplicaste a ' + apps + ' trabajos. Cuéntame la última vez, paso a paso: ¿dónde buscaste, qué enviaste, qué pasó?"'
    : '1B. "¿Qué pasó justo antes de que dejaras de buscar trabajo de ' + prof + '?"';
  const guion = [
    '<b>Apertura:</b> "Gracias por llenar el formulario. Leí que en ' + pais + ' eras ' + prof + ' y que hoy trabajas en ' + trabajo + '. No te voy a vender nada; quiero entender tu experiencia. ¿Te molesta si tomo notas?"',
    p1,
    '2. "De todo ese proceso, ¿qué fue lo que más te desanimó?"',
    '3. "Marcaste <i>' + barrera + '</i> como lo que más te frena. Dame un ejemplo de cuándo te pasó."',
    '4. "¿Qué has intentado para resolverlo? ¿Gastaste dinero o tiempo en algo?"',
    '5. "Si alguien pudiera resolverte una sola cosa de todo esto, ¿cuál sería?"',
    '6. "¿Cómo sabrías que vas avanzando, aunque todavía no tengas el trabajo?"',
    '<i>Mándale su enlace por WhatsApp. Que abra la app, revise sus 6 pasos y te diga en voz alta qué piensa.</i>',
    '7. "¿Qué parte te sirve más y cuál te sobra?"',
    '8. "¿Qué le falta para que la usaras la próxima semana?"',
    '9. "¿La usarías esta semana? En 7 días te escribo para saber cómo te fue."',
    '10. "¿Conoces a 1 o 2 personas que estén viviendo esto?"',
    '<b>Cierre:</b> "Gracias. Envíame tu CV o tu LinkedIn y te lo reviso esta semana."'
  ];
  const extra = PREGUNTAS_BARRERA[d.barrera] || PREGUNTAS_BARRERA['Otra'];
  const al = alertas(d);

  const li = arr => arr.map(x => '<li style="margin:0 0 6px">' + x + '</li>').join('');
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:620px;color:#1d2b26;line-height:1.5">' +
    '<div style="border-left:6px solid ' + color + ';padding:6px 14px;margin-bottom:14px">' +
    '<div style="font-size:12px;color:#5d6c66;text-transform:uppercase;letter-spacing:.06em">Ficha de entrevista · Ruta Puente</div>' +
    '<div style="font-size:22px;font-weight:bold">' + nombre + '</div>' +
    '<div><span style="background:' + color + ';color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;font-weight:bold">Prioridad ' + esc(d.prioridad) + '</span>' +
    ' &nbsp;Prefiere llamada: <b>' + esc(d.horario || '—') + '</b></div>' +
    (wa ? '<div style="margin-top:8px"><a href="' + wa + '" style="background:#2E7D5B;color:#fff;padding:8px 14px;border-radius:16px;text-decoration:none;font-weight:bold">Escribir por WhatsApp</a> &nbsp;' + esc(d.whatsapp) + '</div>' : '<div>WhatsApp: ' + esc(d.whatsapp) + '</div>') +
    '</div>' +
    (d.enlace ? '<div style="background:#e1efe7;border-radius:10px;padding:10px 14px;margin:0 0 6px"><b>Su app personal:</b> <a href="' + d.enlace + '">' + d.enlace + '</a><br><span style="font-size:13px;color:#5d6c66">Mándaselo por WhatsApp durante la llamada.</span></div>' : '') +
    '<h3 style="margin:16px 0 6px">Resumen</h3><ul style="padding-left:18px;margin:0">' + li(resumen) + '</ul>' +
    (al.length ? '<h3 style="margin:16px 0 6px">Alertas</h3><ul style="padding-left:18px;margin:0;background:#fbf0d9;padding:10px 10px 4px 28px;border-radius:8px">' + li(al.map(esc)) + '</ul>' : '') +
    (d.comentario ? '<h3 style="margin:16px 0 6px">Lo que te escribió</h3><p style="margin:0;font-style:italic">"' + esc(d.comentario) + '"</p>' : '') +
    '<h3 style="margin:16px 0 6px">Guion (15 min)</h3><ol style="list-style:none;padding-left:0;margin:0">' + li(guion) + '</ol>' +
    '<h3 style="margin:16px 0 6px">2 preguntas extra por su barrera (' + barrera + ')</h3><ul style="padding-left:18px;margin:0">' + li(extra.map(esc)) + '</ul>' +
    '<p style="margin-top:18px;font-size:13px;color:#5d6c66">Después de la llamada, cambia su estado en la hoja a "Entrevistado" y anota la frase clave.<br>' +
    '<a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja de respuestas</a></p></div>';

  const texto = 'Ficha de entrevista: ' + d.nombre + ' (' + d.prioridad + ')\n\n' + resumen.join('\n').replace(/<[^>]+>/g, '') +
    '\n\nAlertas:\n' + (al.join('\n') || '—') + '\n\nWhatsApp: ' + d.whatsapp;

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · ' + d.prioridad + ' · ' + d.nombre + ' (' + (d.profesion || '') + ')',
    body: texto,
    htmlBody: html,
    name: 'Ruta Puente'
  });
}

/* ---------- Resumen semanal (lunes) ---------- */

function resumenSemanal() {
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues();
  const cab = datos.shift();
  const idx = n => cab.indexOf(n);
  const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const filas = datos.filter(r => r[idx('nombre')]);
  const nuevas = filas.filter(r => r[idx('fecha')] instanceof Date && r[idx('fecha')] >= hace7);
  const contar = (arr, p) => arr.filter(r => r[idx('prioridad')] === p).length;
  const orden = { 'Alta': 0, 'Media': 1, 'Baja': 2, 'Fuera de perfil': 3 };
  const pendientes = filas
    .filter(r => ['Nuevo', 'Contactado', 'Agendado'].indexOf(r[idx('estado')]) >= 0 && r[idx('prioridad')] !== 'Fuera de perfil')
    .sort((a, b) => (orden[a[idx('prioridad')]] - orden[b[idx('prioridad')]]));
  const entrevistados = filas.filter(r => r[idx('estado')] === 'Entrevistado').length;

  const filasHtml = pendientes.map(r => {
    const wa = linkWhatsApp(r[idx('whatsapp')]);
    return '<tr><td style="padding:6px;border-bottom:1px solid #d7e0db"><b>' + esc(r[idx('nombre')]) + '</b></td>' +
      '<td style="padding:6px;border-bottom:1px solid #d7e0db">' + esc(r[idx('prioridad')]) + '</td>' +
      '<td style="padding:6px;border-bottom:1px solid #d7e0db">' + esc(r[idx('profesion')]) + '</td>' +
      '<td style="padding:6px;border-bottom:1px solid #d7e0db">' + esc(r[idx('estado')]) + '</td>' +
      '<td style="padding:6px;border-bottom:1px solid #d7e0db">' + (wa ? '<a href="' + wa + '">WhatsApp</a>' : esc(r[idx('whatsapp')])) + '</td></tr>';
  }).join('');

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:620px;color:#1d2b26;line-height:1.5">' +
    '<div style="font-size:22px;font-weight:bold">Ruta Puente · Resumen semanal</div>' +
    '<p><b>' + nuevas.length + '</b> respuestas nuevas esta semana: ' + contar(nuevas, 'Alta') + ' Alta, ' + contar(nuevas, 'Media') + ' Media, ' +
    contar(nuevas, 'Baja') + ' Baja, ' + contar(nuevas, 'Fuera de perfil') + ' fuera de perfil.<br>' +
    'Total: <b>' + filas.length + '</b> respuestas · <b>' + entrevistados + '</b> entrevistadas · meta Sprint 0: 5.</p>' +
    (pendientes.length
      ? '<h3>Te falta contactar o entrevistar (' + pendientes.length + ')</h3><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#e1efe7"><th align="left" style="padding:6px">Nombre</th><th align="left" style="padding:6px">Prioridad</th><th align="left" style="padding:6px">Profesión</th><th align="left" style="padding:6px">Estado</th><th align="left" style="padding:6px">Contacto</th></tr>' + filasHtml + '</table>'
      : '<p>No tienes personas pendientes. Buen momento para publicar otra vez.</p>') +
    '<p style="font-size:13px;color:#5d6c66"><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja de respuestas</a></p></div>';

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · Resumen semanal: ' + nuevas.length + ' nuevas, ' + pendientes.length + ' pendientes',
    body: nuevas.length + ' respuestas nuevas esta semana. ' + pendientes.length + ' pendientes.',
    htmlBody: html,
    name: 'Ruta Puente'
  });
}

// Ejecutar UNA vez desde el editor: crea el envío de cada lunes a las 8 a. m. y la lista de estados
function activarResumenSemanal() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'resumenSemanal')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('resumenSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(8).create();
  const hoja = obtenerHoja();
  const col = COLUMNAS.indexOf('estado') + 1;
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
  hoja.getRange(2, col, 1000, 1).setDataValidation(regla);
  resumenSemanal(); // envía uno ahora para que veas cómo llega
}

/* ---------- Bitácora de entrevistas (página privada /bitacora/) ---------- */

const HOJA_ENT = 'Entrevistas';
const COL_ENT = [
  'actualizado', 'codigo', 'nombre', 'dentro_perfil',
  'p1_ultima_busqueda', 'p2_desanimo', 'lo_intento',
  'p3_ejemplo_barrera', 'p4_que_intento', 'gasto', 'monto_usd', 'barrera_clara',
  'p5_una_cosa', 'p6_avance', 'p7_sirve_sobra', 'p8_falta',
  'p9_usara', 'p10_referidos', 'compromiso',
  'frase_clave', 'sorpresa', 'confirma'
];
const TEXTOS_ENT = ['p1_ultima_busqueda', 'p2_desanimo', 'p3_ejemplo_barrera', 'p4_que_intento',
  'p5_una_cosa', 'p6_avance', 'p7_sirve_sobra', 'p8_falta', 'frase_clave', 'sorpresa'];

function bitacora(txt) {
  let b;
  try { b = JSON.parse(txt); } catch (err) { return salida({ ok: false, error: 'formato' }); }
  const clave = PropertiesService.getScriptProperties().getProperty('BITACORA_CLAVE');
  if (!clave || !b || b.clave !== clave) { Utilities.sleep(800); return salida({ ok: false, error: 'clave' }); }
  if (b.accion === 'listar') return salida(listarBitacora());
  if (b.accion === 'guardar') return salida(guardarEntrevista(b.datos || {}));
  return salida({ ok: false, error: 'accion' });
}

function hojaEntrevistas() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA_ENT);
  if (!h) h = libro.insertSheet(HOJA_ENT);
  if (h.getLastRow() === 0) {
    h.appendRow(COL_ENT);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, COL_ENT.length).setFontWeight('bold').setBackground('#e1efe7');
  }
  return h;
}

function leerEntrevistas() {
  const datos = hojaEntrevistas().getDataRange().getValues();
  const cab = datos.shift();
  const mapa = {};
  datos.forEach((r, k) => {
    const o = { _fila: k + 2 };
    cab.forEach((c, j) => o[c] = r[j] instanceof Date ? r[j].toISOString() : r[j]);
    if (o.codigo) mapa[String(o.codigo)] = o;
  });
  return mapa;
}

function contarGate(mapa) {
  const v = Object.keys(mapa).map(k => mapa[k]).filter(o => o.dentro_perfil === 'Sí');
  return { dentro: v.length, confirman: v.filter(o => o.confirma === 'Sí').length };
}

function listarBitacora() {
  const datos = obtenerHoja().getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const mapa = leerEntrevistas();
  const campos = ['nombre', 'pais', 'profesion', 'anios_exp', 'trabajo_actual', 'horas_trabajo', 'busco_12m',
    'aplicaciones', 'respuestas', 'barrera', 'comentario', 'prioridad', 'estado'];
  const personas = datos.filter(r => r[i('nombre')] && r[i('codigo')]).map(r => {
    const p = { codigo: String(r[i('codigo')]) };
    campos.forEach(c => p[c] = r[i(c)] instanceof Date ? r[i(c)].toISOString() : r[i(c)]);
    const ent = mapa[p.codigo];
    if (ent) { delete ent._fila; p.entrevista = ent; }
    return p;
  });
  return { ok: true, personas: personas, gate: contarGate(mapa) };
}

function guardarEntrevista(d) {
  const codigo = String(d.codigo || '');
  if (!/^[a-f0-9]{10}$/.test(codigo)) return { ok: false, error: 'codigo' };
  const resp = obtenerHoja();
  const datos = resp.getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const k = datos.findIndex(r => String(r[i('codigo')]) === codigo);
  if (k < 0) return { ok: false, error: 'persona' };

  const si = v => v === 'Sí' ? 'Sí' : 'No';
  const o = {};
  TEXTOS_ENT.forEach(c => o[c] = limpiar(d[c]));
  o.actualizado = new Date();
  o.codigo = codigo;
  o.nombre = limpiar(datos[k][i('nombre')]);
  o.dentro_perfil = si(d.dentro_perfil);
  o.lo_intento = si(d.lo_intento);
  o.barrera_clara = si(d.barrera_clara);
  o.gasto = ['Sí', 'No'].indexOf(d.gasto) >= 0 ? d.gasto : '';
  o.monto_usd = Math.max(0, parseInt(d.monto_usd, 10) || 0);
  o.p9_usara = ['Sí', 'No', 'Tal vez'].indexOf(d.p9_usara) >= 0 ? d.p9_usara : '';
  o.p10_referidos = Math.max(0, parseInt(d.p10_referidos, 10) || 0);
  o.compromiso = (o.p9_usara === 'Sí' || o.p10_referidos > 0) ? 'Sí' : 'No';
  o.confirma = (o.lo_intento === 'Sí' && o.barrera_clara === 'Sí' && o.compromiso === 'Sí') ? 'Sí' : 'No';

  const h = hojaEntrevistas();
  const fila = COL_ENT.map(c => o[c]);
  const previa = leerEntrevistas()[codigo];
  if (previa) h.getRange(previa._fila, 1, 1, COL_ENT.length).setValues([fila]);
  else h.appendRow(fila);

  const est = datos[k][i('estado')];
  if (['Nuevo', 'Contactado', 'Agendado', 'No responde', ''].indexOf(est) >= 0) {
    resp.getRange(k + 2, i('estado') + 1).setValue('Entrevistado');
  }
  return { ok: true, confirma: o.confirma, compromiso: o.compromiso, gate: contarGate(leerEntrevistas()) };
}

/* ---------- Utilidades ---------- */

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) hoja = libro.insertSheet(HOJA);
  if (hoja.getLastRow() === 0) {
    hoja.appendRow(COLUMNAS);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#e1efe7');
  }
  if (hoja.getLastColumn() < COLUMNAS.length) {
    hoja.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS]).setFontWeight('bold').setBackground('#e1efe7');
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

// Para probar la ficha desde el editor sin guardar nada en la hoja: Ejecutar > pruebaFicha
function pruebaFicha() {
  const d = { nombre: 'María Prueba', whatsapp: '8320000000', ciudad: 'Houston, 77095', pais: 'Colombia', profesion: 'Contadora',
    titulo: 'Sí, universitario', anios_exp: '6 a 10', tiempo_eeuu: '1 a 3 años', autorizado: 'Sí', trabajo_actual: 'Almacén',
    horas_trabajo: '20 a 40', busco_12m: 'Sí', aplicaciones: '40', respuestas: '1', barrera: 'No tengo contactos',
    horas_disponibles: '2 a 5', horario: 'Tarde', comentario: 'Mi título no lo entienden aquí.' };
  d.prioridad = calcularPrioridad(d);
  enviarFicha(d);
}
