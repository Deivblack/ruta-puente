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

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fila(label, value, meta) {
  const v = value == null ? "" : String(value);
  if (!v && !meta) return "";
  return `<div class="row" data-search="${esc((label + " " + v + " " + (meta || "")).toLowerCase())}">
  <div class="meta"><span class="label">${esc(label)}</span>${meta ? `<span class="tag">${esc(meta)}</span>` : ""}</div>
  <div class="val"><pre>${esc(v)}</pre>
  <button type="button" class="copy" data-copy="${esc(v)}">Copiar</button></div>
</div>`;
}

function seccion(titulo, html) {
  if (!html.trim()) return "";
  return `<section><h2>${esc(titulo)}</h2>${html}</section>`;
}

function main() {
  const { perfil, ruta } = cargarPerfil();
  const p = perfil.personal || {};
  const addr = p.address || {};
  const elig = perfil.eligibility || {};
  const std = perfil.standard_answers || {};
  const eeo = std.eeo || {};
  const yba = std.years_by_area || {};

  let personal = "";
  personal += fila("Preferred name", p.preferred_name);
  personal += fila("Legal first name", p.legal_first_name);
  personal += fila("Middle name", p.middle_name);
  personal += fila("Legal last name", p.legal_last_name);
  personal += fila("Form first+middle", `${p.legal_first_name || ""} ${p.middle_name || ""}`.trim());
  personal += fila("Email", p.email);
  personal += fila("Phone", p.phone_mobile);
  personal += fila("LinkedIn", p.linkedin_url);
  personal += fila("Date of birth", p.date_of_birth);
  personal += fila("Nationality", p.nationality);
  personal += fila("Origin country", p.origin_country);
  personal += fila("Address (full)", fmtDir(addr), ";dir");
  personal += fila("Street", addr.line1);
  personal += fila("Apt", addr.line2);
  personal += fila("City", addr.city);
  personal += fila("County", addr.county);
  personal += fila("State", addr.state);
  personal += fila("ZIP", addr.zip);
  if (p.name_rule) personal += fila("Name rule", p.name_rule);

  let eligH = "";
  eligH += fila("Authorized to work in US", elig.authorized_to_work_us ? "Yes" : "No");
  eligH += fila("Requires sponsorship", elig.requires_sponsorship ? "Yes" : "No");
  eligH += fila("Driver's license", elig.drivers_license ? "Yes" : "No");
  eligH += fila("Has vehicle", elig.has_vehicle ? "Yes" : "No");
  eligH += fila(
    "Willing to relocate",
    elig.willing_to_relocate == null ? "" : elig.willing_to_relocate ? "Yes" : "No"
  );
  eligH += fila(
    "Willing to travel %",
    elig.willing_to_travel_pct == null ? "" : String(elig.willing_to_travel_pct)
  );

  let sal = "";
  for (const id of ["ta", "hr", "ld", "warehouse"]) {
    const s = salarioFamilia(perfil, id);
    if (!s) continue;
    sal += fila(`${id} — ask`, s.ask == null ? "" : String(s.ask), s.name);
    sal += fila(`${id} — floor`, s.floor == null ? "" : String(s.floor));
    sal += fila(`${id} — ceiling`, s.ceiling == null ? "" : String(s.ceiling));
  }

  let stdH = "";
  stdH += fila("Years total experience", std.years_total_experience);
  for (const [k, v] of Object.entries(yba)) stdH += fila(`Years — ${k}`, v);
  stdH += fila("How did you hear (default)", std.how_did_you_hear_default);
  stdH += fila("EEO gender", eeo.gender);
  stdH += fila("EEO Hispanic/Latino", eeo.hispanic_latino == null ? "" : eeo.hispanic_latino ? "Yes" : "No");
  stdH += fila("EEO race", eeo.race);
  stdH += fila("EEO veteran", eeo.veteran == null ? "" : eeo.veteran ? "Yes" : "No");
  stdH += fila("EEO disability", eeo.disability == null ? "" : eeo.disability ? "Yes" : "No");

  let bank = "";
  for (const a of perfil.answer_bank || []) {
    const text = a.answer_en || a.answer_es || "";
    if (!text) continue;
    bank += fila(a.id, text, a.espanso_trigger || a.family || "");
  }

  let summaries = "";
  for (const s of (perfil.profile_text && perfil.profile_text.summaries_en) || []) {
    summaries += fila(`Summary ${s.family}`, s.text);
  }
  if (perfil.profile_text && perfil.profile_text.headline_en) {
    summaries =
      fila("Headline", perfil.profile_text.headline_en) + summaries;
  }

  let employers = "";
  for (const exp of perfil.experience || []) {
    const d = fmtDir(exp.address);
    if (!d) continue;
    employers += fila(`${exp.employer} (${exp.id})`, d, `;emp${exp.id}`);
  }

  let refs = "";
  for (const r of perfil.references || []) {
    const block = [r.name, r.relationship, r.phone, r.email, r.country]
      .filter(Boolean)
      .join(" · ");
    refs += fila(r.name || "Reference", block);
  }

  let portals = "";
  for (const n of perfil.portal_notes || []) {
    portals += fila(n.portal, (n.tips || []).join("\n"));
  }

  const body =
    seccion("Personal", personal) +
    seccion("Eligibility", eligH) +
    seccion("Salary by family", sal) +
    seccion("Standard answers", stdH) +
    seccion("Answer bank", bank) +
    seccion("Profile text", summaries) +
    seccion("Employer addresses", employers) +
    seccion("References", refs) +
    seccion("Portal tips", portals);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Respuestas rápidas — Archivo Maestro</title>
<style>
  :root { --verde:#2e7d5b; --sol:#e8b04b; --fondo:#f5f7f4; --texto:#1f2a26; --gris:#5d6c66; --linea:#dde5e0; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: Nunito, system-ui, sans-serif; background:var(--fondo); color:var(--texto); }
  header { position:sticky; top:0; background:#fff; border-bottom:1px solid var(--linea); padding:12px 16px; z-index:2; }
  h1 { font-family: "Bricolage Grotesque", Georgia, serif; font-size:1.25rem; margin:0 0 8px; }
  .sub { color:var(--gris); font-size:.85rem; margin-bottom:10px; }
  #q { width:100%; max-width:520px; font-size:1rem; padding:12px 14px; border:1px solid var(--linea); border-radius:10px; }
  main { padding:16px; max-width:800px; margin:0 auto; }
  section { margin-bottom:28px; }
  h2 { font-size:1rem; color:var(--verde); margin:0 0 10px; text-transform:uppercase; letter-spacing:.04em; }
  .row { background:#fff; border:1px solid var(--linea); border-radius:12px; padding:12px; margin-bottom:10px; }
  .row.hide { display:none; }
  .meta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:6px; }
  .label { font-weight:700; font-size:.9rem; }
  .tag { font-size:.75rem; color:var(--gris); background:#e1efe7; padding:2px 8px; border-radius:6px; }
  .val { display:flex; gap:10px; align-items:flex-start; }
  pre { margin:0; flex:1; white-space:pre-wrap; word-break:break-word; font-family:inherit; font-size:.95rem; }
  .copy { flex-shrink:0; background:var(--verde); color:#fff; border:0; border-radius:10px; padding:10px 14px; font-size:.9rem; font-weight:700; cursor:pointer; min-height:44px; }
  .copy:active { transform:scale(.98); }
  .copy.ok { background:#1b5e3b; }
  .toast { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); background:#1f2a26; color:#fff; padding:10px 16px; border-radius:999px; font-size:.9rem; opacity:0; transition:opacity .2s; pointer-events:none; }
  .toast.show { opacity:1; }
</style>
</head>
<body>
<header>
  <h1>Respuestas rápidas</h1>
  <p class="sub">Archivo Maestro · generado ${esc(perfil.updated_at || "")} · sin internet · fuente: ${esc(path.basename(ruta))}</p>
  <input id="q" type="search" placeholder="Buscar (nombre, salario, ;dir, SuccessFactors…)" autocomplete="off">
</header>
<main>${body}</main>
<div class="toast" id="toast">Copiado</div>
<script>
(function(){
  var q = document.getElementById("q");
  var rows = Array.prototype.slice.call(document.querySelectorAll(".row"));
  var toast = document.getElementById("toast");
  function filtrar(){
    var t = (q.value || "").toLowerCase().trim();
    rows.forEach(function(r){
      var hay = !t || (r.getAttribute("data-search") || "").indexOf(t) !== -1;
      r.classList.toggle("hide", !hay);
    });
  }
  q.addEventListener("input", filtrar);
  document.addEventListener("click", function(ev){
    var btn = ev.target.closest(".copy");
    if (!btn) return;
    var text = btn.getAttribute("data-copy") || "";
    function ok(){
      btn.classList.add("ok");
      btn.textContent = "Listo";
      toast.classList.add("show");
      setTimeout(function(){ btn.classList.remove("ok"); btn.textContent = "Copiar"; toast.classList.remove("show"); }, 900);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(function(){
        var ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); ok(); } catch(e) {}
        document.body.removeChild(ta);
      });
    } else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });
})();
</script>
</body>
</html>
`;

  asegurarSalidas();
  const out = path.join(require("./lib/cargar").OUT_DIR, "respuestas-rapidas.html");
  fs.writeFileSync(out, html, "utf8");
  console.log("=== Archivo Maestro — hoja ===\n");
  console.log(`Salida: ${out}`);
  console.log("Ábrela en el navegador (doble clic). Funciona sin internet.");
}

main();
