#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const Ajv2020 = require("ajv/dist/2020");
const addFormats = require("ajv-formats");

const ROOT = path.join(__dirname, "..");
const PERFIL_PUBLICO = path.join(ROOT, "data", "perfil.json");
const PERFIL_LOCAL = path.join(ROOT, "data", "perfil.local.json");
const SCHEMA_PATH = path.join(ROOT, "schema", "perfil.schema.json");

// Si existe el archivo local (datos reales, gitignored), se usa ese.
const PERFIL_PATH = fs.existsSync(PERFIL_LOCAL) ? PERFIL_LOCAL : PERFIL_PUBLICO;

// Coincidencia exacta del nombre de campo (normalizado). Evita falsos positivos
// como "applications_pending_account" al buscar "account".
const CAMPOS_PROHIBIDOS_EXACTOS = [
  "ssn",
  "socialsecurity",
  "socialsecuritynumber",
  "passport",
  "pasaporte",
  "passportnumber",
  "account",
  "accountnumber",
  "bankaccount",
  "routing",
  "routingnumber",
  "creditcard",
  "cardnumber",
  "password",
  "contrasena",
  "pin",
  "cvv"
];

function leerJson(ruta) {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch (err) {
    console.error(`Error al leer ${ruta}: ${err.message}`);
    process.exit(1);
  }
}

function traducirErrorAjv(err) {
  const donde = err.instancePath || "(raíz)";
  switch (err.keyword) {
    case "required":
      return `Falta el campo obligatorio "${err.params.missingProperty}" en ${donde || "(raíz)"}.`;
    case "additionalProperties":
      return `Campo no permitido "${err.params.additionalProperty}" en ${donde || "(raíz)"}.`;
    case "type":
      return `Tipo incorrecto en ${donde}: se esperaba ${err.params.type}.`;
    case "enum":
      return `Valor no válido en ${donde}. Opciones: ${err.params.allowedValues.join(", ")}.`;
    case "const":
      return `Valor fijo incorrecto en ${donde}: debe ser ${JSON.stringify(err.params.allowedValue)}.`;
    case "pattern":
      return `Formato incorrecto en ${donde}.`;
    case "minimum":
      return `El valor en ${donde} debe ser ≥ ${err.params.limit}.`;
    case "maximum":
      return `El valor en ${donde} debe ser ≤ ${err.params.limit}.`;
    case "minLength":
      return `El texto en ${donde} no puede estar vacío.`;
    default:
      return `${donde}: ${err.message}`;
  }
}

function mesANumero(ym) {
  if (!ym || ym === "present") return null;
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]);
}

function buscarClavesProhibidas(obj, ruta = "") {
  const hallazgos = [];
  if (obj === null || typeof obj !== "object") return hallazgos;

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      hallazgos.push(...buscarClavesProhibidas(item, `${ruta}[${i}]`));
    });
    return hallazgos;
  }

  for (const [clave, valor] of Object.entries(obj)) {
    const rutaClave = ruta ? `${ruta}.${clave}` : clave;
    const claveNorm = clave.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (CAMPOS_PROHIBIDOS_EXACTOS.includes(claveNorm)) {
      hallazgos.push({
        ruta: rutaClave,
        motivo: `Campo prohibido por privacidad ("${clave}"). No lo guardes.`
      });
    }
    if (typeof valor === "string") {
      const v = valor.toLowerCase();
      // Solo marca si parece un número de SSN (xxx-xx-xxxx), no la palabra suelta.
      if (/\b\d{3}-\d{2}-\d{4}\b/.test(v)) {
        hallazgos.push({
          ruta: rutaClave,
          motivo: "El valor parece un número de SSN. Quítalo; no lo guardamos."
        });
      }
    }
    hallazgos.push(...buscarClavesProhibidas(valor, rutaClave));
  }
  return hallazgos;
}

function validarFechas(perfil) {
  const errores = [];

  (perfil.experience || []).forEach((exp, i) => {
    const etiqueta = exp.id || `experience[${i}]`;
    const start = mesANumero(exp.start);
    const end = exp.end === "present" ? Number.POSITIVE_INFINITY : mesANumero(exp.end);

    if (exp.start && start === null) {
      errores.push(`${etiqueta}: fecha de inicio inválida ("${exp.start}"). Usa YYYY-MM.`);
    }
    if (exp.end && exp.end !== "present" && end === null) {
      errores.push(`${etiqueta}: fecha de fin inválida ("${exp.end}"). Usa YYYY-MM o "present".`);
    }
    if (start !== null && end !== null && end < start) {
      errores.push(`${etiqueta}: la fecha de fin (${exp.end}) es anterior al inicio (${exp.start}).`);
    }
  });

  (perfil.education || []).forEach((edu, i) => {
    const etiqueta = `education[${i}] (${edu.institution || "sin institución"})`;
    const start = mesANumero(edu.start);
    const end = mesANumero(edu.end);
    if (edu.start && start === null) {
      errores.push(`${etiqueta}: inicio inválido ("${edu.start}").`);
    }
    if (edu.end && end === null) {
      errores.push(`${etiqueta}: fin inválido ("${edu.end}").`);
    }
    if (start !== null && end !== null && end < start) {
      errores.push(`${etiqueta}: el fin (${edu.end}) es anterior al inicio (${edu.start}).`);
    }
  });

  const conFechas = (perfil.experience || [])
    .map((exp, i) => ({
      i,
      id: exp.id || `experience[${i}]`,
      start: mesANumero(exp.start),
      end: exp.end === "present" ? Number.POSITIVE_INFINITY : mesANumero(exp.end)
    }))
    .filter((e) => e.start !== null && e.end !== null);

  for (let a = 0; a < conFechas.length; a++) {
    for (let b = a + 1; b < conFechas.length; b++) {
      const A = conFechas[a];
      const B = conFechas[b];
      const seCruzan = A.start <= B.end && B.start <= A.end;
      if (seCruzan) {
        errores.push(
          `Fechas que se cruzan: "${A.id}" y "${B.id}". Revisa si es intencional (doble empleo) o un error.`
        );
      }
    }
  }

  return errores;
}

function main() {
  console.log("=== Archivo Maestro — validar ===\n");

  if (!fs.existsSync(PERFIL_PATH)) {
    console.error(`No encuentro ${PERFIL_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`No encuentro ${SCHEMA_PATH}`);
    process.exit(1);
  }

  const perfil = leerJson(PERFIL_PATH);
  const schema = leerJson(SCHEMA_PATH);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const okSchema = validate(perfil);
  const erroresSchema = okSchema
    ? []
    : (validate.errors || []).map(traducirErrorAjv);

  const prohibidos = buscarClavesProhibidas(perfil);
  const erroresFechas = validarFechas(perfil);
  const pendientes = Array.isArray(perfil.pending) ? perfil.pending : [];

  const etiquetaArchivo = PERFIL_PATH === PERFIL_LOCAL
    ? "data/perfil.local.json (datos reales, no van a GitHub)"
    : "data/perfil.json (plantilla pública)";
  console.log(`Archivo: ${etiquetaArchivo}`);
  console.log(`Versión del esquema: ${perfil.schema_version || "(sin versión)"}`);
  console.log(`Actualizado: ${perfil.updated_at || "(sin fecha)"}\n`);

  if (erroresSchema.length) {
    console.log(`Errores de esquema (${erroresSchema.length}):`);
    erroresSchema.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    console.log("");
  } else {
    console.log("Esquema: OK\n");
  }

  if (prohibidos.length) {
    console.log(`Campos o valores prohibidos (${prohibidos.length}):`);
    prohibidos.forEach((p, i) => console.log(`  ${i + 1}. ${p.ruta} — ${p.motivo}`));
    console.log("");
  } else {
    console.log("Privacidad: OK (sin SSN, pasaporte, cuentas ni contraseñas)\n");
  }

  if (erroresFechas.length) {
    console.log(`Avisos / errores de fechas (${erroresFechas.length}):`);
    erroresFechas.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    console.log("");
  } else {
    console.log("Fechas: OK\n");
  }

  if (pendientes.length) {
    console.log(`Pendientes (${pendientes.length}):`);
    pendientes.forEach((p, i) => {
      console.log(`  ${i + 1}. [${p.field}] ${p.question}`);
    });
    console.log("");
  } else {
    console.log("Pendientes: ninguno\n");
  }

  const hayErrores =
    erroresSchema.length > 0 ||
    prohibidos.length > 0 ||
    erroresFechas.some((e) => !e.includes("se cruzan"));

  // Los cruces de fechas son aviso (doble empleo puede ser real); el resto es error.
  const soloAvisosCruce = erroresFechas.filter((e) => e.includes("se cruzan"));
  const erroresFechaDuros = erroresFechas.filter((e) => !e.includes("se cruzan"));
  const fallos =
    erroresSchema.length + prohibidos.length + erroresFechaDuros.length;

  if (soloAvisosCruce.length && !fallos) {
    console.log("Resultado: OK con avisos (revisa fechas que se cruzan).");
  } else if (fallos === 0) {
    console.log("Resultado: OK");
    if (pendientes.length) {
      console.log(
        `(Hay ${pendientes.length} pendientes de datos — el esquema está bien; falta completar información.)`
      );
    }
  } else {
    console.log(`Resultado: FALLÓ (${fallos} error(es)).`);
  }

  process.exit(fallos > 0 ? 1 : 0);
}

main();
