/**
 * Archivo Maestro — editor en la nube (Google Apps Script)
 *
 * Costo cero. Tus datos viven en TU Google Drive (carpeta privada).
 * Publica como "Aplicación web" → Solo yo.
 *
 * Funciones útiles en el editor:
 *   - doGet: abre la app
 *   - apiCargar / apiGuardar: perfil.json
 *   - apiCargarApps / apiGuardarApps: aplicaciones.json
 */

var CARPETA = 'Archivo Maestro (privado)';
var ARCHIVO_PERFIL = 'perfil.json';
var ARCHIVO_APPS = 'aplicaciones.json';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Archivo Maestro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Carga perfil desde Drive. Si no existe, devuelve plantilla vacía + flag primeraVez. */
function apiCargar() {
  var file = obtenerArchivo_(ARCHIVO_PERFIL, null);
  if (!file) {
    return {
      ok: true,
      primeraVez: true,
      perfil: plantillaPerfil_(),
      actualizado: null,
      archivoId: null
    };
  }
  var texto = file.getBlob().getDataAsString('UTF-8');
  var perfil = JSON.parse(texto);
  return {
    ok: true,
    primeraVez: false,
    perfil: perfil,
    actualizado: perfil.updated_at || null,
    archivoId: file.getId(),
    urlDrive: file.getUrl()
  };
}

/** Guarda el perfil completo en Drive (crea el archivo si falta). */
function apiGuardar(perfil) {
  if (!perfil || typeof perfil !== 'object') {
    return { ok: false, error: 'Perfil inválido' };
  }
  perfil.updated_at = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Chicago', 'yyyy-MM-dd');
  if (!perfil.schema_version) perfil.schema_version = '1.1';

  var json = JSON.stringify(perfil, null, 2) + '\n';
  var file = obtenerArchivo_(ARCHIVO_PERFIL, json);
  file.setContent(json);
  return {
    ok: true,
    actualizado: perfil.updated_at,
    archivoId: file.getId(),
    urlDrive: file.getUrl()
  };
}

function apiCargarApps() {
  var file = obtenerArchivo_(ARCHIVO_APPS, '[]\n');
  var apps = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
  if (!Array.isArray(apps)) apps = [];
  return { ok: true, apps: apps, archivoId: file.getId() };
}

function apiGuardarApps(apps) {
  if (!Array.isArray(apps)) return { ok: false, error: 'Apps inválidas' };
  var json = JSON.stringify(apps, null, 2) + '\n';
  var file = obtenerArchivo_(ARCHIVO_APPS, json);
  file.setContent(json);
  return { ok: true, total: apps.length, archivoId: file.getId() };
}

/** Importación única: pega un JSON completo la primera vez. */
function apiImportarTexto(texto) {
  if (!texto || String(texto).trim() === '') {
    return { ok: false, error: 'Texto vacío' };
  }
  var perfil;
  try {
    perfil = JSON.parse(texto);
  } catch (err) {
    return { ok: false, error: 'JSON inválido: ' + err.message };
  }
  return apiGuardar(perfil);
}

function obtenerCarpeta_() {
  var it = DriveApp.getFoldersByName(CARPETA);
  if (it.hasNext()) return it.next();
  return DriveApp.createFolder(CARPETA);
}

function obtenerArchivo_(nombre, contenidoInicial) {
  var carpeta = obtenerCarpeta_();
  var it = carpeta.getFilesByName(nombre);
  if (it.hasNext()) return it.next();
  if (contenidoInicial === null) return null;
  return carpeta.createFile(nombre, contenidoInicial, MimeType.PLAIN_TEXT);
}

function plantillaPerfil_() {
  return {
    schema_version: '1.1',
    updated_at: '',
    personal: {
      legal_first_name: '',
      middle_name: '',
      legal_last_name: '',
      preferred_name: '',
      email: '',
      phone_mobile: '',
      linkedin_url: '',
      date_of_birth: '',
      nationality: '',
      address: { line1: '', line2: '', city: '', county: '', state: '', zip: '' },
      origin_country: ''
    },
    eligibility: {
      authorized_to_work_us: true,
      requires_sponsorship: false,
      drivers_license: true,
      has_vehicle: true,
      willing_to_relocate: null,
      willing_to_travel_pct: null
    },
    targets: {
      role_families: [
        { id: 'ta', name: '', keywords: [], cv_version: 'hr', salary_floor: null, salary_ask: null, salary_ceiling: null },
        { id: 'hr', name: '', keywords: [], cv_version: 'hr', salary_floor: null, salary_ask: null, salary_ceiling: null },
        { id: 'ld', name: '', keywords: [], cv_version: 'ld', salary_floor: null, salary_ask: null, salary_ceiling: null },
        { id: 'warehouse', name: '', keywords: [], cv_version: 'warehouse', salary_floor: null, salary_ask: null, salary_ceiling: null }
      ],
      search_zip: '',
      radius_miles: 25,
      work_mode: ['onsite', 'hybrid', 'remote'],
      schedule: '',
      start_availability: '',
      notice_period: ''
    },
    experience: [],
    us_current_jobs: [],
    education: [],
    certifications: [],
    skills: { systems: [], methodologies: [], domains: [], soft: [] },
    languages: [],
    standard_answers: {
      years_total_experience: null,
      years_by_area: { recruiting: null, training: null, hr_generalist: null, people_management: null },
      eeo: { gender: '', hispanic_latino: null, race: '', veteran: null, disability: null },
      how_did_you_hear_default: 'LinkedIn'
    },
    answer_bank: [],
    profile_text: { headline_en: '', summaries_en: [] },
    references: [],
    portal_notes: [],
    pending: []
  };
}
