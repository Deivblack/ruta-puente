#!/usr/bin/env node
"use strict";

/**
 * Resume el embudo de aplicaciones.
 *
 *   npm run embudo
 *   npm run embudo -- --prueba
 */

const {
  cargarAplicaciones,
  ESTADOS_APP,
  inferirBilingue
} = require("./lib/cargar");

function parseArgs(argv) {
  return {
    prueba: argv.includes("--prueba") || process.env.RP_APPS_PRUEBA === "1"
  };
}

function diasEntre(desde, hasta) {
  const a = new Date(desde + "T12:00:00");
  const b = new Date(hasta + "T12:00:00");
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

function contar(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item) || "(vacío)";
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function pct(parte, total) {
  if (!total) return "0%";
  return `${Math.round((parte * 1000) / total) / 10}%`;
}

function imprimirTabla(titulo, filas, total) {
  console.log(`\n${titulo}`);
  if (!filas.length) {
    console.log("  (sin datos)");
    return;
  }
  for (const [k, n] of filas) {
    console.log(`  ${String(k).padEnd(28)} ${String(n).padStart(3)}  ${pct(n, total)}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { apps, ruta } = cargarAplicaciones({ prueba: args.prueba });
  const total = apps.length;
  const hoyStr = hoy();

  console.log("=== Archivo Maestro — embudo ===\n");
  console.log(`Archivo: ${ruta}${args.prueba ? " (PRUEBA)" : ""}`);
  console.log(`Fecha de corte: ${hoyStr}`);
  console.log(`Total aplicaciones: ${total}`);

  if (!total) {
    console.log("\nNo hay aplicaciones. Agrega con: npm run aplicacion -- add");
    return;
  }

  // Con respuesta = dejó de estar solo en "enviada" (hubo movimiento)
  const conRespuesta = apps.filter((a) => {
    const e = (a.estado || "").toLowerCase();
    return e && e !== "enviada";
  });
  const sinRespuesta = apps.filter((a) => (a.estado || "").toLowerCase() === "enviada");

  console.log(`Con respuesta (estado ≠ enviada): ${conRespuesta.length}  (${pct(conRespuesta.length, total)})`);
  console.log(`Aún en enviada: ${sinRespuesta.length}  (${pct(sinRespuesta.length, total)})`);

  imprimirTabla("Por estado", contar(apps, (a) => (a.estado || "").toLowerCase()), total);
  imprimirTabla("Por familia", contar(apps, (a) => (a.familia || "").toLowerCase()), total);
  imprimirTabla("Por portal", contar(apps, (a) => a.portal || ""), total);

  const bilingues = apps.map((a) => ({
    ...a,
    _bil: inferirBilingue(a.puesto, a.bilingue)
  }));
  imprimirTabla(
    "Bilingüe (sí/no)",
    contar(bilingues, (a) => (a._bil ? "sí" : "no")),
    total
  );

  // +10 días sin respuesta: estado enviada y fecha (o fecha_estado) hace >10 días
  const stale = sinRespuesta
    .map((a) => {
      const base = a.fecha_estado || a.fecha;
      const dias = diasEntre(base, hoyStr);
      return { a, dias, base };
    })
    .filter((x) => x.dias != null && x.dias > 10)
    .sort((x, y) => y.dias - x.dias);

  console.log(`\nSeguimiento: enviadas hace más de 10 días sin respuesta (${stale.length})`);
  if (!stale.length) {
    console.log("  Ninguna. Bien.");
  } else {
    for (const { a, dias, base } of stale) {
      console.log(
        `  · ${dias}d · id=${a.id} · ${base} · ${a.empresa} — ${a.puesto} (${a.portal || "?"})`
      );
    }
  }

  // Aviso estados fuera de lista
  const raros = apps.filter((a) => a.estado && !ESTADOS_APP.includes(String(a.estado).toLowerCase()));
  if (raros.length) {
    console.log(`\nAviso: ${raros.length} con estado fuera de la lista oficial:`);
    raros.forEach((a) => console.log(`  id=${a.id} estado="${a.estado}"`));
    console.log(`  Oficiales: ${ESTADOS_APP.join(" | ")}`);
  }

  console.log("");
}

main();
