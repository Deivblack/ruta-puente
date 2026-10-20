#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  cargarPerfil,
  cargarAplicaciones,
  asegurarSalidas,
  fmtDir,
  salarioFamilia,
  OUT_DIR
} = require("./lib/cargar");

function main() {
  const { perfil, ruta } = cargarPerfil();
  const { apps } = cargarAplicaciones();
  const p = perfil.personal || {};
  const addr = p.address || {};
  const elig = perfil.eligibility || {};
  const std = perfil.standard_answers || {};
  const eeo = std.eeo || {};
  const targets = perfil.targets || {};

  const L = [];
  const w = (s = "") => L.push(s);

  w("# Archivo Maestro — contexto para Claude");
  w("");
  w(`Actualizado: ${perfil.updated_at || ""} · schema ${perfil.schema_version || ""}`);
  w(`Fuente: \`${path.basename(ruta)}\``);
  w("");
  w("Instrucciones para el asistente: usa solo estos datos. No inventes empleos, fechas ni métricas. Si falta algo, dilo.");
  w("");

  w("## Perfil");
  w(`- Nombre: ${p.preferred_name || ""} (legal: ${p.legal_first_name} ${p.middle_name} ${p.legal_last_name})`);
  if (p.name_rule) w(`- Regla de nombre: ${p.name_rule}`);
  w(`- Email: ${p.email}`);
  w(`- Tel: ${p.phone_mobile}`);
  w(`- LinkedIn: ${p.linkedin_url}`);
  w(`- DOB: ${p.date_of_birth || "—"}`);
  w(`- Nacionalidad / origen: ${p.nationality || ""} / ${p.origin_country || ""}`);
  w(`- Dirección: ${fmtDir(addr)}`);
  w(`- Autorizado US: ${elig.authorized_to_work_us ? "Sí" : "No"} · Sponsorship: ${elig.requires_sponsorship ? "Sí" : "No"}`);
  w(`- Relocate: ${elig.willing_to_relocate == null ? "?" : elig.willing_to_relocate ? "Sí" : "No"} · DL/vehículo: ${elig.drivers_license ? "Sí" : "No"}/${elig.has_vehicle ? "Sí" : "No"}`);
  w("");

  w("## Búsqueda");
  w(`- ZIP ${targets.search_zip} · radio ${targets.radius_miles} mi · modos: ${(targets.work_mode || []).join(", ")}`);
  w(`- Disponibilidad: ${targets.start_availability || "—"} · aviso: ${targets.notice_period || "—"}`);
  w("- Familias y salario:");
  for (const f of targets.role_families || []) {
    w(
      `  - **${f.id}** ${f.name}: floor=${f.salary_floor ?? "—"} ask=${f.salary_ask ?? "—"} ceil=${f.salary_ceiling ?? "—"} · cv=${f.cv_version} · keywords: ${(f.keywords || []).slice(0, 6).join("; ")}`
    );
  }
  if (Array.isArray(targets.salary_rules) && targets.salary_rules.length) {
    w("- Reglas salariales:");
    targets.salary_rules.forEach((r) => w(`  - ${r}`));
  }
  w("");

  w("## Headline / summaries");
  if (perfil.profile_text) {
    if (perfil.profile_text.headline_en) w(`- Headline: ${perfil.profile_text.headline_en}`);
    const hl = perfil.profile_text.headlines || {};
    Object.entries(hl).forEach(([k, v]) => w(`- Headline ${k}: ${v}`));
    for (const s of perfil.profile_text.summaries_en || []) {
      w(`### Summary ${s.family}`);
      w(s.text || "");
      w("");
    }
  }

  w("## Experiencia");
  for (const e of perfil.experience || []) {
    w(`### ${e.title_us_equivalent || e.title_original} — ${e.employer} (${e.start} → ${e.end})`);
    w(`- Original: ${e.title_original || "—"} · ${[e.city, e.country].filter(Boolean).join(", ")}`);
    if (e.employer_context) w(`- Contexto: ${e.employer_context}`);
    if (e.employee_count) w(`- Empleados: ${e.employee_count}`);
    w(`- show_on_cv: ${(e.show_on_cv || []).join(", ") || "—"}`);
    w(`- Leaving: ${e.reason_for_leaving || "—"}`);
    const addrE = fmtDir(e.address);
    if (addrE) w(`- Address: ${addrE}`);
    for (const fam of ["hr", "ld", "ta", "warehouse"]) {
      const bs = (e.bullets_by_family && e.bullets_by_family[fam]) || [];
      if (!bs.length) continue;
      w(`- Bullets ${fam}:`);
      bs.forEach((b) => w(`  - ${b}`));
    }
    w("");
  }

  w("## Empleos actuales US");
  for (const j of perfil.us_current_jobs || []) {
    w(
      `- ${j.title} @ ${j.employer}${j.via_agency ? ` (via ${j.via_agency})` : ""} · ${j.start || "?"} · cv: ${(j.show_on_cv || []).join(",") || "—"}`
    );
    (j.bullets || []).forEach((b) => w(`  - ${b}`));
  }
  w("");

  w("## Educación");
  for (const e of perfil.education || []) {
    w(
      `- ${e.degree_us_equivalent || e.degree_original} — ${e.institution} (${e.country}) ${e.start || "?"}→${e.end || "?"} · ${e.field || ""} · eval=${e.credential_evaluation}`
    );
  }
  w("");

  w("## Certificaciones / skills / idiomas");
  for (const c of perfil.certifications || []) {
    if (c.active === false) continue;
    w(`- Cert: ${c.name}${c.issuer ? ` (${c.issuer})` : ""}${c.year ? ` ${c.year}` : ""}`);
  }
  const sk = perfil.skills || {};
  w(`- Systems: ${(sk.systems || []).join("; ")}`);
  w(`- Methodologies: ${(sk.methodologies || []).join("; ")}`);
  w(`- Domains: ${(sk.domains || []).join("; ")}`);
  w(`- Soft: ${(sk.soft || []).join("; ")}`);
  w(
    `- Languages: ${(perfil.languages || []).map((l) => `${l.language} ${l.level}`).join("; ")}`
  );
  w("");

  w("## Respuestas estándar");
  w(`- Años totales: ${std.years_total_experience ?? "—"}`);
  w(`- Por área: ${JSON.stringify(std.years_by_area || {})}`);
  if (std.years_by_area_extra) w(`- Extra: ${JSON.stringify(std.years_by_area_extra)}`);
  w(`- How did you hear default: ${std.how_did_you_hear_default || ""}`);
  w(
    `- EEO: gender=${eeo.gender || ""} hispanic=${eeo.hispanic_latino} race=${eeo.race || ""} veteran=${eeo.veteran} disability=${eeo.disability}`
  );
  w("");

  w("## Answer bank");
  for (const a of perfil.answer_bank || []) {
    w(`### ${a.id} (${a.family || ""} · ${a.espanso_trigger || "sin trigger"})`);
    w(`Pattern: ${a.question_pattern || ""}`);
    if (a.answer_en) w(a.answer_en);
    if (a.answer_es) w(`ES: ${a.answer_es}`);
    w("");
  }

  w("## Referencias (resumen)");
  for (const r of perfil.references || []) {
    w(`- ${r.name}: ${r.relationship} · ${r.country} · tel ${r.phone || "—"} · email ${r.email || "—"}`);
  }
  w("");

  w("## Portal tips");
  for (const n of perfil.portal_notes || []) {
    w(`- **${n.portal}:** ${(n.tips || []).join(" | ")}`);
  }
  w("");

  if (Array.isArray(perfil.interview_rules) && perfil.interview_rules.length) {
    w("## Reglas de entrevista");
    perfil.interview_rules.forEach((r) => w(`- ${r}`));
    w("");
  }

  if (Array.isArray(perfil.pending) && perfil.pending.length) {
    w("## Pendientes");
    perfil.pending.forEach((x) => w(`- [${x.field}] ${x.question}`));
    w("");
  }

  const ordenadas = (apps || [])
    .slice()
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    .slice(0, 30);

  w(`## Últimas ${ordenadas.length} aplicaciones`);
  if (!ordenadas.length) {
    w("_Sin aplicaciones registradas._");
  } else {
    ordenadas.forEach((a) => {
      w(
        `- ${a.fecha || "?"} | ${a.empresa || "?"} | ${a.puesto || "?"} | ${a.familia || "?"} | ${a.portal || "?"} | ${a.estado || "?"} | sal=${a.salario_pedido ?? "—"} | cv=${a.cv_usado || "—"}`
      );
    });
  }
  w("");
  w("---");
  w("Fin del contexto. Regenerar con `npm run claude` tras actualizar el perfil o las aplicaciones.");

  asegurarSalidas();
  const out = path.join(OUT_DIR, "archivo-maestro-claude.md");
  fs.writeFileSync(out, L.join("\n") + "\n", "utf8");
  console.log("=== Archivo Maestro — claude ===\n");
  console.log(`Salida: ${out}`);
  console.log(`Aplicaciones incluidas: ${ordenadas.length}`);
  console.log("Sube este .md a tu proyecto de Claude.");
}

main();
