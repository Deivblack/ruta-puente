#!/usr/bin/env node
"use strict";

/**
 * Importa un JSON de Archivo Maestro (p. ej. el perfil DM) a:
 *   data/perfil.local.json
 *   data/aplicaciones.local.json
 *
 * No inventa datos: completa solo estructura vacía requerida por el esquema
 * ("" / [] / null) y deja lo dudoso en pending.
 *
 * Uso:
 *   node scripts/importar-desde-upload.js /ruta/al/perfil.json
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT_PERFIL = path.join(ROOT, "data", "perfil.local.json");
const OUT_APPS = path.join(ROOT, "data", "aplicaciones.local.json");

const FAMILIAS = ["hr", "ld", "ta", "warehouse"];

function addrVacioEmp() {
  return { line1: "", city: "", state: "", country: "", zip: "" };
}

function bulletsCompletos(bf) {
  const out = { hr: [], ld: [], ta: [], warehouse: [] };
  if (!bf || typeof bf !== "object") return out;
  for (const f of FAMILIAS) {
    if (Array.isArray(bf[f])) out[f] = bf[f].slice();
  }
  return out;
}

function normalizarExperiencia(lista) {
  return (lista || []).map((raw, i) => {
    const addrSrc = raw.address && typeof raw.address === "object" ? raw.address : {};
    const exp = {
      id: raw.id || `exp${i + 1}`,
      employer: raw.employer || "",
      employer_context: raw.employer_context || "",
      employee_count: raw.employee_count || "",
      address: {
        line1: addrSrc.line1 || "",
        city: addrSrc.city || "",
        state: addrSrc.state || "",
        country: addrSrc.country || "",
        zip: addrSrc.zip || ""
      },
      country: raw.country || "",
      city: raw.city || "",
      title_original: raw.title_original || "",
      title_us_equivalent: raw.title_us_equivalent || "",
      start: raw.start || "",
      end: raw.end || "",
      reports_to: raw.reports_to || "",
      direct_reports: raw.direct_reports === undefined ? null : raw.direct_reports,
      supervisor_name: raw.supervisor_name || "",
      may_contact: raw.may_contact === undefined ? null : raw.may_contact,
      reason_for_leaving: raw.reason_for_leaving || "",
      bullets_by_family: bulletsCompletos(raw.bullets_by_family),
      achievements: Array.isArray(raw.achievements)
        ? raw.achievements.map((a) => ({
            text: a.text || "",
            metric: a.metric || "",
            source: a.source === "cv" || a.source === "candidate" ? a.source : "candidate",
            verified: Boolean(a.verified)
          }))
        : [],
      show_on_cv: Array.isArray(raw.show_on_cv)
        ? raw.show_on_cv.filter((f) => FAMILIAS.includes(f))
        : []
    };
    if (typeof raw.notes === "string" && raw.notes.trim()) {
      exp.notes = raw.notes;
    }
    return exp;
  });
}

function normalizarUsJobs(lista) {
  return (lista || []).map((raw) => ({
    employer: raw.employer || "",
    via_agency: raw.via_agency || "",
    title: raw.title || "",
    start: raw.start || "",
    show_on_cv: Array.isArray(raw.show_on_cv)
      ? raw.show_on_cv.filter((f) => FAMILIAS.includes(f))
      : [],
    ...(Array.isArray(raw.bullets) ? { bullets: raw.bullets.slice() } : {}),
    ...(raw.city ? { city: raw.city } : {})
  }));
}

function mapFamilyAnswer(f) {
  if (f === "all") return "general";
  if (FAMILIAS.includes(f) || f === "general" || f === "") return f || "";
  return "general";
}

function yearsKnown(v) {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  // Conserva el texto original (ej. "1+") en campo paralelo; el número queda pendiente.
  return null;
}

function importar(srcPath) {
  const raw = JSON.parse(fs.readFileSync(srcPath, "utf8"));
  const avisos = [];

  // --- applications fuera del perfil ---
  const apps = Array.isArray(raw.applications)
    ? raw.applications.map((a) => ({
        id: String(a.id),
        fecha: a.fecha || "",
        empresa: a.empresa || "",
        puesto: a.puesto || "",
        portal: a.portal || "",
        link: a.link || "",
        familia: a.familia || "",
        cv_usado: a.cv_usado || "",
        salario_pedido: a.salario_pedido === undefined ? null : a.salario_pedido,
        estado: a.estado || "enviada",
        fecha_estado: a.fecha_estado || a.fecha || "",
        notas: a.notas || ""
      }))
    : [];

  const pending = Array.isArray(raw.pending) ? raw.pending.slice() : [];

  // recruiting venía como "2-4" (rango, no número)
  const ybaSrc = (raw.standard_answers && raw.standard_answers.years_by_area) || {};
  let recruiting = null;
  if (typeof ybaSrc.recruiting === "number") {
    recruiting = ybaSrc.recruiting;
  } else if (typeof ybaSrc.recruiting === "string" && ybaSrc.recruiting.trim()) {
    avisos.push(
      `standard_answers.years_by_area.recruiting era "${ybaSrc.recruiting}" (rango). Queda null; se conserva en pending.`
    );
    if (!pending.some((p) => p.field === "standard_answers.years_by_area.recruiting")) {
      pending.push({
        field: "standard_answers.years_by_area.recruiting",
        question: `Confirmar número exacto de años en recruiting (en el archivo original: "${ybaSrc.recruiting}")`
      });
    }
  }

  const training =
    typeof ybaSrc.training === "number"
      ? ybaSrc.training
      : typeof ybaSrc.training_ld === "number"
        ? ybaSrc.training_ld
        : null;

  // years_known "1+" → null + nota en pending si no está
  const refs = (raw.references || []).map((r) => {
    const yk = yearsKnown(r.years_known);
    if (typeof r.years_known === "string" && r.years_known.trim() && yk === null) {
      if (!pending.some((p) => p.field === `references[${r.name}].years_known`)) {
        pending.push({
          field: `references[${r.name || "?"}].years_known`,
          question: `Años de conocerse: el original decía "${r.years_known}". ¿Número exacto?`
        });
      }
    }
    return {
      name: r.name || "",
      relationship: r.relationship || "",
      phone: r.phone || "",
      email: r.email || "",
      years_known: yk,
      country: r.country || "",
      ...(typeof r.years_known === "string" && r.years_known.trim()
        ? { years_known_note: r.years_known }
        : {})
    };
  });

  const headlines = (raw.profile_text && raw.profile_text.headlines) || {};
  const headline_en =
    (raw.profile_text && raw.profile_text.headline_en) ||
    headlines.linkedin ||
    headlines.hr ||
    headlines.ld ||
    "";

  const roleFamilies = (raw.targets && raw.targets.role_families) || [];
  const familiesNorm = roleFamilies.map((f) => ({
    id: f.id,
    name: f.name || "",
    keywords: Array.isArray(f.keywords) ? f.keywords.slice() : [],
    cv_version: FAMILIAS.includes(f.cv_version) ? f.cv_version : f.id,
    salary_floor: f.salary_floor === null || f.salary_floor === undefined ? null : f.salary_floor,
    salary_ask: f.salary_ask === null || f.salary_ask === undefined ? null : f.salary_ask,
    salary_ceiling:
      f.salary_ceiling === null || f.salary_ceiling === undefined ? null : f.salary_ceiling
  }));

  // Asegurar las 4 familias del contrato
  for (const id of FAMILIAS) {
    if (!familiesNorm.some((f) => f.id === id)) {
      familiesNorm.push({
        id,
        name: "",
        keywords: [],
        cv_version: id,
        salary_floor: null,
        salary_ask: null,
        salary_ceiling: null
      });
      avisos.push(`Faltaba familia "${id}" en role_families; se agregó vacía.`);
    }
  }

  const personalSrc = raw.personal || {};
  const eligSrc = raw.eligibility || {};
  const targetsSrc = raw.targets || {};
  const skillsSrc = raw.skills || {};
  const stdSrc = raw.standard_answers || {};
  const eeoSrc = stdSrc.eeo || {};

  const perfil = {
    schema_version: "1.1",
    updated_at: raw.updated_at || new Date().toISOString().slice(0, 10),
    personal: {
      legal_first_name: personalSrc.legal_first_name || "",
      middle_name: personalSrc.middle_name || "",
      legal_last_name: personalSrc.legal_last_name || "",
      preferred_name: personalSrc.preferred_name || "",
      email: personalSrc.email || "",
      phone_mobile: personalSrc.phone_mobile || "",
      linkedin_url: personalSrc.linkedin_url || "",
      date_of_birth: personalSrc.date_of_birth || "",
      nationality: personalSrc.nationality || "",
      address: {
        line1: (personalSrc.address && personalSrc.address.line1) || "",
        line2: (personalSrc.address && personalSrc.address.line2) || "",
        city: (personalSrc.address && personalSrc.address.city) || "",
        county: (personalSrc.address && personalSrc.address.county) || "",
        state: (personalSrc.address && personalSrc.address.state) || "",
        zip: (personalSrc.address && personalSrc.address.zip) || ""
      },
      origin_country: personalSrc.origin_country || ""
    },
    eligibility: {
      authorized_to_work_us: Boolean(eligSrc.authorized_to_work_us),
      requires_sponsorship: Boolean(eligSrc.requires_sponsorship),
      drivers_license: Boolean(eligSrc.drivers_license),
      has_vehicle: Boolean(eligSrc.has_vehicle),
      willing_to_relocate:
        eligSrc.willing_to_relocate === undefined ? null : eligSrc.willing_to_relocate,
      willing_to_travel_pct:
        eligSrc.willing_to_travel_pct === undefined ? null : eligSrc.willing_to_travel_pct
    },
    targets: {
      role_families: familiesNorm,
      search_zip: targetsSrc.search_zip || "",
      radius_miles:
        targetsSrc.radius_miles === undefined || targetsSrc.radius_miles === null
          ? 25
          : targetsSrc.radius_miles,
      work_mode: Array.isArray(targetsSrc.work_mode)
        ? targetsSrc.work_mode.filter((m) => ["onsite", "hybrid", "remote"].includes(m))
        : ["onsite", "hybrid", "remote"],
      schedule: targetsSrc.schedule === null || targetsSrc.schedule === undefined
        ? ""
        : targetsSrc.schedule,
      start_availability: targetsSrc.start_availability || "",
      notice_period: targetsSrc.notice_period || ""
    },
    experience: normalizarExperiencia(raw.experience),
    us_current_jobs: normalizarUsJobs(raw.us_current_jobs),
    education: (raw.education || []).map((e) => ({
      institution: e.institution || "",
      country: e.country || "",
      degree_original: e.degree_original || "",
      degree_us_equivalent: e.degree_us_equivalent || "",
      field: e.field || "",
      start: e.start || "",
      end: e.end || "",
      completed: Boolean(e.completed),
      credential_evaluation: ["none", "wes", "ece", "other"].includes(e.credential_evaluation)
        ? e.credential_evaluation
        : "none"
    })),
    certifications: (raw.certifications || []).map((c) => ({
      name: c.name || "",
      issuer: c.issuer || "",
      year: c.year || "",
      active: c.active === undefined ? null : c.active
    })),
    skills: {
      systems: Array.isArray(skillsSrc.systems) ? skillsSrc.systems.slice() : [],
      methodologies: Array.isArray(skillsSrc.methodologies)
        ? skillsSrc.methodologies.slice()
        : [],
      domains: Array.isArray(skillsSrc.domains) ? skillsSrc.domains.slice() : [],
      soft: Array.isArray(skillsSrc.soft) ? skillsSrc.soft.slice() : []
    },
    languages: (raw.languages || []).map((l) => ({
      language: l.language || "",
      level: ["native", "advanced", "intermediate", "basic", ""].includes(l.level)
        ? l.level
        : ""
    })),
    standard_answers: {
      years_total_experience:
        stdSrc.years_total_experience === undefined ? null : stdSrc.years_total_experience,
      years_by_area: {
        recruiting,
        training,
        hr_generalist:
          typeof ybaSrc.hr_generalist === "number" ? ybaSrc.hr_generalist : null,
        people_management:
          typeof ybaSrc.people_management === "number" ? ybaSrc.people_management : null
      },
      eeo: {
        gender: eeoSrc.gender || "",
        hispanic_latino:
          eeoSrc.hispanic_latino === undefined ? null : eeoSrc.hispanic_latino,
        race: eeoSrc.race || "",
        veteran: eeoSrc.veteran === undefined ? null : eeoSrc.veteran,
        disability: eeoSrc.disability === undefined ? null : eeoSrc.disability
      },
      how_did_you_hear_default: stdSrc.how_did_you_hear_default || "LinkedIn"
    },
    answer_bank: (raw.answer_bank || []).map((a) => ({
      id: a.id || "",
      question_pattern: a.question_pattern || "",
      family: mapFamilyAnswer(a.family),
      answer_en: a.answer_en || "",
      answer_es: a.answer_es || "",
      max_chars: typeof a.max_chars === "number" ? a.max_chars : 0,
      espanso_trigger: a.espanso_trigger || ""
    })),
    profile_text: {
      headline_en,
      summaries_en: Array.isArray(raw.profile_text && raw.profile_text.summaries_en)
        ? raw.profile_text.summaries_en
            .filter((s) => FAMILIAS.includes(s.family) || s.family === "")
            .map((s) => ({ family: s.family || "", text: s.text || "" }))
        : []
    },
    references: refs,
    portal_notes: (raw.portal_notes || []).map((p) => ({
      portal: p.portal || "",
      tips: Array.isArray(p.tips) ? p.tips.slice() : []
    })),
    pending
  };

  // Extensiones útiles del Archivo Maestro original (opcionales en el esquema)
  if (personalSrc.name_rule) perfil.personal.name_rule = personalSrc.name_rule;
  if (personalSrc.phone_public_on_linkedin !== undefined) {
    perfil.personal.phone_public_on_linkedin = personalSrc.phone_public_on_linkedin;
  }
  if (personalSrc.origin_city) perfil.personal.origin_city = personalSrc.origin_city;
  if (personalSrc.years_in_us !== undefined) perfil.personal.years_in_us = personalSrc.years_in_us;
  if (personalSrc.contact_preference) {
    perfil.personal.contact_preference = personalSrc.contact_preference;
  }
  if (personalSrc.emergency_contact) {
    perfil.personal.emergency_contact = {
      name: personalSrc.emergency_contact.name || "",
      relationship: personalSrc.emergency_contact.relationship || "",
      phone: personalSrc.emergency_contact.phone || ""
    };
  }
  if (personalSrc.old_ecuador_contact_data) {
    perfil.personal.old_ecuador_contact_data = personalSrc.old_ecuador_contact_data;
  }

  if (eligSrc.willing_to_travel !== undefined) {
    perfil.eligibility.willing_to_travel = eligSrc.willing_to_travel;
  }
  if (eligSrc.non_compete !== undefined) perfil.eligibility.non_compete = eligSrc.non_compete;
  if (eligSrc.background_check_consent !== undefined) {
    perfil.eligibility.background_check_consent = eligSrc.background_check_consent;
  }
  if (eligSrc.drug_screen_consent !== undefined) {
    perfil.eligibility.drug_screen_consent = eligSrc.drug_screen_consent;
  }
  if (eligSrc.forklift) perfil.eligibility.forklift = eligSrc.forklift;

  if (Array.isArray(targetsSrc.salary_rules)) {
    perfil.targets.salary_rules = targetsSrc.salary_rules.slice();
  }
  if (Array.isArray(targetsSrc.salary_bands_market)) {
    perfil.targets.salary_bands_market = targetsSrc.salary_bands_market.slice();
  }
  if (targetsSrc.max_commute_minutes !== undefined) {
    perfil.targets.max_commute_minutes = targetsSrc.max_commute_minutes;
  }

  if (Array.isArray(raw.us_current_jobs_rules)) {
    perfil.us_current_jobs_rules = raw.us_current_jobs_rules.slice();
  }
  if (Array.isArray(raw.courses)) perfil.courses = raw.courses.slice();
  if (Array.isArray(raw.extracurricular)) perfil.extracurricular = raw.extracurricular.slice();
  if (Array.isArray(skillsSrc.honesty_rules)) {
    perfil.skills.honesty_rules = skillsSrc.honesty_rules.slice();
  }

  // Conservar años extra (sin inventar); recruiting string ya manejado
  const yearsExtra = {};
  for (const [k, v] of Object.entries(ybaSrc)) {
    if (["recruiting", "training", "hr_generalist", "people_management", "training_ld"].includes(k)) {
      continue;
    }
    yearsExtra[k] = v;
  }
  if (typeof ybaSrc.training_ld === "number") {
    yearsExtra.training_ld = ybaSrc.training_ld;
  }
  if (typeof ybaSrc.recruiting === "string" && ybaSrc.recruiting.trim()) {
    yearsExtra.recruiting_range = ybaSrc.recruiting;
  }
  if (Object.keys(yearsExtra).length) {
    perfil.standard_answers.years_by_area_extra = yearsExtra;
  }
  if (stdSrc.experience_level) {
    perfil.standard_answers.experience_level = stdSrc.experience_level;
  }
  if (stdSrc.text_message_consent !== undefined) {
    perfil.standard_answers.text_message_consent = stdSrc.text_message_consent;
  }
  if (stdSrc.previously_worked_here !== undefined) {
    perfil.standard_answers.previously_worked_here = stdSrc.previously_worked_here;
  }
  if (stdSrc.relatives_at_company !== undefined) {
    perfil.standard_answers.relatives_at_company = stdSrc.relatives_at_company;
  }

  if (Object.keys(headlines).length) {
    perfil.profile_text.headlines = headlines;
  }
  if (raw.profile_text && raw.profile_text.competencies) {
    perfil.profile_text.competencies = raw.profile_text.competencies;
  }
  if (raw.profile_text && Array.isArray(raw.profile_text.positioning)) {
    perfil.profile_text.positioning = raw.profile_text.positioning.slice();
  }

  if (Array.isArray(raw.projects)) perfil.projects = raw.projects;
  if (Array.isArray(raw.cv_versions)) perfil.cv_versions = raw.cv_versions;
  if (raw.platforms && typeof raw.platforms === "object") perfil.platforms = raw.platforms;
  if (Array.isArray(raw.interview_rules)) perfil.interview_rules = raw.interview_rules.slice();
  if (Array.isArray(raw.applications_pending_account)) {
    perfil.applications_pending_account = raw.applications_pending_account.slice();
  }
  if (raw._nota) perfil._nota = raw._nota;

  fs.writeFileSync(OUT_PERFIL, JSON.stringify(perfil, null, 2) + "\n", "utf8");
  fs.writeFileSync(OUT_APPS, JSON.stringify(apps, null, 2) + "\n", "utf8");

  console.log(`Perfil local → ${OUT_PERFIL}`);
  console.log(`Aplicaciones local → ${OUT_APPS} (${apps.length} filas)`);
  console.log(`Pendientes: ${perfil.pending.length}`);
  if (avisos.length) {
    console.log("\nAvisos de importación:");
    avisos.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  }
  console.log(
    "\nImportante: estos archivos están en .gitignore (repo público). No se suben a GitHub."
  );
}

const src = process.argv[2];
if (!src) {
  console.error("Uso: node scripts/importar-desde-upload.js <archivo.json>");
  process.exit(1);
}
if (!fs.existsSync(src)) {
  console.error(`No encuentro: ${src}`);
  process.exit(1);
}
importar(path.resolve(src));
