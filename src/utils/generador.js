import {
  DIFICULTADES,
  copiarTablero,
  crearNotasVacias,
  crearAleatorioSembrado,
  crearPuzzleConResultado,
  generarTableroResuelto,
} from "./sudoku.js";
import {
  CRITERIOS_DIFICULTAD_LOGICA,
  cumpleDificultadLogica,
  evaluarDificultadLogica,
} from "./solucionador.js";

/**
 * Genera una partida completa; pensado para correr dentro del worker.
 * `semilla` es opcional: cuando se provee, una misma versión y opciones
 * producen las mismas decisiones de generación (no los tiempos medidos).
 */
export function generarPartida(nivel, { semilla } = {}) {
  const objetivoVacias = DIFICULTADES[nivel];
  if (objetivoVacias === undefined) {
    throw new Error(`Dificultad desconocida: ${nivel}`);
  }

  const nivelObjetivo = CRITERIOS_DIFICULTAD_LOGICA[nivel].nivel;
  const aleatorio =
    semilla === undefined ? Math.random : crearAleatorioSembrado(semilla);
  const tableroSolucion = generarTableroResuelto(aleatorio);
  const diagnostico = {};
  const resultado = crearPuzzleConResultado(tableroSolucion, objetivoVacias, {
    evaluar: evaluarDificultadLogica,
    aceptar: (evaluacion) => cumpleDificultadLogica(evaluacion, nivel),
    puntuar: (evaluacion) => {
      if (!evaluacion.resuelto || !evaluacion.verificado) {
        return Number.POSITIVE_INFINITY;
      }
      return Math.abs(evaluacion.nivel - nivelObjetivo);
    },
    aleatorio,
    diagnostico,
  });
  const puzzle = resultado.puzzle;
  // No iniciar una evaluación nueva si el presupuesto de generación ya se
  // agotó: sin evaluación no se puede atribuir una dificultad exacta.
  const evaluacion =
    resultado.evaluacion ??
    (resultado.presupuestoAgotado
      ? null
      : evaluarDificultadLogica(resultado.puzzle));
  const evaluacionInformada = evaluacion ?? {
    estado: "sin-evaluar",
    resuelto: false,
    nivel: null,
    nombre: "sin-evaluar",
    etiqueta: "Sin evaluar",
    verificado: false,
    tecnicas: [],
    pasos: 0,
    vaciasRestantes: null,
    ultimaTecnica: null,
  };

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
      estado: evaluacionInformada.estado,
      nivel: evaluacionInformada.nivel,
      nombre: evaluacionInformada.nombre,
      etiqueta: evaluacionInformada.etiqueta,
      verificado: evaluacionInformada.verificado,
      tecnicas: evaluacionInformada.tecnicas,
      pasos: evaluacionInformada.pasos,
      vacias: resultado.vacias,
      vaciasObjetivo: objetivoVacias,
      vaciasRestantes: evaluacionInformada.vaciasRestantes,
      ultimaTecnica: evaluacionInformada.ultimaTecnica,
      diagnostico,
    },
  };
}

/** Contrato de mensajes del worker: responde siempre con el mismo id. */
export function procesarSolicitud({ id, nivel, semilla } = {}) {
  try {
    return { id, partida: generarPartida(nivel, { semilla }) };
  } catch (error) {
    return { id, error: error.message };
  }
}
