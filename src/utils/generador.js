import {
  DIFICULTADES,
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

  // resultado.alcanzado ya exige el objetivo de vacías y cumpleDificultadLogica.
  // La etiqueta es solo informativa: no decide la aceptación.
  const alcanzada = resultado.alcanzado;

  return {
    tableroSolucion,
    tableroJuego: copiarTablero(puzzle),
    celdasFijas: puzzle.map((fila) => fila.map((valor) => valor !== 0)),
    notas: crearNotasVacias(),
    dificultadLogica: {
      solicitada: nivel,
      alcanzada,
      motivo: resultado.motivo,
      estado: evaluacion.estado,
      nivel: evaluacion.nivel,
      nombre: evaluacion.nombre,
      etiqueta: evaluacion.etiqueta,
      verificado: evaluacion.verificado,
      tecnicas: evaluacion.tecnicas,
      pasos: evaluacion.pasos,
      vacias: resultado.vacias,
      vaciasObjetivo: objetivoVacias,
      vaciasRestantes: evaluacion.vaciasRestantes,
      ultimaTecnica: evaluacion.ultimaTecnica,
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
