import { procesarSolicitud } from "./generador.js";

self.addEventListener("message", (evento) => {
  self.postMessage(procesarSolicitud(evento.data));
});
