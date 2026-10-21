import {
  DIFICULTADES,
  NOMBRES_DIFICULTAD,
  copiarTablero,
  crearNotasVacias,
  crearPuzzleConResultado,
  generarTableroResuelto,
} from "./sudoku.js";
import {
  cumpleDificultadLogica,
  evaluarDificultadLogica,
} from "./solucionador.js";

/** Genera una partida completa; pensado para correr dentro del worker. */
export function generarPartida(nivel) {
  const objetivoVacias = DIFICULTADES[nivel];
  if (objetivoVacias === undefined) {
    throw new Error(`Dificultad desconocida: ${nivel}`);
  }

  const tableroSolucion = generarTableroResuelto();
  const resultado = crearPuzzleConResultado(tableroSolucion, objetivoVacias, {
    evaluar: evaluarDificultadLogica,
    aceptar: (evaluacion) => cumpleDificultadLogica(evaluacion, nivel),
  });
  const puzzle = resultado.puzzle;
  const evaluacion =
    resultado.evaluacion ?? evaluarDificultadLogica(resultado.puzzle);

  // Solo se garantiza el nivel pedido si la etiqueta del motor coincide.
  // Un puzzle "Avanzado (sin verificar)" no es un Experto garantizado.
  const alcanzada =
    resultado.alcanzado && evaluacion.etiqueta === NOMBRES_DIFICULTAD[nivel];
  const motivo =
    resultado.alcanzado && !alcanzada ? "dificultad" : resultado.motivo;

  return {
    tableroSolucion,
    tableroJuego: copiarTablero(puzzle),
    celdasFijas: puzzle.map((fila) => fila.map((valor) => valor !== 0)),
    notas: crearNotasVacias(),
    dificultadLogica: {
      solicitada: nivel,
      alcanzada,
      motivo,
      nivel: evaluacion.nivel,
      nombre: evaluacion.nombre,
      etiqueta: evaluacion.etiqueta,
      verificado: evaluacion.verificado,
      tecnicas: evaluacion.tecnicas,
      vacias: resultado.vacias,
      vaciasObjetivo: objetivoVacias,
    },
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
