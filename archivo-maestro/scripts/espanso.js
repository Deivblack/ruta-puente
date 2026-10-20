#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  cargarPerfil,
  asegurarSalidas,
  fmtDir,
  salarioFamilia
} = require("./lib/cargar");

function escYaml(s) {
  const t = String(s ?? "");
  if (t.includes("\n")) {
    return "|\n" + t.split("\n").map((l) => "      " + l).join("\n");
  }
  if (/[:#{}[\],&*?|<>=!%@`]/.test(t) || t === "" || /^\s|\s$/.test(t)) {
    return JSON.stringify(t);
  }
  return t;
}

function match(trigger, replace, label) {
  const lines = [
    "  - trigger: " + JSON.stringify(trigger),
    "    replace: " + (String(replace).includes("\n") ? escYaml(replace) : JSON.stringify(String(replace ?? "")))
  ];
  if (label) lines.push("    label: " + JSON.stringify(label));
  return lines.join("\n");
}

function main() {
  const { perfil, ruta } = cargarPerfil();
  const p = perfil.personal || {};
  const addr = p.address || {};
  const elig = perfil.eligibility || {};
  const std = perfil.standard_answers || {};
  const eeo = std.eeo || {};

  const matches = [];

  // Dirección completa — criterio Fase 4: ;dir
  const dirCompleta = fmtDir(addr);
  matches.push(match(";dir", dirCompleta, "Dirección completa"));
  matches.push(match(";street", addr.line1 || "", "Calle"));
  matches.push(match(";apt", addr.line2 || "", "Apt / unidad"));
  matches.push(match(";city", addr.city || "", "Ciudad"));
  matches.push(match(";county", addr.county || "", "County"));
  matches.push(match(";state", addr.state || "", "Estado"));
  matches.push(match(";zip", addr.zip || "", "ZIP"));

  matches.push(match(";fname", p.legal_first_name || "", "First name"));
  matches.push(match(";mname", p.middle_name || "", "Middle name"));
  matches.push(match(";lname", p.legal_last_name || "", "Last name"));
  matches.push(match(";name", p.preferred_name || "", "Nombre completo preferido"));
  matches.push(
    match(
      ";formname",
      `${p.legal_first_name || ""} ${p.middle_name || ""}`.trim(),
      "Nombre para formularios (first + middle)"
    )
  );
  matches.push(match(";email", p.email || "", "Email"));
  matches.push(match(";phone", p.phone_mobile || "", "Celular"));
  matches.push(match(";li", p.linkedin_url || "", "LinkedIn"));
  matches.push(match(";dob", p.date_of_birth || "", "Fecha de nacimiento"));
  matches.push(match(";nation", p.nationality || "", "Nacionalidad"));

  matches.push(
    match(";auth", elig.authorized_to_work_us ? "Yes" : "No", "Authorized to work US")
  );
  matches.push(
    match(";spons", elig.requires_sponsorship ? "Yes" : "No", "Requires sponsorship")
  );
  matches.push(match(";dl", elig.drivers_license ? "Yes" : "No", "Driver license"));
  matches.push(match(";car", elig.has_vehicle ? "Yes" : "No", "Has vehicle"));
  matches.push(
    match(
      ";reloc",
      elig.willing_to_relocate === null || elig.willing_to_relocate === undefined
        ? ""
        : elig.willing_to_relocate
          ? "Yes"
          : "No",
      "Willing to relocate"
    )
  );

  for (const id of ["ta", "hr", "ld", "warehouse"]) {
    const s = salarioFamilia(perfil, id);
    if (!s) continue;
    if (s.ask != null) matches.push(match(`;sal${id}`, String(s.ask), `Salary ask ${id}`));
    if (s.floor != null) matches.push(match(`;sal${id}min`, String(s.floor), `Salary floor ${id}`));
  }

  if (std.years_total_experience != null) {
    matches.push(match(";yexp", String(std.years_total_experience), "Years total experience"));
  }
  const yba = std.years_by_area || {};
  for (const [k, v] of Object.entries(yba)) {
    if (v != null && v !== "") {
      matches.push(match(`;y${k.slice(0, 6)}`, String(v), `Years ${k}`));
    }
  }

  if (eeo.gender) matches.push(match(";gender", eeo.gender, "EEO gender"));
  if (eeo.race) matches.push(match(";race", eeo.race, "EEO race"));
  if (eeo.hispanic_latino != null) {
    matches.push(match(";hisp", eeo.hispanic_latino ? "Yes" : "No", "Hispanic/Latino"));
  }

  // Direcciones de empleadores
  for (const exp of perfil.experience || []) {
    const d = fmtDir(exp.address);
    if (!d) continue;
    const trig = `;emp${exp.id}`;
    matches.push(match(trig, d, `Employer address ${exp.id} (${exp.employer})`));
  }

  // Answer bank
  for (const a of perfil.answer_bank || []) {
    const trig = (a.espanso_trigger || "").trim();
    if (!trig) continue;
    const text = a.answer_en || a.answer_es || "";
    if (!text) continue;
    matches.push(match(trig, text, a.id || trig));
  }

  const yaml = [
    "# Archivo Maestro — atajos Espanso (generado; no editar a mano)",
    `# Fuente: ${ruta}`,
    `# Actualizado: ${perfil.updated_at || ""}`,
    "#",
    "# En Windows, copia este archivo a:",
    "#   %APPDATA%\\espanso\\match\\ruta-puente.yml",
    "# Luego: espanso restart   (o reinicia Espanso desde la bandeja)",
    "# Prueba en Chrome: escribe  ;dir  y debería expandir tu dirección.",
    "",
    "matches:",
    ...matches,
    ""
  ].join("\n");

  const dir = asegurarSalidas("espanso");
  const out = path.join(dir, "ruta-puente.yml");
  fs.writeFileSync(out, yaml, "utf8");

  console.log("=== Archivo Maestro — espanso ===\n");
  console.log(`Perfil: ${ruta}`);
  console.log(`Atajos: ${matches.length}`);
  console.log(`Salida: ${out}`);
  console.log("\nEn Windows:");
  console.log("  1. Copia salidas\\espanso\\ruta-puente.yml");
  console.log("  2. Pégalo en %APPDATA%\\espanso\\match\\");
  console.log("  3. Reinicia Espanso");
  console.log("  4. En Chrome escribe: ;dir");
}

main();
