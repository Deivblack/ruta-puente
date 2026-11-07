// Único lugar para los datos del taller del 13 de noviembre.
// Cambia aquí hora, lugar, dirección, apoyo y cupos. La página y el afiche leen esto.
const TALLER = {
  titulo: "¿Cómo se llama tu cargo en inglés?",
  subtitulo: "Taller gratuito para profesionales latinos: tu cargo en EE. UU. y tu CV listo para aplicar",
  fecha: "Viernes 13 de noviembre de 2026",
  hora: "[POR CONFIRMAR]",          // ej. "6:30 p. m. – 8:00 p. m."
  lugar: "[POR CONFIRMAR]",         // nombre del lugar
  direccion: "[POR CONFIRMAR]",     // dirección para Google Maps
  modalidad: "Presencial",          // o "Presencial y en línea"
  cupos: 0,                         // 0 = sin límite; si es > 0, mostrar "cupos limitados" y cerrar al llenarse
  apoyo: "[POR CONFIRMAR]",         // texto de aliados, solo si lo aprueban
  inicioISO: "2026-11-13T18:30:00-06:00", // botón de calendario; actualizar con la hora real
  finISO: "2026-11-13T20:00:00-06:00"
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

function tallerCalendarioUrl() {
  const utc = iso => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  };
  const text = encodeURIComponent(TALLER.titulo + " · Ruta Puente");
  const details = encodeURIComponent(
    TALLER.subtitulo + "\n\nGratis. Inscríbete: " + TALLER_URL
  );
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
  const hora = tallerPendiente(TALLER.hora) ? "" : " a las " + TALLER.hora;
  const lugar = tallerPendiente(TALLER.lugar) ? "" : " en " + TALLER.lugar;
  const msg = "Te invito al taller gratuito de Ruta Puente: \"" + TALLER.titulo +
    "\". " + TALLER.fecha + hora + lugar + ". Inscríbete aquí: " + TALLER_URL;
  return "https://wa.me/?text=" + encodeURIComponent(msg);
}
