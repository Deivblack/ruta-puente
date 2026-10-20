"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const PERFIL_LOCAL = path.join(ROOT, "data", "perfil.local.json");
const PERFIL_PUBLICO = path.join(ROOT, "data", "perfil.json");
const APPS_LOCAL = path.join(ROOT, "data", "aplicaciones.local.json");
const APPS_PUBLICO = path.join(ROOT, "data", "aplicaciones.json");
const APPS_PRUEBA = path.join(ROOT, "data", "aplicaciones.prueba.json");
const OUT_DIR = path.join(ROOT, "salidas");

const ESTADOS_APP = [
  "enviada",
  "vista",
  "entrevista",
  "rechazada",
  "cerrada",
  "oferta"
];

function cargarPerfil() {
  const ruta = fs.existsSync(PERFIL_LOCAL) ? PERFIL_LOCAL : PERFIL_PUBLICO;
  return {
    perfil: JSON.parse(fs.readFileSync(ruta, "utf8")),
    ruta,
    root: ROOT,
    outDir: OUT_DIR
  };
}

/** Resuelve la ruta del historial de aplicaciones (local > público, o prueba). */
function rutaAplicaciones(opts = {}) {
  if (opts.prueba || process.env.RP_APPS_PRUEBA === "1") return APPS_PRUEBA;
  if (opts.ruta) return path.resolve(opts.ruta);
  if (process.env.RP_APPS_PATH) return path.resolve(process.env.RP_APPS_PATH);
  if (fs.existsSync(APPS_LOCAL)) return APPS_LOCAL;
  return APPS_PUBLICO;
}

function cargarAplicaciones(opts = {}) {
  const ruta = rutaAplicaciones(opts);
  if (!fs.existsSync(ruta)) return { apps: [], ruta };
  const raw = JSON.parse(fs.readFileSync(ruta, "utf8"));
  const apps = Array.isArray(raw) ? raw : [];
  return { apps, ruta };
}

function guardarAplicaciones(apps, opts = {}) {
  const ruta = rutaAplicaciones(opts);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(apps, null, 2) + "\n", "utf8");
  return ruta;
}

function inferirBilingue(puesto, valor) {
  if (valor === true || valor === false) return valor;
  if (typeof valor === "string") {
    const t = valor.toLowerCase().trim();
    if (["si", "sí", "yes", "y", "true", "1"].includes(t)) return true;
    if (["no", "n", "false", "0"].includes(t)) return false;
  }
  const p = String(puesto || "").toLowerCase();
  return /\bbilingual\b|\bspanish\b|\binglés\b|\bingles\b|\bespañol\b/.test(p);
}

function asegurarSalidas(...sub) {
  const dir = path.join(OUT_DIR, ...sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fmtDir(addr) {
  if (!addr) return "";
  return [addr.line1, addr.line2, addr.city, addr.state, addr.zip]
    .filter((x) => x && String(x).trim())
    .join(", ");
}

function salarioFamilia(perfil, id) {
  const f = ((perfil.targets && perfil.targets.role_families) || []).find(
    (x) => x.id === id
  );
  if (!f) return null;
  return {
    id: f.id,
    name: f.name || id,
    floor: f.salary_floor,
    ask: f.salary_ask,
    ceiling: f.salary_ceiling
  };
}

module.exports = {
  ROOT,
  OUT_DIR,
  APPS_PRUEBA,
  ESTADOS_APP,
  cargarPerfil,
  cargarAplicaciones,
  guardarAplicaciones,
  rutaAplicaciones,
  asegurarSalidas,
  fmtDir,
  salarioFamilia,
  inferirBilingue
};
