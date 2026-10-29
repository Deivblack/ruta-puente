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

// Ejecuta esta función (botón Ejecutar) cuando quieras poner al día la hoja: códigos, enlaces, columnas nuevas y pestaña Enlaces
function actualizarHoja() {
  const hoja = asegurarColumnas();
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

function configurarTodo() {
  activarResumenSemanal();
  activarSeguimientoEmpleo();
  activarCorreoDiario();
  activarOnEditEstado();
} // ejecutar una vez (pide autorización de triggers)

/**
 * Ruta Puente — recibe las respuestas del formulario, las guarda en esta hoja
 * y te envía por correo una ficha de entrevista lista para usar.
 * Además, cada lunes te envía un resumen semanal (activar una vez con activarResumenSemanal)
 * y cada día te avisa del seguimiento 7/30/60/90 (activarSeguimientoEmpleo).
 */
const HOJA = 'Respuestas';
const ESTADOS = [
  'Nuevo', 'Contactado', 'Agendado', 'Entrevistado',
  'CV recibido', 'CV revisado', 'Plan enviado', 'Aplicando',
  'Entrevista laboral', 'Empleado',
  'No responde', 'Descartado', 'Pausa'
];
const HITOS_EMPLEO = [7, 30, 60, 90];

// Texto corto de próximo paso y días a sumar (null = no auto-fecha; Agendado usa fecha_entrevista)
const PROXIMO_POR_ESTADO = {
  'Nuevo': { paso: 'Contactar por WhatsApp', dias: 0 },
  'Contactado': { paso: 'Enviar enlace personal + pedir CV', dias: 3 },
  'Agendado': { paso: 'Hacer la entrevista de diagnóstico', dias: null },
  'Entrevistado': { paso: 'Pedir CV y revisar en 48 h', dias: 1 },
  'CV recibido': { paso: 'Revisar CV y anotar puntaje', dias: 1 },
  'CV revisado': { paso: 'Enviar plan por WhatsApp', dias: 1 },
  'Plan enviado': { paso: 'Revisar si ya empezó a aplicar', dias: 7 },
  'Aplicando': { paso: 'Revisar avance de aplicaciones', dias: 7 },
  'Entrevista laboral': { paso: 'Preparar / debrief de entrevista laboral', dias: 2 },
  'Empleado': { paso: 'Seguimiento post-empleo', dias: null },
  'No responde': { paso: 'Reintentar contacto o descartar', dias: 7 },
  'Descartado': { paso: '—', dias: null },
  'Pausa': { paso: 'Retomar cuando la persona avise', dias: 14 }
};

const COLUMNAS = [
  'fecha', 'prioridad', 'nombre', 'whatsapp', 'ciudad', 'pais', 'fuente',
  'profesion', 'titulo', 'anios_exp', 'tiempo_eeuu', 'autorizado',
  'trabajo_actual', 'horas_trabajo', 'busco_12m', 'aplicaciones', 'respuestas',
  'barrera', 'horas_disponibles', 'horario', 'comentario', 'consentimiento', 'estado', 'codigo', 'enlace',
  'fecha_empleo', 'seguimiento_7', 'seguimiento_30', 'seguimiento_60', 'seguimiento_90',
  'fecha_contacto', 'fecha_entrevista', 'cv_puntaje_antes', 'cv_puntaje_despues',
  'plan_enviado', 'proximo_paso', 'proximo_fecha', 'notas_david'
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
  asegurarColumnas();
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
  const hoy = hoySinHora();
  const porEstado = {};
  ESTADOS.forEach(e => { porEstado[e] = 0; });
  let atrasados = 0;
  filas.forEach(r => {
    const est = String(r[idx('estado')] || 'Nuevo');
    if (porEstado[est] === undefined) porEstado[est] = 0;
    porEstado[est]++;
    const pf = r[idx('proximo_fecha')];
    if (pf instanceof Date && !isNaN(pf.getTime()) && pf <= hoy &&
        ['Descartado', 'Empleado', ''].indexOf(est) < 0) atrasados++;
  });
  const conteoEstados = ESTADOS.filter(e => porEstado[e] > 0)
    .map(e => e + ': <b>' + porEstado[e] + '</b>').join(' · ');

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
    '<p><b>Por estado:</b> ' + (conteoEstados || '—') + '<br>' +
    '<b>Atrasados</b> (próxima fecha ≤ hoy): <b>' + atrasados + '</b>.</p>' +
    (pendientes.length
      ? '<h3>Te falta contactar o entrevistar (' + pendientes.length + ')</h3><table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#e1efe7"><th align="left" style="padding:6px">Nombre</th><th align="left" style="padding:6px">Prioridad</th><th align="left" style="padding:6px">Profesión</th><th align="left" style="padding:6px">Estado</th><th align="left" style="padding:6px">Contacto</th></tr>' + filasHtml + '</table>'
      : '<p>No tienes personas pendientes. Buen momento para publicar otra vez.</p>') +
    '<p style="font-size:13px;color:#5d6c66"><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja de respuestas</a></p></div>';

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · Resumen semanal: ' + nuevas.length + ' nuevas, ' + atrasados + ' atrasados',
    body: nuevas.length + ' respuestas nuevas esta semana. ' + atrasados + ' atrasados.',
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
  const hoja = asegurarColumnas();
  const cab = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String);
  const col = cab.indexOf('estado') + 1;
  if (col > 0) {
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
    hoja.getRange(2, col, Math.max(hoja.getMaxRows() - 1, 1), 1).setDataValidation(regla);
  }
  resumenSemanal(); // envía uno ahora para que veas cómo llega
}

/* ---------- Seguimiento 7/30/60/90 días (fase 7) ---------- */
// Tú llenas fecha_empleo cuando la persona arranca. El correo diario te avisa
// si ya pasó el hito y aún no marcaste Sí en seguimiento_7 / _30 / _60 / _90.
// No se envía nada automático a las personas.

const MSG_SEGUIMIENTO = {
  7: 'Hola {nombre}, ¿cómo van tus primeros días en el nuevo trabajo? Si algo se traba (herramientas, inglés o el equipo), cuéntame y vemos cómo apoyarte.',
  30: 'Hola {nombre}, ya va un mes en el rol. ¿Qué te está saliendo bien y qué te está costando? Si quieres, en 10 minutos vemos un plan simple para el próximo mes.',
  60: 'Hola {nombre}, ¿cómo te sientes a los dos meses? ¿Tu jefe ya te dio feedback? Si te sirve, te ayudo a preparar esa conversación.',
  90: 'Hola {nombre}, felicidades por llegar a los 90 días. ¿Quieres quedarte en este camino o estás pensando el siguiente paso? Aquí estoy para apoyarte.'
};

function diasDesde(fecha) {
  if (!(fecha instanceof Date) || isNaN(fecha.getTime())) return null;
  const a = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  return Math.floor((b - a) / (24 * 3600 * 1000));
}

function mensajeSeguimiento(nombre, hito) {
  const n = String(nombre || '').split(' ')[0] || 'hola';
  return (MSG_SEGUIMIENTO[hito] || '').replace('{nombre}', n);
}

function pendientesSeguimiento(filas, cab) {
  const idx = n => cab.indexOf(n);
  const out = [];
  filas.forEach((r, i) => {
    const dias = diasDesde(r[idx('fecha_empleo')]);
    if (dias === null || !r[idx('nombre')]) return;
    HITOS_EMPLEO.forEach(h => {
      const col = 'seguimiento_' + h;
      const hecho = String(r[idx(col)] || '').trim();
      if (dias >= h && !hecho) {
        out.push({
          fila: i + 2,
          nombre: r[idx('nombre')],
          whatsapp: r[idx('whatsapp')],
          profesion: r[idx('profesion')],
          hito: h,
          dias: dias,
          mensaje: mensajeSeguimiento(r[idx('nombre')], h)
        });
      }
    });
  });
  return out.sort((a, b) => a.hito - b.hito || String(a.nombre).localeCompare(String(b.nombre)));
}

function seguimientoEmpleo() {
  asegurarColumnas();
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues();
  const cab = datos.shift();
  if (cab.indexOf('fecha_empleo') < 0) {
    Logger.log('Falta la columna fecha_empleo. Ejecuta actualizarHoja() primero.');
    return;
  }
  const pendientes = pendientesSeguimiento(datos, cab);
  if (!pendientes.length) {
    Logger.log('Sin seguimientos pendientes hoy.');
    return;
  }

  const filasHtml = pendientes.map(p => {
    const wa = linkWhatsApp(p.whatsapp);
    return '<tr>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db;vertical-align:top"><b>' + esc(p.nombre) + '</b><br><span style="color:#5d6c66;font-size:12px">' + esc(p.profesion) + '</span></td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db;vertical-align:top">Día <b>' + p.hito + '</b><br><span style="color:#5d6c66;font-size:12px">' + p.dias + ' días desde el empleo</span></td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db;vertical-align:top">' + (wa ? '<a href="' + wa + '">Abrir WhatsApp</a>' : esc(p.whatsapp)) + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db;vertical-align:top;font-size:13px">' + esc(p.mensaje) + '</td>' +
      '</tr>';
  }).join('');

  const html =
    '<div style="font-family:Arial,sans-serif;max-width:720px;color:#1d2b26;line-height:1.5">' +
    '<div style="font-size:22px;font-weight:bold">Ruta Puente · Seguimiento 7/30/60/90</div>' +
    '<p>Hoy tienes <b>' + pendientes.length + '</b> contacto' + (pendientes.length === 1 ? '' : 's') +
    ' pendiente' + (pendientes.length === 1 ? '' : 's') +
    '. Copia el mensaje, mándalo por WhatsApp y marca <b>Sí</b> en la columna <code>seguimiento_7</code> / <code>_30</code> / <code>_60</code> / <code>_90</code> de esa persona.</p>' +
    '<table style="border-collapse:collapse;width:100%;font-size:14px">' +
    '<tr style="background:#e1efe7">' +
    '<th align="left" style="padding:8px">Persona</th>' +
    '<th align="left" style="padding:8px">Hito</th>' +
    '<th align="left" style="padding:8px">Contacto</th>' +
    '<th align="left" style="padding:8px">Mensaje sugerido</th></tr>' +
    filasHtml + '</table>' +
    '<p style="font-size:13px;color:#5d6c66;margin-top:16px"><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja de respuestas</a></p></div>';

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · ' + pendientes.length + ' seguimiento' + (pendientes.length === 1 ? '' : 's') + ' pendiente' + (pendientes.length === 1 ? '' : 's'),
    body: pendientes.map(p => p.nombre + ' · día ' + p.hito + '\n' + p.mensaje).join('\n\n'),
    htmlBody: html,
    name: 'Ruta Puente'
  });
}

// Ejecutar UNA vez: crea el correo diario a las 8 a. m. y asegura las columnas nuevas
function activarSeguimientoEmpleo() {
  asegurarColumnas();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'seguimientoEmpleo')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('seguimientoEmpleo').timeBased().everyDays(1).atHour(8).create();
  Logger.log('Trigger diario de seguimientoEmpleo creado (8 a. m.).');
}

// Prueba: manda un correo de ejemplo sin leer fechas reales de la hoja
function pruebaSeguimientoEmpleo() {
  const ejemplos = [
    { nombre: 'María Prueba', whatsapp: '8320000000', profesion: 'Contadora', hito: 7, dias: 9, mensaje: mensajeSeguimiento('María Prueba', 7) },
    { nombre: 'Carlos Ejemplo', whatsapp: '8320000001', profesion: 'Ingeniero', hito: 30, dias: 35, mensaje: mensajeSeguimiento('Carlos Ejemplo', 30) }
  ];
  const filasHtml = ejemplos.map(p => {
    const wa = linkWhatsApp(p.whatsapp);
    return '<tr><td style="padding:8px;border-bottom:1px solid #d7e0db"><b>' + esc(p.nombre) + '</b></td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db">Día ' + p.hito + ' (' + p.dias + ' días)</td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db">' + (wa ? '<a href="' + wa + '">WhatsApp</a>' : '') + '</td>' +
      '<td style="padding:8px;border-bottom:1px solid #d7e0db;font-size:13px">' + esc(p.mensaje) + '</td></tr>';
  }).join('');
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · Prueba seguimiento 7/30/60/90',
    body: 'Correo de prueba del seguimiento. No usa datos reales de la hoja.',
    htmlBody: '<div style="font-family:Arial,sans-serif;max-width:720px;color:#1d2b26">' +
      '<div style="font-size:22px;font-weight:bold">Prueba · Seguimiento 7/30/60/90</div>' +
      '<p>Esto es un ejemplo. Cuando actives el trigger real, solo verás personas con <code>fecha_empleo</code> y sin marcar el hito.</p>' +
      '<table style="border-collapse:collapse;width:100%;font-size:14px"><tr style="background:#fbf0d9">' +
      '<th align="left" style="padding:8px">Persona</th><th align="left" style="padding:8px">Hito</th>' +
      '<th align="left" style="padding:8px">Contacto</th><th align="left" style="padding:8px">Mensaje</th></tr>' +
      filasHtml + '</table></div>',
    name: 'Ruta Puente'
  });
}

/* ---------- Correo diario: a quién escribir hoy ---------- */
// Solo te sugiere mensajes. Nunca envía WhatsApp automático a las personas.

const PLANTILLAS = {
  'Nuevo': 'Hola {nombre}, soy David de Ruta Puente. Vi tu formulario y me gustaría conocerte 15 minutos para entender tu camino y ver cómo ayudarte a volver a tu profesión. ¿Te viene bien esta semana?',
  'Contactado': 'Hola {nombre}, te dejo tu enlace personal de Ruta Puente: {enlace}. Ábrelo en el celular y, cuando puedas, mándame tu CV (PDF) por aquí para revisarlo juntos.',
  'Agendado': 'Hola {nombre}, te confirmo nuestra llamada. Si algo se complica, avísame y la movemos. Nos vemos pronto.',
  'Entrevistado': 'Hola {nombre}, gracias por la conversación. Cuando tengas listo tu CV en PDF, mándamelo por WhatsApp y en máximo 48 horas te digo qué ajustar.',
  'CV recibido': 'Hola {nombre}, ya tengo tu CV. Lo estoy revisando y te escribo con comentarios concretos en las próximas 48 horas.',
  'CV revisado': 'Hola {nombre}, ya revisé tu CV. Te comparto los cambios prioritarios y el plan de esta semana para aplicar con más claridad.',
  'Plan enviado': 'Hola {nombre}, ¿pudiste avanzar con el plan? Si te trabaste en algún paso (Indeed, LinkedIn o el mensaje), dime y lo vemos en 10 minutos.',
  'Aplicando': 'Hola {nombre}, ¿cómo van las aplicaciones esta semana? Cuéntame a cuántas aplicaste y si alguien te respondió; ajustamos la estrategia si hace falta.',
  'Entrevista laboral': 'Hola {nombre}, ¡felicitaciones por la entrevista! Si quieres, te ayudo a preparar las preguntas difíciles o a repasar lo que vas a decir de tu experiencia.',
  'Empleado': 'Hola {nombre}, ¿cómo vas en el nuevo trabajo? Si algo se traba (herramientas, equipo o comunicación), aquí estoy para apoyarte.',
  'No responde': 'Hola {nombre}, te escribo de nuevo por si se te pasó mi mensaje. Si ahora no es buen momento, dime y retomamos cuando te sirva.',
  'Pausa': 'Hola {nombre}, solo paso a saludar. Cuando quieras retomar la búsqueda, avísame y retomamos desde donde quedamos.',
  'Descartado': ''
};

function mensajePlantilla(estado, nombre, enlace) {
  const n = String(nombre || '').split(' ')[0] || 'hola';
  const t = PLANTILLAS[estado] || PLANTILLAS['Nuevo'];
  return String(t || '').replace(/\{nombre\}/g, n).replace(/\{enlace\}/g, enlace || APP_URL);
}

function pendientesHoy() {
  asegurarColumnas();
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues();
  const cab = datos.shift();
  const idx = n => cab.indexOf(n);
  const hoy = hoySinHora();
  const out = [];
  datos.forEach(r => {
    if (!r[idx('nombre')]) return;
    const est = String(r[idx('estado')] || 'Nuevo');
    if (est === 'Descartado') return;
    const pf = r[idx('proximo_fecha')];
    // Sin fecha: solo "Nuevo" cuenta como pendiente de hoy
    const toca = (pf instanceof Date && !isNaN(pf.getTime()) && pf <= hoy) ||
      (!(pf instanceof Date) && est === 'Nuevo');
    if (!toca) return;
    const enlace = String(r[idx('enlace')] || (APP_URL + '?c=' + r[idx('codigo')]));
    out.push({
      nombre: r[idx('nombre')],
      whatsapp: r[idx('whatsapp')],
      profesion: r[idx('profesion')],
      estado: est,
      proximo_paso: r[idx('proximo_paso')] || '',
      proximo_fecha: pf instanceof Date ? pf : null,
      enlace: enlace,
      mensaje: mensajePlantilla(est, r[idx('nombre')], enlace)
    });
  });
  return out.sort((a, b) => {
    const ia = ESTADOS.indexOf(a.estado); const ib = ESTADOS.indexOf(b.estado);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || String(a.nombre).localeCompare(String(b.nombre));
  });
}

function correoDiario() {
  const lista = pendientesHoy();
  if (!lista.length) {
    Logger.log('Correo diario: nadie para hoy; no se envía.');
    return;
  }
  const grupos = {};
  lista.forEach(p => {
    if (!grupos[p.estado]) grupos[p.estado] = [];
    grupos[p.estado].push(p);
  });
  let cuerpo = '';
  Object.keys(grupos).forEach(est => {
    cuerpo += '<h3 style="margin:18px 0 8px">' + esc(est) + ' (' + grupos[est].length + ')</h3>';
    grupos[est].forEach(p => {
      const wa = linkWhatsApp(p.whatsapp);
      cuerpo += '<div style="margin:0 0 14px;padding:12px;border:1px solid #d7e0db;border-radius:8px">' +
        '<div><b>' + esc(p.nombre) + '</b> · ' + esc(p.profesion || '') + '</div>' +
        '<div style="font-size:13px;color:#5d6c66;margin:4px 0">' + esc(p.proximo_paso || '—') +
        (p.proximo_fecha ? ' · ' + Utilities.formatDate(p.proximo_fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd') : '') + '</div>' +
        '<div style="margin:6px 0">' + (wa ? '<a href="' + wa + '">Abrir WhatsApp</a>' : esc(p.whatsapp || '')) + '</div>' +
        '<div style="font-size:13px;background:#f5f7f4;padding:10px;border-radius:6px">' + esc(p.mensaje) + '</div></div>';
    });
  });
  const html =
    '<div style="font-family:Arial,sans-serif;max-width:720px;color:#1d2b26;line-height:1.5">' +
    '<div style="font-size:22px;font-weight:bold">Ruta Puente · A quién escribir hoy</div>' +
    '<p>Hoy tienes <b>' + lista.length + '</b> persona' + (lista.length === 1 ? '' : 's') +
    ' con próximo paso vencido o para hoy. Copia el mensaje y mándalo tú por WhatsApp (nada se envía solo).</p>' +
    cuerpo +
    '<p style="font-size:13px;color:#5d6c66;margin-top:16px"><a href="' + SpreadsheetApp.getActiveSpreadsheet().getUrl() + '">Abrir la hoja</a> · ' +
    '<a href="https://deivblack.github.io/ruta-puente/bitacora/">Abrir la Bitácora</a></p></div>';

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'Ruta Puente · ' + lista.length + ' para escribir hoy',
    body: lista.map(p => p.nombre + ' · ' + p.estado + '\n' + p.mensaje).join('\n\n'),
    htmlBody: html,
    name: 'Ruta Puente'
  });
}

// Ejecutar UNA vez: correo diario ~7:30 a. m. (zona del script; pon America/Chicago en el proyecto)
function activarCorreoDiario() {
  asegurarColumnas();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'correoDiario')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('correoDiario').timeBased().everyDays(1).atHour(7).nearMinute(30).create();
  Logger.log('Trigger diario correoDiario creado (~7:30). Zona del script: ' + Session.getScriptTimeZone());
}

// Prueba: manda el correo real de hoy (usa filas con proximo_fecha ≤ hoy; ideal con PRUEBA atrasada)
function pruebaCorreoDiario() {
  correoDiario();
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
  // Subida de CV: autentica por código personal (sin clave de Bitácora)
  if (b && b.accion === 'subir_cv') return salida(subirCv(b));
  const clave = PropertiesService.getScriptProperties().getProperty('BITACORA_CLAVE');
  if (!clave || !b || b.clave !== clave) { Utilities.sleep(800); return salida({ ok: false, error: 'clave' }); }
  if (b.accion === 'listar') return salida(listarBitacora());
  if (b.accion === 'guardar') return salida(guardarEntrevista(b.datos || {}));
  if (b.accion === 'guardar_estado') return salida(guardarEstado(b.datos || {}));
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
  asegurarColumnas();
  const datos = obtenerHoja().getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const mapa = leerEntrevistas();
  const campos = ['nombre', 'pais', 'profesion', 'anios_exp', 'trabajo_actual', 'horas_trabajo', 'busco_12m',
    'aplicaciones', 'respuestas', 'barrera', 'comentario', 'prioridad', 'estado', 'whatsapp', 'enlace',
    'fecha_contacto', 'fecha_entrevista', 'cv_puntaje_antes', 'cv_puntaje_despues', 'plan_enviado',
    'proximo_paso', 'proximo_fecha', 'notas_david', 'fecha_empleo'];
  const personas = datos.filter(r => r[i('nombre')] && r[i('codigo')]).map(r => {
    const p = { codigo: String(r[i('codigo')]) };
    campos.forEach(c => {
      if (i(c) < 0) { p[c] = ''; return; }
      p[c] = r[i(c)] instanceof Date ? r[i(c)].toISOString() : r[i(c)];
    });
    const ent = mapa[p.codigo];
    if (ent) { delete ent._fila; p.entrevista = ent; }
    return p;
  });
  return { ok: true, personas: personas, gate: contarGate(mapa), estados: ESTADOS };
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
  if (['Nuevo', 'Contactado', 'Agendado', 'No responde', 'Pausa', ''].indexOf(est) >= 0) {
    aplicarEstadoFila(resp, k + 2, cab, 'Entrevistado', {});
  }
  return { ok: true, confirma: o.confirma, compromiso: o.compromiso, gate: contarGate(leerEntrevistas()) };
}

/* ---------- Flujo de estados (próximo paso / fecha) ---------- */

function hoySinHora() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function sumarDias(base, n) {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

function proximoHitoEmpleo(fechaEmpleo, r, idx) {
  const dias = diasDesde(fechaEmpleo);
  if (dias === null) return { fecha: sumarDias(hoySinHora(), 7), paso: 'Anotar fecha_empleo' };
  for (let i = 0; i < HITOS_EMPLEO.length; i++) {
    const h = HITOS_EMPLEO[i];
    const hecho = String(r[idx('seguimiento_' + h)] || '').trim();
    if (!hecho) {
      const fecha = sumarDias(fechaEmpleo instanceof Date ? fechaEmpleo : hoySinHora(), h);
      return { fecha: fecha, paso: 'Seguimiento día ' + h };
    }
  }
  return { fecha: null, paso: 'Ciclo 90 días completo' };
}

/** Calcula proximo_paso / proximo_fecha y fechas derivadas al cambiar estado. */
function valoresProximo(estado, r, idx) {
  const conf = PROXIMO_POR_ESTADO[estado] || { paso: '', dias: null };
  let paso = conf.paso;
  let fecha = null;
  const base = hoySinHora();

  if (estado === 'Agendado') {
    const cita = r[idx('fecha_entrevista')];
    fecha = cita instanceof Date && !isNaN(cita.getTime()) ? cita : base;
  } else if (estado === 'Empleado') {
    const fe = r[idx('fecha_empleo')];
    const h = proximoHitoEmpleo(fe instanceof Date ? fe : null, r, idx);
    fecha = h.fecha;
    paso = h.paso;
  } else if (conf.dias !== null && conf.dias !== undefined) {
    fecha = sumarDias(base, conf.dias);
  }

  const extra = {};
  if (estado === 'Contactado' && !(r[idx('fecha_contacto')] instanceof Date)) extra.fecha_contacto = base;
  if (estado === 'Entrevistado' && !(r[idx('fecha_entrevista')] instanceof Date)) extra.fecha_entrevista = base;
  if (estado === 'Plan enviado' && !String(r[idx('plan_enviado')] || '').trim()) extra.plan_enviado = 'Sí';
  return { proximo_paso: paso, proximo_fecha: fecha, extra: extra };
}

function aplicarEstadoFila(hoja, fila, cab, estado, overrides) {
  const idx = n => cab.indexOf(n);
  if (idx('estado') < 0 || ESTADOS.indexOf(estado) < 0) return false;
  const ancho = Math.max(hoja.getLastColumn(), cab.length);
  const r = hoja.getRange(fila, 1, 1, ancho).getValues()[0];
  while (r.length < cab.length) r.push('');
  const calc = valoresProximo(estado, r, idx);
  hoja.getRange(fila, idx('estado') + 1).setValue(estado);
  if (idx('proximo_paso') >= 0) {
    const paso = overrides.proximo_paso !== undefined ? overrides.proximo_paso : calc.proximo_paso;
    hoja.getRange(fila, idx('proximo_paso') + 1).setValue(limpiar(paso));
  }
  if (idx('proximo_fecha') >= 0) {
    let f = overrides.proximo_fecha !== undefined ? overrides.proximo_fecha : calc.proximo_fecha;
    if (typeof f === 'string' && f) f = new Date(f);
    if (f instanceof Date && !isNaN(f.getTime())) hoja.getRange(fila, idx('proximo_fecha') + 1).setValue(f);
    else if (overrides.proximo_fecha === null || (calc.proximo_fecha === null && overrides.proximo_fecha === undefined)) {
      hoja.getRange(fila, idx('proximo_fecha') + 1).setValue('');
    }
  }
  Object.keys(calc.extra).forEach(c => {
    if (idx(c) >= 0 && overrides[c] === undefined) hoja.getRange(fila, idx(c) + 1).setValue(calc.extra[c]);
  });
  ['fecha_contacto', 'fecha_entrevista', 'fecha_empleo', 'cv_puntaje_antes', 'cv_puntaje_despues',
    'plan_enviado', 'notas_david'].forEach(c => {
    if (overrides[c] === undefined || idx(c) < 0) return;
    let v = overrides[c];
    if ((c.indexOf('fecha') === 0) && typeof v === 'string' && v) v = new Date(v);
    hoja.getRange(fila, idx(c) + 1).setValue(c === 'notas_david' || c.indexOf('puntaje') >= 0 || c === 'plan_enviado' ? limpiar(v) : v);
  });
  return true;
}

function guardarEstado(d) {
  asegurarColumnas();
  const codigo = String(d.codigo || '');
  if (!/^[a-f0-9]{10}$/.test(codigo)) return { ok: false, error: 'codigo' };
  const estado = String(d.estado || '');
  if (ESTADOS.indexOf(estado) < 0) return { ok: false, error: 'estado' };
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const k = datos.findIndex(r => String(r[i('codigo')]) === codigo);
  if (k < 0) return { ok: false, error: 'persona' };
  const overrides = {};
  ['proximo_paso', 'proximo_fecha', 'notas_david', 'cv_puntaje_antes', 'cv_puntaje_despues',
    'plan_enviado', 'fecha_contacto', 'fecha_entrevista', 'fecha_empleo'].forEach(c => {
    if (d[c] !== undefined && d[c] !== '') overrides[c] = d[c];
  });
  aplicarEstadoFila(hoja, k + 2, cab, estado, overrides);
  return { ok: true };
}

/**
 * Trigger instalable: al cambiar la columna estado, recalcula proximo_paso / proximo_fecha.
 * Actívalo con activarOnEditEstado() (una vez).
 */
function onEditEstado(e) {
  if (!e || !e.range) return;
  const hoja = e.range.getSheet();
  if (hoja.getName() !== HOJA) return;
  if (e.range.getRow() < 2 || e.range.getNumColumns() !== 1) return;
  const cab = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String);
  const colEstado = cab.indexOf('estado') + 1;
  if (e.range.getColumn() !== colEstado) return;
  const estado = String(e.range.getValue() || '');
  if (ESTADOS.indexOf(estado) < 0) return;
  aplicarEstadoFila(hoja, e.range.getRow(), cab, estado, {});
}

function activarOnEditEstado() {
  asegurarColumnas();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onEditEstado')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onEditEstado').forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  const hoja = obtenerHoja();
  const col = (hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(String).indexOf('estado')) + 1;
  if (col > 0) {
    const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
    hoja.getRange(2, col, Math.max(hoja.getMaxRows() - 1, 1), 1).setDataValidation(regla);
  }
  Logger.log('Trigger onEditEstado activo y lista de estados actualizada.');
}

/**
 * Pone Entrevistado a quien ya tenga fila en Entrevistas (si aún está en Nuevo/Contactado/Agendado/No responde/Pausa).
 * Por defecto SOLO simula. Para aplicar: migrarEstados(false) — hazlo tú a mano tras revisar el log.
 */
function migrarEstados(simular) {
  if (simular === undefined || simular === null) simular = true;
  asegurarColumnas();
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues();
  const cab = datos.shift();
  const i = n => cab.indexOf(n);
  const mapa = leerEntrevistas();
  const previos = ['Nuevo', 'Contactado', 'Agendado', 'No responde', 'Pausa', ''];
  const cambios = [];
  datos.forEach((r, k) => {
    const codigo = String(r[i('codigo')] || '');
    if (!codigo || !mapa[codigo]) return;
    const est = String(r[i('estado')] || '');
    if (previos.indexOf(est) < 0) return;
    cambios.push({ fila: k + 2, codigo: codigo, nombre: String(r[i('nombre')] || ''), de: est || '(vacío)', a: 'Entrevistado' });
  });
  if (!simular) {
    cambios.forEach(c => aplicarEstadoFila(hoja, c.fila, cab, 'Entrevistado', {}));
  }
  const msg = (simular ? 'SIMULACIÓN (no se escribió nada). ' : 'APLICADO. ') +
    cambios.length + ' fila(s): ' + cambios.map(c => c.nombre + ' [' + c.de + '→' + c.a + ']').join('; ');
  Logger.log(msg);
  return { ok: true, simular: !!simular, cambios: cambios, mensaje: msg };
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
  return asegurarColumnas(hoja);
}

// Agrega al final cualquier columna de COLUMNAS que aún no exista (no mueve las que ya están)
function asegurarColumnas(hoja) {
  hoja = hoja || SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
  if (!hoja) return obtenerHoja();
  const lastCol = Math.max(hoja.getLastColumn(), 1);
  const cab = hoja.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
  COLUMNAS.forEach(nombre => {
    if (cab.indexOf(nombre) < 0) {
      const col = hoja.getLastColumn() + 1;
      hoja.getRange(1, col).setValue(nombre).setFontWeight('bold').setBackground('#e1efe7');
      cab.push(nombre);
    }
  });
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
