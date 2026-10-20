#!/usr/bin/env node
"use strict";

/**
 * Registra o actualiza aplicaciones.
 *
 *   npm run aplicacion -- add
 *   npm run aplicacion -- add --empresa "Acme" --puesto "Recruiter" --portal "LinkedIn" --familia ta --salario 70000
 *   npm run aplicacion -- estado <id> <estado>
 *   npm run aplicacion -- add --prueba   ← escribe en data/aplicaciones.prueba.json
 */

const readline = require("readline");
const {
  cargarAplicaciones,
  guardarAplicaciones,
  ESTADOS_APP,
  inferirBilingue
} = require("./lib/cargar");

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prueba") {
      out.prueba = true;
      continue;
    }
    if (a.startsWith("--") && a.includes("=")) {
      const [k, ...rest] = a.slice(2).split("=");
      out[k] = rest.join("=");
      continue;
    }
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out[k] = next;
        i++;
      } else {
        out[k] = true;
      }
      continue;
    }
    out._.push(a);
  }
  return out;
}

function preguntar(rl, etiqueta, def = "") {
  const suf = def !== "" && def != null ? ` [${def}]` : "";
  return new Promise((resolve) => {
    rl.question(`${etiqueta}${suf}: `, (ans) => {
      const t = (ans || "").trim();
      resolve(t === "" ? def : t);
    });
  });
}

function siguienteId(apps) {
  let max = 0;
  for (const a of apps) {
    const n = Number(a.id);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return String(max + 1);
}

async function comandoAdd(args) {
  const opts = { prueba: !!args.prueba };
  const { apps, ruta } = cargarAplicaciones(opts);

  const necesitaPrompt =
    !args.empresa || !args.puesto || !args.portal || !args.familia;

  let empresa = args.empresa || "";
  let puesto = args.puesto || "";
  let portal = args.portal || "";
  let link = args.link || "";
  let familia = (args.familia || "").toLowerCase();
  let salario = args.salario != null ? args.salario : args.salario_pedido;
  let cv = args.cv || args.cv_usado || "";
  let bilingueArg = args.bilingue;
  let notas = args.notas || "";

  let rl;
  if (necesitaPrompt && process.stdin.isTTY) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log("=== Nueva aplicación ===");
    if (opts.prueba) console.log("(modo prueba → data/aplicaciones.prueba.json)\n");
    empresa = await preguntar(rl, "Empresa", empresa);
    puesto = await preguntar(rl, "Puesto", puesto);
    portal = await preguntar(rl, "Portal (LinkedIn, Indeed…)", portal);
    link = await preguntar(rl, "Link (opcional)", link);
    familia = (await preguntar(rl, "Familia (ta/hr/ld/warehouse)", familia || "ta")).toLowerCase();
    salario = await preguntar(rl, "Salario pedido (solo dígitos, vacío = ninguno)", salario || "");
    cv = await preguntar(
      rl,
      "CV usado (hr/ld/ta/warehouse)",
      cv || (familia === "ta" ? "hr" : familia)
    );
    bilingueArg = await preguntar(rl, "¿Puesto bilingüe? (sí/no, vacío = detectar)", "");
    notas = await preguntar(rl, "Notas (opcional)", notas);
    rl.close();
  }

  if (!empresa || !puesto || !portal || !familia) {
    console.error(
      "Faltan datos. Uso interactivo: npm run aplicacion -- add\n" +
        "O con flags: --empresa --puesto --portal --familia [--salario] [--link] [--cv] [--prueba]"
    );
    process.exit(1);
  }

  const familiasOk = ["ta", "hr", "ld", "warehouse"];
  if (!familiasOk.includes(familia)) {
    console.error(`Familia no válida: ${familia}. Usa: ${familiasOk.join(", ")}`);
    process.exit(1);
  }

  let salarioNum = null;
  if (salario !== "" && salario != null) {
    const n = Number(String(salario).replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(n)) salarioNum = n;
  }

  const fecha = hoy();
  const bilingue = inferirBilingue(puesto, bilingueArg);
  const app = {
    id: siguienteId(apps),
    fecha,
    empresa,
    puesto,
    portal,
    link: link || "",
    familia,
    cv_usado: cv || (familia === "ta" ? "hr" : familia),
    salario_pedido: salarioNum,
    estado: "enviada",
    fecha_estado: fecha,
    notas: notas || "",
    bilingue
  };

  apps.push(app);
  const guardada = guardarAplicaciones(apps, opts);
  console.log("\nAplicación agregada:");
  console.log(`  id: ${app.id}`);
  console.log(`  ${app.fecha} · ${app.empresa} · ${app.puesto}`);
  console.log(`  familia=${app.familia} · portal=${app.portal} · bilingüe=${app.bilingue ? "sí" : "no"}`);
  console.log(`  Archivo: ${guardada} (total ${apps.length})`);
}

function comandoEstado(args) {
  const id = args._[1] || args.id;
  const estado = (args._[2] || args.estado || "").toLowerCase();
  if (!id || !estado) {
    console.error("Uso: npm run aplicacion -- estado <id> <estado>");
    console.error(`Estados: ${ESTADOS_APP.join(" | ")}`);
    process.exit(1);
  }
  if (!ESTADOS_APP.includes(estado)) {
    console.error(`Estado no válido: ${estado}`);
    console.error(`Usa: ${ESTADOS_APP.join(" | ")}`);
    process.exit(1);
  }

  const opts = { prueba: !!args.prueba };
  const { apps, ruta } = cargarAplicaciones(opts);
  const app = apps.find((a) => String(a.id) === String(id));
  if (!app) {
    console.error(`No encuentro id=${id} en ${ruta}`);
    process.exit(1);
  }
  const antes = app.estado;
  app.estado = estado;
  app.fecha_estado = hoy();
  guardarAplicaciones(apps, opts);
  console.log(`OK: id=${id}  ${antes} → ${estado}  (${app.fecha_estado})`);
  console.log(`   ${app.empresa} · ${app.puesto}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = (args._[0] || "").toLowerCase();

  if (cmd === "add" || cmd === "agregar") {
    await comandoAdd(args);
    return;
  }
  if (cmd === "estado" || cmd === "status") {
    comandoEstado(args);
    return;
  }

  console.log(`Uso:
  npm run aplicacion -- add
  npm run aplicacion -- add --empresa "Acme" --puesto "Recruiter" --portal LinkedIn --familia ta --salario 70000
  npm run aplicacion -- estado <id> <enviada|vista|entrevista|rechazada|cerrada|oferta>
  npm run aplicacion -- add --prueba     (archivo de prueba, no el real)
`);
  process.exit(cmd ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
