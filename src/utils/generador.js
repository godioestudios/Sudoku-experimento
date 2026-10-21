import {
  DIFICULTADES,
  copiarTablero,
  crearNotasVacias,
  crearPuzzle,
  generarTableroResuelto,
} from "./sudoku.js";

/** Genera una partida completa; pensado para correr dentro del worker. */
export function generarPartida(nivel) {
  const objetivoVacias = DIFICULTADES[nivel];
  if (objetivoVacias === undefined) {
    throw new Error(`Dificultad desconocida: ${nivel}`);
  }

  const tableroSolucion = generarTableroResuelto();
  const puzzle = crearPuzzle(tableroSolucion, objetivoVacias);

  return {
    tableroSolucion,
    tableroJuego: copiarTablero(puzzle),
    celdasFijas: puzzle.map((fila) => fila.map((valor) => valor !== 0)),
    notas: crearNotasVacias(),
  };
}

/** Contrato de mensajes del worker: responde siempre con el mismo id. */
export function procesarSolicitud({ id, nivel } = {}) {
  try {
    return { id, partida: generarPartida(nivel) };
  } catch (error) {
    return { id, error: error.message };
  }
}
