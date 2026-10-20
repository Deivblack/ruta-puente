"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const PERFIL_LOCAL = path.join(ROOT, "data", "perfil.local.json");
const PERFIL_PUBLICO = path.join(ROOT, "data", "perfil.json");
const APPS_LOCAL = path.join(ROOT, "data", "aplicaciones.local.json");
const APPS_PUBLICO = path.join(ROOT, "data", "aplicaciones.json");
const OUT_DIR = path.join(ROOT, "salidas");

function cargarPerfil() {
  const ruta = fs.existsSync(PERFIL_LOCAL) ? PERFIL_LOCAL : PERFIL_PUBLICO;
  return {
    perfil: JSON.parse(fs.readFileSync(ruta, "utf8")),
    ruta,
    root: ROOT,
    outDir: OUT_DIR
  };
}

function cargarAplicaciones() {
  const ruta = fs.existsSync(APPS_LOCAL) ? APPS_LOCAL : APPS_PUBLICO;
  if (!fs.existsSync(ruta)) return { apps: [], ruta: null };
  return {
    apps: JSON.parse(fs.readFileSync(ruta, "utf8")),
    ruta
  };
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
  cargarPerfil,
  cargarAplicaciones,
  asegurarSalidas,
  fmtDir,
  salarioFamilia
};
