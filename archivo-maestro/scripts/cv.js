#!/usr/bin/env node
"use strict";

/**
 * Genera salidas/CV_<familia>.docx en inglés (ATS: una columna, sin tablas ni imágenes).
 *
 * Uso:
 *   npm run cv -- hr
 *   npm run cv -- ld
 *   npm run cv -- ta
 *   npm run cv -- warehouse
 *   npm run cv -- all
 */

const fs = require("fs");
const path = require("path");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition
} = require("docx");

const ROOT = path.join(__dirname, "..");
const PERFIL_LOCAL = path.join(ROOT, "data", "perfil.local.json");
const PERFIL_PUBLICO = path.join(ROOT, "data", "perfil.json");
const OUT_DIR = path.join(ROOT, "salidas");

const FAMILIAS = ["hr", "ld", "ta", "warehouse"];
const MESES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function cargarPerfil() {
  const ruta = fs.existsSync(PERFIL_LOCAL) ? PERFIL_LOCAL : PERFIL_PUBLICO;
  return {
    perfil: JSON.parse(fs.readFileSync(ruta, "utf8")),
    ruta
  };
}

function fmtMes(ym) {
  if (!ym) return "";
  if (ym === "present") return "Present";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const mes = MESES[Number(m[2]) - 1] || m[2];
  return `${mes} ${m[1]}`;
}

function rango(start, end) {
  const a = fmtMes(start);
  const b = fmtMes(end || "");
  if (a && b) return `${a} – ${b}`;
  return a || b || "";
}

function nivelIdioma(level) {
  const map = {
    native: "Native",
    advanced: "Advanced",
    intermediate: "Intermediate",
    basic: "Basic"
  };
  return map[level] || level || "";
}

function resolverFamiliaContenido(perfil, familia) {
  const rf = (perfil.targets && perfil.targets.role_families) || [];
  const entry = rf.find((f) => f.id === familia);
  const cvVersion = entry && FAMILIAS.includes(entry.cv_version) ? entry.cv_version : familia;
  return { pedida: familia, contenido: cvVersion };
}

function resumenPara(perfil, familia, contenido) {
  const sums = (perfil.profile_text && perfil.profile_text.summaries_en) || [];
  const directo = sums.find((s) => s.family === familia && s.text);
  if (directo) return directo.text;
  if (familia === "ta") {
    const bank = (perfil.answer_bank || []).find((a) => a.id === "summary_ta" && a.answer_en);
    if (bank) return bank.answer_en;
  }
  const fallback = sums.find((s) => s.family === contenido && s.text);
  return fallback ? fallback.text : "";
}

function headlinePara(perfil, familia, contenido) {
  const headlines = (perfil.profile_text && perfil.profile_text.headlines) || {};
  if (headlines[familia]) return headlines[familia];
  if (headlines[contenido]) return headlines[contenido];
  return (perfil.profile_text && perfil.profile_text.headline_en) || "";
}

function empleosParaCv(perfil, familiaShow, familiaPedida) {
  const exps = (perfil.experience || [])
    .filter((e) => Array.isArray(e.show_on_cv) && e.show_on_cv.includes(familiaShow))
    .map((e) => {
      const bf = e.bullets_by_family || {};
      const primarios = Array.isArray(bf[familiaPedida]) ? bf[familiaPedida] : [];
      const respaldo = Array.isArray(bf[familiaShow]) ? bf[familiaShow] : [];
      const bullets = (primarios.length ? primarios : respaldo).slice();
      return {
        kind: "experience",
        sortStart: e.start || "",
        employer: e.employer || "",
        context: e.employer_context || "",
        title: e.title_us_equivalent || e.title_original || "",
        location: [e.city, e.country].filter(Boolean).join(", "),
        dates: rango(e.start, e.end),
        bullets
      };
    });

  const us = (perfil.us_current_jobs || [])
    .filter((j) => Array.isArray(j.show_on_cv) && j.show_on_cv.includes(familiaShow))
    .map((j) => ({
      kind: "us",
      sortStart: j.start || "9999-99",
      employer: j.employer || "",
      context: j.via_agency ? `via ${j.via_agency}` : "",
      title: j.title || "",
      location: j.city || "",
      dates: rango(j.start, j.start ? "present" : ""),
      bullets: Array.isArray(j.bullets) ? j.bullets.slice() : []
    }));

  return [...us, ...exps].sort((a, b) => (a.sortStart < b.sortStart ? 1 : -1));
}

function lineaSeparadora() {
  return new Paragraph({
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "888888", space: 1 }
    },
    spacing: { after: 120 }
  });
}

function heading(texto) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [
      new TextRun({
        text: texto.toUpperCase(),
        bold: true,
        size: 22, // 11 pt
        font: "Calibri",
        color: "1F2A26"
      })
    ]
  });
}

function parrafo(texto, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 80 },
    alignment: opts.align || AlignmentType.LEFT,
    children: [
      new TextRun({
        text: texto,
        size: opts.size || 20, // 10 pt
        font: "Calibri",
        bold: !!opts.bold,
        italics: !!opts.italics,
        color: opts.color || "1F2A26"
      })
    ]
  });
}

function bullet(texto) {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 288 },
    children: [
      new TextRun({ text: "•  ", size: 20, font: "Calibri" }),
      new TextRun({ text: texto, size: 20, font: "Calibri", color: "1F2A26" })
    ]
  });
}

function jobHeader(job) {
  const linea1 = new Paragraph({
    spacing: { before: 120, after: 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({
        text: job.title || job.employer,
        bold: true,
        size: 21,
        font: "Calibri"
      }),
      new TextRun({ text: "\t", font: "Calibri" }),
      new TextRun({
        text: job.dates,
        size: 19,
        font: "Calibri",
        color: "5D6C66"
      })
    ]
  });

  const meta = [job.employer, job.context, job.location].filter(Boolean).join("  |  ");
  const linea2 = parrafo(meta, { after: 40, size: 19, italics: true, color: "5D6C66" });
  return [linea1, linea2];
}

function construirDocumento(perfil, familia) {
  const { pedida, contenido } = resolverFamiliaContenido(perfil, familia);
  // Empleos: show_on_cv de la versión de CV (ej. ta → hr). Bullets: familia pedida, con respaldo.
  const jobs = empleosParaCv(perfil, contenido, pedida);

  const personal = perfil.personal || {};
  const nombre = personal.preferred_name ||
    [personal.legal_first_name, personal.legal_last_name].filter(Boolean).join(" ") ||
    "Curriculum Vitae";

  const contactParts = [
    personal.email,
    personal.phone_mobile,
    personal.linkedin_url,
    [personal.address && personal.address.city, personal.address && personal.address.state]
      .filter(Boolean)
      .join(", ")
  ].filter(Boolean);

  const summary = resumenPara(perfil, pedida, contenido);
  const headline = headlinePara(perfil, pedida, contenido);

  const skills = perfil.skills || {};
  const skillLine = [
    ...(skills.systems || []),
    ...(skills.methodologies || []),
    ...(skills.domains || []).slice(0, 8)
  ].filter(Boolean);

  const soft = skills.soft || [];
  const langs = (perfil.languages || [])
    .map((l) => `${l.language} (${nivelIdioma(l.level)})`)
    .join("  ·  ");

  const certs = (perfil.certifications || []).filter((c) => c.active !== false && c.name);
  const education = perfil.education || [];

  const children = [];

  // Nombre
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: nombre,
          bold: true,
          size: 32, // 16 pt
          font: "Calibri",
          color: "1F2A26"
        })
      ]
    })
  );

  if (headline) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: headline,
            size: 20,
            font: "Calibri",
            color: "2E7D5B"
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: contactParts.join("  ·  "),
          size: 18,
          font: "Calibri",
          color: "5D6C66"
        })
      ]
    })
  );

  children.push(lineaSeparadora());

  if (summary) {
    children.push(heading("Professional summary"));
    children.push(parrafo(summary, { after: 120 }));
  }

  children.push(heading("Experience"));
  if (!jobs.length) {
    children.push(
      parrafo("(No roles marked for this CV version in show_on_cv.)", {
        italics: true,
        color: "5D6C66"
      })
    );
  }
  for (const job of jobs) {
    children.push(...jobHeader(job));
    for (const b of job.bullets) {
      if (b && String(b).trim()) children.push(bullet(String(b).trim()));
    }
  }

  if (education.length) {
    children.push(heading("Education"));
    for (const edu of education) {
      const grado = [edu.degree_us_equivalent, edu.field].filter(Boolean).join(", ");
      const inst = [edu.institution, edu.country].filter(Boolean).join(" — ");
      const fechas = rango(edu.start, edu.end);
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 0 },
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: grado || edu.degree_original || "", bold: true, size: 20, font: "Calibri" }),
            new TextRun({ text: "\t", font: "Calibri" }),
            new TextRun({ text: fechas, size: 18, font: "Calibri", color: "5D6C66" })
          ]
        })
      );
      if (edu.degree_original && edu.degree_us_equivalent &&
          edu.degree_original !== edu.degree_us_equivalent) {
        children.push(parrafo(edu.degree_original, { size: 18, italics: true, color: "5D6C66", after: 20 }));
      }
      children.push(parrafo(inst, { size: 19, after: 60 }));
    }
  }

  if (certs.length) {
    children.push(heading("Certifications"));
    for (const c of certs) {
      const bits = [c.name, c.issuer, c.year].filter(Boolean).join("  ·  ");
      children.push(parrafo(bits, { after: 40 }));
    }
  }

  if (skillLine.length || soft.length) {
    children.push(heading("Skills"));
    if (skillLine.length) {
      children.push(parrafo(skillLine.join("  ·  "), { after: 60 }));
    }
    if (soft.length) {
      children.push(parrafo(soft.join("  ·  "), { after: 60, color: "5D6C66" }));
    }
  }

  if (langs) {
    children.push(heading("Languages"));
    children.push(parrafo(langs, { after: 40 }));
  }

  return new Document({
    creator: nombre,
    title: `CV — ${nombre} — ${pedida.toUpperCase()}`,
    description: `Generated from Archivo Maestro (${pedida})`,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 } // 0.5"
          }
        },
        children
      }
    ]
  });
}

async function generarUno(perfil, familia) {
  if (!FAMILIAS.includes(familia)) {
    throw new Error(`Familia no válida: ${familia}. Usa: ${FAMILIAS.join(", ")}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const doc = construirDocumento(perfil, familia);
  const buffer = await Packer.toBuffer(doc);
  const out = path.join(OUT_DIR, `CV_${familia}.docx`);
  fs.writeFileSync(out, buffer);
  return out;
}

async function main() {
  const arg = (process.argv[2] || "").toLowerCase();
  if (!arg) {
    console.error("Uso: npm run cv -- <hr|ld|ta|warehouse|all>");
    process.exit(1);
  }

  const { perfil, ruta } = cargarPerfil();
  console.log("=== Archivo Maestro — cv ===\n");
  console.log(`Perfil: ${ruta}`);
  console.log(`Nombre: ${perfil.personal && perfil.personal.preferred_name}\n`);

  const lista = arg === "all" ? FAMILIAS : [arg];
  const generados = [];
  for (const f of lista) {
    const { pedida, contenido } = resolverFamiliaContenido(perfil, f);
    const out = await generarUno(perfil, f);
    const jobs = empleosParaCv(perfil, contenido, pedida);
    console.log(
      `CV_${f}.docx ← familia ${pedida}` +
        (pedida !== contenido ? ` (empleos/bullets base: ${contenido})` : "") +
        ` · ${jobs.length} rol(es) · ${out}`
    );
    generados.push(out);
  }

  console.log(`\nListo: ${generados.length} archivo(s) en salidas/`);
  console.log("Ábrelos en Word y revisa que se vean bien (1–2 páginas, ATS).");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
