// Único lugar para los datos del taller del 20 de noviembre.
// Cambia aquí hora, lugar, dirección, apoyo y cupos. La página, el afiche y el kit leen esto.
const TALLER = {
  titulo: "Vuelve a lo tuyo",
  subtitulo: "Taller gratuito: cómo volver a trabajar en tu profesión en Estados Unidos",
  fecha: "Viernes 20 de noviembre de 2026",
  hora: "2:00 p. m. – 3:30 p. m.",
  lugar: "Consulado General del Ecuador en Houston",
  direccion: "2603 Augusta Dr #810, Houston, TX 77057",
  modalidad: "Presencial",
  cupos: 13,                        // 10 sillas; 13 cierra la inscripción (inasistencias). 0 = sin límite
  apoyo: "Con el apoyo del Consulado de Ecuador en Houston", // solo en mensajes; no va en el afiche
  estacionamiento: "[POR CONFIRMAR]",
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
  return ["hora", "lugar", "direccion"].some(k => tallerPendiente(TALLER[k]));
}

function tallerApoyoConfirmado() {
  return !tallerPendiente(TALLER.apoyo);
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
