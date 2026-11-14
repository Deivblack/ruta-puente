#!/usr/bin/env node
/**
 * Genera los PNG del taller 20 nov desde plantillas/lienzo.html.
 * Uso (desde la raíz del repo): npm run artes
 * No publica nada. El sitio público no depende de este script.
 */
import { chromium } from "playwright";
import QRCode from "qrcode";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import http from "http";

const raiz = join(dirname(fileURLToPath(import.meta.url)));
const repo = join(raiz, "..", "..");
const outDir = join(raiz, "artes");
const cal = JSON.parse(readFileSync(join(raiz, "calendario.json"), "utf8"));
const T = cal.taller;
const BASE = T.base_taller;

const FORMATOS = {
  historia: { w: 1080, h: 1920 },
  post: { w: 1080, h: 1350 },
  facebook: { w: 1080, h: 1080 }
};

const PROFESIONES = [
  { n: 1, es: "Contadora", en: "Staff Accountant" },
  { n: 2, es: "Ingeniero civil", en: "Project Engineer" },
  { n: 3, es: "Maestra", en: "Teacher Assistant / Bilingual Teacher" },
  { n: 4, es: "Administrador", en: "Operations Coordinator" },
  { n: 5, es: "Psicólogo organizacional", en: "HR Generalist" }
];

function piezas() {
  const list = [];
  const flyer = (archivo, formato, utm) =>
    list.push({ archivo, tipo: "flyer", formato, utm });
  flyer("flyer-historia.png", "historia", "whatsapp");
  flyer("flyer-post.png", "post", "instagram");
  flyer("flyer-facebook.png", "facebook", "facebook");
  flyer("flyer-historia-diana.png", "historia", "diana");
  flyer("flyer-post-diana.png", "post", "diana");
  flyer("flyer-facebook-diana.png", "facebook", "diana");

  const cuenta = (archivo, utm, extra) =>
    list.push({ archivo, tipo: "cuenta", formato: "historia", utm, ...extra });
  cuenta("cuenta-4dias-historia.png", "instagram", { numero: "4" });
  cuenta("cuenta-2dias-historia.png", "instagram", { numero: "2" });
  cuenta("cuenta-manana-historia.png", "instagram", { frase: "¡Es mañana!" });
  cuenta("cuenta-hoy-historia.png", "whatsapp", { frase: "¡Hoy!" });
  cuenta("cuenta-4dias-historia-diana.png", "diana", { numero: "4" });
  cuenta("cuenta-2dias-historia-diana.png", "diana", { numero: "2" });
  cuenta("cuenta-manana-historia-diana.png", "diana", { frase: "¡Es mañana!" });
  cuenta("cuenta-hoy-historia-diana.png", "diana", { frase: "¡Hoy!" });

  list.push({ archivo: "ultimos-historia.png", tipo: "ultimos", formato: "historia", utm: "whatsapp" });
  list.push({ archivo: "ultimos-post.png", tipo: "ultimos", formato: "post", utm: "instagram" });
  list.push({ archivo: "ultimos-historia-diana.png", tipo: "ultimos", formato: "historia", utm: "diana" });
  list.push({ archivo: "ultimos-post-diana.png", tipo: "ultimos", formato: "post", utm: "diana" });

  for (const p of PROFESIONES) {
    list.push({
      archivo: "carrusel-" + p.n + ".png",
      tipo: "carrusel",
      formato: "post",
      utm: "instagram",
      lamina: p.n,
      n: p.n,
      es: p.es,
      en: p.en
    });
  }
  list.push({
    archivo: "carrusel-6.png",
    tipo: "carrusel",
    formato: "post",
    utm: "instagram",
    lamina: 6
  });
  list.push({
    archivo: "carrusel-6-diana.png",
    tipo: "carrusel",
    formato: "post",
    utm: "diana",
    lamina: 6
  });

  list.push({ archivo: "gracias-historia.png", tipo: "gracias", formato: "historia", utm: "whatsapp" });
  list.push({ archivo: "gracias-historia-diana.png", tipo: "gracias", formato: "historia", utm: "diana" });
  return list;
}

function servir(root) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent((req.url || "/").split("?")[0]);
      let file = join(root, url === "/" ? "plantillas/lienzo.html" : url.replace(/^\//, ""));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end();
        return;
      }
      try {
        const data = readFileSync(file);
        const ext = file.split(".").pop();
        const tipos = { html: "text/html; charset=utf-8", css: "text/css", js: "text/javascript", svg: "image/svg+xml", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", json: "application/json" };
        res.writeHead(200, { "Content-Type": tipos[ext] || "application/octet-stream" });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const qrCache = {};
  async function qr(utm) {
    if (!qrCache[utm]) {
      const url = BASE + "?utm=" + utm;
      qrCache[utm] = await QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 560,
        color: { dark: "#1f2a26", light: "#ffffff" }
      });
    }
    return qrCache[utm];
  }

  const { server, port } = await servir(raiz);
  const browser = await chromium.launch({
    channel: "chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const page = await browser.newPage();
  const lista = piezas();
  const manifiesto = [];

  for (const p of lista) {
    const { w, h } = FORMATOS[p.formato];
    await page.setViewportSize({ width: w, height: h });
    await page.goto("http://127.0.0.1:" + port + "/plantillas/lienzo.html", { waitUntil: "networkidle" });
    await page.evaluate(async (data) => {
      await window.pintar(data);
      await document.fonts.ready;
    }, Object.assign({}, p, { taller: T, qr: await qr(p.utm) }));
    await page.waitForTimeout(180);
    const dest = join(outDir, p.archivo);
    await page.locator("#lienzo").screenshot({ path: dest, type: "png" });
    manifiesto.push({
      archivo: p.archivo,
      tipo: p.tipo,
      formato: p.formato,
      utm: p.utm,
      w, h
    });
    console.log("ok", p.archivo);
  }

  writeFileSync(join(raiz, "artes.json"), JSON.stringify({ taller: T, piezas: manifiesto }, null, 2) + "\n");
  await browser.close();
  server.close();
  console.log("Listos", lista.length, "PNG en", pathToFileURL(outDir).href);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
