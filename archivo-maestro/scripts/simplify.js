#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  cargarPerfil,
  asegurarSalidas,
  fmtDir,
  salarioFamilia,
  OUT_DIR
} = require("./lib/cargar");

function line(label, value) {
  const v = value == null || value === "" ? "_(vacío — completar en Simplify)_" : String(value);
  return `- **${label}:** ${v}`;
}

function yn(v) {
  if (v === null || v === undefined) return "";
  return v ? "Yes" : "No";
}

function main() {
  const { perfil, ruta } = cargarPerfil();
  const p = perfil.personal || {};
  const addr = p.address || {};
  const elig = perfil.eligibility || {};
  const std = perfil.standard_answers || {};
  const eeo = std.eeo || {};
  const targets = perfil.targets || {};
  const askTa = salarioFamilia(perfil, "ta");
  const askHr = salarioFamilia(perfil, "hr");

  const parts = [];
  parts.push("# Simplify Copilot — checklist de perfil");
  parts.push("");
  parts.push(`Generado desde \`${path.relative(process.cwd(), ruta)}\` (${perfil.updated_at || ""}).`);
  parts.push("Copia cada valor a tu perfil de Simplify una sola vez. Orden aproximado de las secciones del perfil.");
  parts.push("");
  parts.push("> No incluye SSN, pasaporte ni cuentas. Revisa siempre antes de enviar una aplicación.");
  parts.push("");

  parts.push("## Contact / Profile");
  parts.push(line("First Name", p.legal_first_name));
  parts.push(line("Middle Name", p.middle_name));
  parts.push(line("Last Name", p.legal_last_name));
  parts.push(line("Preferred Name / Full Name", p.preferred_name));
  parts.push(line("Email", p.email));
  parts.push(line("Phone", p.phone_mobile));
  parts.push(line("LinkedIn URL", p.linkedin_url));
  parts.push(line("Location (City)", addr.city));
  parts.push(line("State", addr.state));
  parts.push(line("ZIP / Postal Code", addr.zip));
  parts.push(line("Address Line 1", addr.line1));
  parts.push(line("Address Line 2", addr.line2));
  parts.push(line("County", addr.county));
  parts.push("");

  parts.push("## Work Authorization");
  parts.push(line("Authorized to work in the US", yn(elig.authorized_to_work_us)));
  parts.push(line("Require sponsorship now or in the future", yn(elig.requires_sponsorship)));
  parts.push("");

  parts.push("## Job Preferences");
  parts.push(line("Search ZIP", targets.search_zip));
  parts.push(line("Radius (miles)", targets.radius_miles));
  parts.push(line("Work mode", (targets.work_mode || []).join(", ")));
  parts.push(line("Schedule", targets.schedule));
  parts.push(line("Start availability / Notice", targets.start_availability || targets.notice_period));
  parts.push(line("Willing to relocate", yn(elig.willing_to_relocate)));
  parts.push(
    line(
      "Desired salary (TA ask — dígitos)",
      askTa && askTa.ask != null ? String(askTa.ask) : ""
    )
  );
  parts.push(
    line(
      "Desired salary (HR ask — dígitos)",
      askHr && askHr.ask != null ? String(askHr.ask) : ""
    )
  );
  parts.push(line("Role keywords (TA)", ((targets.role_families || []).find((f) => f.id === "ta") || {}).keywords?.join(", ")));
  parts.push("");

  parts.push("## Personal Info (EEO — opcional)");
  parts.push(line("Gender", eeo.gender));
  parts.push(line("Hispanic or Latino", yn(eeo.hispanic_latino)));
  parts.push(line("Race / Ethnicity", eeo.race));
  parts.push(line("Veteran status", yn(eeo.veteran)));
  parts.push(line("Disability status", yn(eeo.disability)));
  parts.push("");

  parts.push("## Education (en orden)");
  (perfil.education || []).forEach((e, i) => {
    parts.push(`### Education ${i + 1}`);
    parts.push(line("School / Institution", e.institution));
    parts.push(line("Degree", e.degree_us_equivalent || e.degree_original));
    parts.push(line("Degree (original)", e.degree_original));
    parts.push(line("Field of study", e.field));
    parts.push(line("Country", e.country));
    parts.push(line("Start", e.start));
    parts.push(line("End / Graduation", e.end));
    parts.push(line("Completed", yn(e.completed)));
    parts.push("");
  });

  parts.push("## Work Experience (en orden — títulos US)");
  (perfil.experience || []).forEach((e, i) => {
    parts.push(`### Experience ${i + 1} — ${e.id}`);
    parts.push(line("Company", e.employer));
    parts.push(line("Title", e.title_us_equivalent || e.title_original));
    parts.push(line("Location", [e.city, e.country].filter(Boolean).join(", ")));
    parts.push(line("Company address", fmtDir(e.address)));
    parts.push(line("Start", e.start));
    parts.push(line("End", e.end));
    parts.push(line("Reason for leaving", e.reason_for_leaving));
    const bullets = (e.bullets_by_family && (e.bullets_by_family.hr || e.bullets_by_family.ld)) || [];
    if (bullets.length) {
      parts.push("- **Bullets (hr/ld sample):**");
      bullets.slice(0, 5).forEach((b) => parts.push(`  - ${b}`));
    }
    parts.push("");
  });

  parts.push("## Current US jobs (si Simplify pregunta empleo actual)");
  (perfil.us_current_jobs || []).forEach((j, i) => {
    parts.push(`### US job ${i + 1}`);
    parts.push(line("Company", j.employer));
    parts.push(line("Via agency", j.via_agency));
    parts.push(line("Title", j.title));
    parts.push(line("Start", j.start));
    parts.push(line("City", j.city));
    parts.push("");
  });

  parts.push("## Skills");
  const sk = perfil.skills || {};
  parts.push(line("Systems / Tools", (sk.systems || []).join(", ")));
  parts.push(line("Methodologies", (sk.methodologies || []).join(", ")));
  parts.push(line("Domains", (sk.domains || []).join(", ")));
  parts.push(line("Soft skills", (sk.soft || []).join(", ")));
  parts.push("");

  parts.push("## Languages");
  (perfil.languages || []).forEach((l) => {
    parts.push(line(l.language, l.level));
  });
  parts.push("");

  parts.push("## Links");
  parts.push(line("LinkedIn", p.linkedin_url));
  parts.push("");

  parts.push("## Resumes to upload in Simplify");
  parts.push("- HR / TA: `salidas/CV_hr.docx` (y `CV_ta.docx` si lo usas aparte)");
  parts.push("- L&D: `salidas/CV_ld.docx`");
  parts.push("- Warehouse / agencies: `salidas/CV_warehouse.docx`");
  parts.push("");
  parts.push("---");
  parts.push("Cuando termines de pegar todo en Simplify, marca mentalmente esta checklist como hecha y vuelve a correr `npm run simplify` solo si cambias el perfil.");

  asegurarSalidas();
  const out = path.join(OUT_DIR, "simplify-checklist.md");
  fs.writeFileSync(out, parts.join("\n") + "\n", "utf8");
  console.log("=== Archivo Maestro — simplify ===\n");
  console.log(`Salida: ${out}`);
}

main();
