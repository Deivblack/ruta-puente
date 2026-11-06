// Único lugar para los datos del taller del 20 de noviembre.
// Cambia aquí hora, lugar, dirección, apoyo y cupos. La página y el afiche leen esto.
const TALLER = {
  titulo: "¿Cómo se llama tu cargo en inglés?",
  subtitulo: "Taller gratuito de 90 minutos: tu cargo en inglés, un logro para el CV, tu presentación y un plan para esta semana.",
  fecha: "Viernes 20 de noviembre de 2026",
  hora: "2:00 p. m. – 3:30 p. m.",
  lugar: "Consulado General del Ecuador en Houston",
  direccion: "2603 Augusta Dr #810, Houston, TX 77057",
  modalidad: "Presencial",
  cupos: 0,                         // 0 = no cerrar el formulario; el aviso de cupos usa cuposLimitados
  cuposLimitados: true,
  apoyo: "Con el apoyo del Consulado de Ecuador en Houston", // solo en el copy de WhatsApp, no en las imágenes
  logoApoyo: "",
  whatsapp: "18322533555",          // preguntas; mismo número público de Ruta Puente
  inicioISO: "2026-11-20T14:00:00-06:00",
  finISO: "2026-11-20T15:30:00-06:00"
};

const TALLER_URL = "https://deivblack.github.io/ruta-puente/taller/";
const TALLER_URL_AFICHE = TALLER_URL + "?utm=afiche";
const TALLER_URL_CORTA = "deivblack.github.io/ruta-puente/taller/";

function tallerPendiente(v) {
  return !v || /\[POR CONFIRMAR\]/i.test(String(v));
}

function tallerEsBorrador() {
  return ["hora", "lugar", "direccion", "apoyo"].some(k => tallerPendiente(TALLER[k]));
}

function tallerWhatsappUrl(texto) {
  const n = String(TALLER.whatsapp || "").replace(/\D/g, "");
  if (!n) return "";
  const href = "https://wa.me/" + n;
  return texto ? href + "?text=" + encodeURIComponent(texto) : href;
}

function tallerWhatsappBonito() {
  const n = String(TALLER.whatsapp || "").replace(/\D/g, "");
  const diez = n.length === 11 && n.charAt(0) === "1" ? n.slice(1) : n;
  if (diez.length !== 10) return n;
  return diez.slice(0, 3) + "-" + diez.slice(3, 6) + "-" + diez.slice(6);
}

function tallerCalendarioUrl() {
  const utc = iso => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  };
  const text = encodeURIComponent(TALLER.titulo + " · Ruta Puente");
  const parts = [TALLER.subtitulo, "", "Gratis. Cupos limitados. Inscríbete: " + TALLER_URL];
  if (!tallerPendiente(TALLER.lugar)) parts.push("Lugar: " + TALLER.lugar);
  if (!tallerPendiente(TALLER.direccion)) parts.push("Dirección: " + TALLER.direccion);
  const details = encodeURIComponent(parts.join("\n"));
  const bits = [];
  if (!tallerPendiente(TALLER.lugar)) bits.push(TALLER.lugar);
  if (!tallerPendiente(TALLER.direccion)) bits.push(TALLER.direccion);
  const loc = encodeURIComponent(bits.join(", "));
  return "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + text +
    "&dates=" + utc(TALLER.inicioISO) + "/" + utc(TALLER.finISO) +
    "&details=" + details + (loc ? "&location=" + loc : "");
}

function tallerMapsUrl() {
  if (tallerPendiente(TALLER.direccion)) return "";
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(TALLER.direccion);
}

function tallerInvitarUrl() {
  const hora = tallerPendiente(TALLER.hora) ? "" : " · " + TALLER.hora;
  const lugar = tallerPendiente(TALLER.lugar) ? "" : " · " + TALLER.lugar;
  const msg = "Te invito al taller gratuito de Ruta Puente: \"" + TALLER.titulo +
    "\". " + TALLER.fecha + hora + lugar + ". Inscríbete aquí: " + TALLER_URL;
  return tallerWhatsappUrl(msg) || "https://wa.me/?text=" + encodeURIComponent(msg);
}
