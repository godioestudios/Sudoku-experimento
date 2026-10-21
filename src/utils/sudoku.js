/**
 * ============================================================
 *  SUDOKU — Algoritmo puro
 * ============================================================
 *  Tablero = array 9x9. Cada celda guarda un número del 1 al 9,
 *  o 0 si está vacía.
 * ============================================================
 */

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------

export const TAMAÑO = 9;
export const TAMAÑO_CAJA = 3;
export const VALORES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Casillas que se dejan vacías según la dificultad
export const DIFICULTADES = {
  facil: 36,
  medio: 45,
  dificil: 52,
  experto: 56,
};

// Nombre visible de cada dificultad
export const NOMBRES_DIFICULTAD = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
  experto: "Experto",
};

// ============================================================
// 1. VALIDEZ Y RESOLUCIÓN
// ============================================================

/**
 * Comprueba si es válido colocar un número en una posición.
 * Reglas: no repetir en fila, columna ni caja 3x3.
 */
export function esValido(tablero, fila, columna, numero) {
  // Regla 1: no repetir en la fila
  for (let i = 0; i < TAMAÑO; i++) {
    if (tablero[fila][i] === numero) return false;
  }

  // Regla 2: no repetir en la columna
  for (let i = 0; i < TAMAÑO; i++) {
    if (tablero[i][columna] === numero) return false;
  }

  // Regla 3: no repetir en la caja 3x3
  const inicioFila = Math.floor(fila / TAMAÑO_CAJA) * TAMAÑO_CAJA;
  const inicioColumna = Math.floor(columna / TAMAÑO_CAJA) * TAMAÑO_CAJA;
  for (let i = 0; i < TAMAÑO_CAJA; i++) {
    for (let j = 0; j < TAMAÑO_CAJA; j++) {
      if (tablero[inicioFila + i][inicioColumna + j] === numero) return false;
    }
  }

  return true; // Respeta todas las reglas
}

/**
 * Busca la primera casilla vacía (0), fila por fila.
 * @returns [fila, columna] o null si el tablero está completo.
 */
export function buscarCasillaVacia(tablero) {
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] === 0) return [fila, columna];
    }
  }
  return null;
}

/**
 * Resuelve el Sudoku con backtracking (recursión + vuelta atrás).
 */
export function resolverSudoku(tablero) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true; // Sin huecos: resuelto

  const [fila, columna] = casilla;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;

      if (resolverSudoku(tablero)) return true; // Seguir por este camino

      tablero[fila][columna] = 0; // Backtrack: deshacer y probar otro
    }
  }

  return false; // Ningún número sirve: retroceder
}

/**
 * Cuenta soluciones del tablero (se detiene al llegar al límite).
 * Sirve para verificar que un puzzle tiene solución única.
 */
export function contarSoluciones(tablero, limite = 2) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return 1; // Encontré una solución completa

  const [fila, columna] = casilla;
  let total = 0;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      total += contarSoluciones(tablero, limite - total);
      tablero[fila][columna] = 0; // Restaurar
      if (total >= limite) return total;
    }
  }

  return total;
}

// ============================================================
// 2. GENERACIÓN
// ============================================================

/** Copia profunda de un tablero 9x9. */
export function copiarTablero(tablero) {
  return tablero.map((fila) => [...fila]);
}

/** Mezcla aleatoria de un array (algoritmo Fisher-Yates). */
export function mezclar(array, aleatorio = Math.random) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Rellena un tablero vacío por completo usando backtracking,
 * probando los números en orden aleatorio.
 */
export function rellenarTablero(tablero) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true;

  const [fila, columna] = casilla;

  for (const numero of mezclar([...VALORES])) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      if (rellenarTablero(tablero)) return true;
      tablero[fila][columna] = 0; // Backtrack
    }
  }
  return false;
}

/** Crea un tablero 9x9 válido y completo. */
export function generarTableroResuelto() {
  const tablero = Array.from({ length: TAMAÑO }, () => Array(TAMAÑO).fill(0));
  rellenarTablero(tablero);
  return tablero;
}

/**
 * Un intento de vaciado: recorre las posiciones en orden aleatorio y
 * vacía cada casilla solo si el puzzle sigue teniendo solución única.
 *
 * Como al quitar pistas solo se pueden agregar soluciones (nunca
 * quitar), una casilla que rompe la unicidad en un momento dado
 * tampoco se podrá vaciar más adelante. Por eso un mismo orden no
 * mejora repitiéndolo: cada intento necesita un orden nuevo.
 *
 * @returns {{puzzle: number[][], vacias: number}}
 */
function intentoDeVaciado(tableroResuelto, objetivoVacias, aleatorio = Math.random) {
  const puzzle = copiarTablero(tableroResuelto);

  const posiciones = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      posiciones.push([fila, columna]);
    }
  }
  mezclar(posiciones, aleatorio);

  let vacias = 0;
  for (const [fila, columna] of posiciones) {
    if (vacias >= objetivoVacias) break;

    const guardado = puzzle[fila][columna];
    puzzle[fila][columna] = 0;

    if (contarSoluciones(puzzle, 2) === 1) {
      vacias++; // Solución sigue siendo única: la dejamos vacía
    } else {
      puzzle[fila][columna] = guardado; // Varias soluciones: la restauramos
    }
  }

  return { puzzle, vacias };
}

/** Clave estable de un tablero para no evaluar dos veces el mismo candidato. */
function claveTablero(tablero) {
  return tablero.map((fila) => fila.join("")).join("|");
}

function esEvaluacionVerificada(evaluacion) {
  return Boolean(evaluacion?.resuelto && evaluacion?.verificado);
}

/**
 * Puntuación de búsqueda: menor es mejor. Sin `puntuar` solo distingue
 * candidatos verificados de bloqueados/no verificados; el generador
 * aporta la distancia al nivel pedido.
 */
function crearPuntuacion(evaluacion, puntuar) {
  if (!evaluacion) return Number.POSITIVE_INFINITY;
  if (typeof puntuar !== "function") {
    return esEvaluacionVerificada(evaluacion)
      ? 0
      : Number.POSITIVE_INFINITY;
  }

  const puntuacion = puntuar(evaluacion);
  return Number.isFinite(puntuacion) ? puntuacion : Number.POSITIVE_INFINITY;
}

/**
 * Genera un vecino con el mismo número de vacías: restaura una pista y
 * vacía otra casilla usando siempre el valor de la solución original.
 */
function intercambiarPista(puzzle, tableroResuelto, aleatorio) {
  const pistas = [];
  const vacias = [];

  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (puzzle[fila][columna] === 0) {
        vacias.push([fila, columna]);
      } else {
        pistas.push([fila, columna]);
      }
    }
  }

  if (pistas.length === 0 || vacias.length === 0) return null;

  const [filaPista, columnaPista] =
    pistas[Math.floor(aleatorio() * pistas.length)];
  const [filaVacia, columnaVacia] =
    vacias[Math.floor(aleatorio() * vacias.length)];

  const vecino = copiarTablero(puzzle);
  vecino[filaPista][columnaPista] = 0;
  vecino[filaVacia][columnaVacia] = tableroResuelto[filaVacia][columnaVacia];
  return vecino;
}

/**
 * Comprueba que el tablero sea una solución completa: 9x9, valores
 * enteros de 1 a 9 y sin repetidos en fila, columna ni caja.
 */
function esSolucionCompleta(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAMAÑO) return false;

  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAMAÑO) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 1 || valor > TAMAÑO) return false;
    }
  }

  for (let indice = 0; indice < TAMAÑO; indice++) {
    const fila = new Set(tablero[indice]);
    const columna = new Set(tablero.map((f) => f[indice]));
    if (fila.size !== TAMAÑO || columna.size !== TAMAÑO) return false;
  }

  for (let inicioFila = 0; inicioFila < TAMAÑO; inicioFila += TAMAÑO_CAJA) {
    for (
      let inicioColumna = 0;
      inicioColumna < TAMAÑO;
      inicioColumna += TAMAÑO_CAJA
    ) {
      const caja = new Set();
      for (let i = 0; i < TAMAÑO_CAJA; i++) {
        for (let j = 0; j < TAMAÑO_CAJA; j++) {
          caja.add(tablero[inicioFila + i][inicioColumna + j]);
        }
      }
      if (caja.size !== TAMAÑO) return false;
    }
  }

  return true;
}

/**
 * Vacía casillas del tablero resuelto para crear el puzzle,
 * cuidando que siga teniendo UNA ÚNICA solución.
 *
 * El primer intento hace una pasada greedy con orden aleatorio. Si se
 * queda corto se reintenta con otro orden desde el tablero completo
 * (cada orden alcanza un máximo distinto), conservando siempre el
 * mejor tablero válido obtenido. Nunca se elimina una casilla sin
 * comprobar antes que la solución siga siendo única.
 *
 * Los reintentos se detienen al alcanzar el objetivo, al agotar los
 * intentos o al consumir el presupuesto de tiempo, para no demorar
 * innecesariamente la generación.
 *
 * `evaluar` y `aceptar` permiten exigir además un criterio lógico.
 * `alcanzado` solo es true si se cumplen las casillas vacías Y el
 * criterio lógico. Si no, se devuelve el mejor intento con el motivo
 * ("dificultad", "presupuesto" o "intentos") para que la interfaz no
 * presente la dificultad como garantizada.
 *
 * Si la semilla no cumple el criterio exacto, la búsqueda local prueba
 * vecinos que restauran una pista y vacían otra casilla, manteniendo el
 * número de vacías. Cada vecino se comprueba con `contarSoluciones`
 * antes de evaluarse. `puntuar` ordena los candidatos durante la
 * búsqueda; `aceptar` sigue siendo el único criterio de éxito.
 *
 * Nota: "vacías" mide casillas vacías, no dificultad lógica real;
 * un puzzle con 56 vacías puede ser más fácil de resolver que otro
 * con menos si sus técnicas de deducción son más directas.
 *
 * @param {number[][]} tableroResuelto - Solución completa (no se modifica).
 * @param {number} objetivoVacias - Entero entre 0 y 81 (casillas vacías deseadas).
 * @param {{
 *   maxIntentos?: number,
 *   presupuestoMs?: number,
 *   maxEvaluaciones?: number,
 *   maxIntercambiosPorSemilla?: number,
 *   evaluar?: (puzzle: number[][]) => object,
 *   aceptar?: (evaluacion: object) => boolean,
 *   puntuar?: (evaluacion: object) => number,
 *   aleatorio?: () => number,
 *   diagnostico?: {
 *     semillas?: number,
 *     intercambios?: number,
 *     evaluaciones?: number,
 *     rechazosUnicidad?: number
 *   }
 * }} opciones
 * @returns {{
 *   puzzle: number[][],
 *   vacias: number,
 *   evaluacion: object|null,
 *   alcanzado: boolean,
 *   motivo: "objetivo"|"dificultad"|"presupuesto"|"intentos"
 * }}
 * @throws {TypeError} Si el objetivo no es un entero dentro del rango.
 */
export function crearPuzzleConResultado(tableroResuelto, objetivoVacias, opciones = {}) {
  if (
    !Number.isInteger(objetivoVacias) ||
    objetivoVacias < 0 ||
    objetivoVacias > TAMAÑO * TAMAÑO
  ) {
    throw new TypeError(
      `crearPuzzle espera objetivoVacias entero entre 0 y ${TAMAÑO * TAMAÑO}`
    );
  }

  if (!esSolucionCompleta(tableroResuelto)) {
    throw new TypeError(
      "crearPuzzle espera una solución completa y válida de Sudoku"
    );
  }

  const maxIntentos = Math.max(1, opciones.maxIntentos ?? 5);
  const presupuestoMs = opciones.presupuestoMs ?? 3000;
  const maxEvaluaciones = Math.max(0, opciones.maxEvaluaciones ?? 500);
  const maxIntercambiosPorSemilla = Math.max(
    0,
    opciones.maxIntercambiosPorSemilla ?? 400
  );
  const evaluar =
    typeof opciones.evaluar === "function" ? opciones.evaluar : null;
  const aceptar =
    typeof opciones.aceptar === "function" ? opciones.aceptar : () => true;
  const puntuar =
    typeof opciones.puntuar === "function" ? opciones.puntuar : null;
  const aleatorio =
    typeof opciones.aleatorio === "function" ? opciones.aleatorio : Math.random;
  const diagnostico = opciones.diagnostico ?? null;

  if (diagnostico) {
    diagnostico.semillas = 0;
    diagnostico.intercambios = 0;
    diagnostico.evaluaciones = 0;
    diagnostico.rechazosUnicidad = 0;
  }

  const contar = (campo) => {
    if (diagnostico) diagnostico[campo] = (diagnostico[campo] ?? 0) + 1;
  };

  const inicio = performance.now();
  let evaluaciones = 0;
  let mejor = null;
  let presupuestoAgotado = false;
  const visitados = new Set();

  const tiempoAgotado = () => performance.now() - inicio >= presupuestoMs;
  const evaluacionesAgotadas = () => evaluaciones >= maxEvaluaciones;

  const crearCandidato = (puzzle, vacias) => {
    let evaluacion = null;

    if (evaluar && !evaluacionesAgotadas()) {
      evaluacion = evaluar(puzzle);
      evaluaciones++;
      contar("evaluaciones");
    }

    const cumpleLogica =
      !evaluar || (evaluacion !== null && aceptar(evaluacion));

    return {
      puzzle,
      vacias,
      evaluacion,
      cumpleLogica,
      puntuacion: crearPuntuacion(evaluacion, puntuar),
    };
  };

  const esMejor = (candidato) => {
    if (!mejor) return true;
    if (evaluar) {
      const candidatoVerificado = esEvaluacionVerificada(candidato.evaluacion);
      const mejorVerificado = esEvaluacionVerificada(mejor.evaluacion);
      if (candidatoVerificado !== mejorVerificado) return candidatoVerificado;
      if (candidatoVerificado && candidato.puntuacion !== mejor.puntuacion) {
        return candidato.puntuacion < mejor.puntuacion;
      }
    }
    return candidato.vacias > mejor.vacias;
  };

  const resultadoExito = (candidato) => ({
    puzzle: candidato.puzzle,
    vacias: candidato.vacias,
    evaluacion: candidato.evaluacion,
    alcanzado: true,
    motivo: "objetivo",
  });

  for (let intento = 0; intento < maxIntentos; intento++) {
    // El primer intento corre siempre; los demás solo si queda presupuesto
    if (intento > 0 && (tiempoAgotado() || evaluacionesAgotadas())) {
      presupuestoAgotado = true;
      break;
    }

    const { puzzle, vacias } = intentoDeVaciado(
      tableroResuelto,
      objetivoVacias,
      aleatorio
    );
    contar("semillas");
    visitados.add(claveTablero(puzzle));

    let actual = crearCandidato(puzzle, vacias);

    if (actual.cumpleLogica && vacias >= objetivoVacias) {
      return resultadoExito(actual);
    }

    if (esMejor(actual)) mejor = actual;

    // Sin evaluador, o si la semilla no alcanzó las vacías objetivo, no
    // hay búsqueda local: el vecino conservaría un número distinto.
    if (!evaluar || vacias < objetivoVacias) continue;

    for (
      let intercambio = 0;
      intercambio < maxIntercambiosPorSemilla;
      intercambio++
    ) {
      if (tiempoAgotado() || evaluacionesAgotadas()) {
        presupuestoAgotado = true;
        break;
      }

      const vecino = intercambiarPista(actual.puzzle, tableroResuelto, aleatorio);
      if (!vecino) break;
      contar("intercambios");

      const clave = claveTablero(vecino);
      if (visitados.has(clave)) continue;
      visitados.add(clave);

      // La unicidad se comprueba antes de evaluar la dificultad.
      if (contarSoluciones(vecino, 2) !== 1) {
        contar("rechazosUnicidad");
        continue;
      }

      if (tiempoAgotado() || evaluacionesAgotadas()) {
        presupuestoAgotado = true;
        break;
      }

      const candidato = crearCandidato(vecino, actual.vacias);

      if (candidato.cumpleLogica && candidato.vacias >= objetivoVacias) {
        return resultadoExito(candidato);
      }

      if (esMejor(candidato)) mejor = candidato;

      // Se aceptan mejoras y jugadas laterales; nunca un empeoramiento.
      if (candidato.puntuacion <= actual.puntuacion) actual = candidato;
    }

    if (presupuestoAgotado) break;
  }

  if (!presupuestoAgotado && (tiempoAgotado() || evaluacionesAgotadas())) {
    presupuestoAgotado = true;
  }

  const cumpleVacias = mejor.vacias >= objetivoVacias;
  const motivo = cumpleVacias
    ? "dificultad"
    : presupuestoAgotado
      ? "presupuesto"
      : "intentos";

  return {
    puzzle: mejor.puzzle,
    vacias: mejor.vacias,
    evaluacion: mejor.evaluacion,
    alcanzado: false,
    motivo,
  };
}

/**
 * Variante histórica que devuelve solo la matriz del puzzle. Mantiene
 * el mismo comportamiento y añade los criterios opcionales de
 * crearPuzzleConResultado.
 */
export function crearPuzzle(tableroResuelto, objetivoVacias, opciones = {}) {
  return crearPuzzleConResultado(tableroResuelto, objetivoVacias, opciones)
    .puzzle;
}

// ============================================================
// 3. UTILIDADES DE ESTADO
// ============================================================

/** Crea la matriz de apuntes vacía (9x9 de Sets). */
export function crearNotasVacias() {
  return Array.from({ length: TAMAÑO }, () =>
    Array.from({ length: TAMAÑO }, () => new Set())
  );
}

/** Copia profunda de la matriz de apuntes. */
export function copiarNotas(origen) {
  return origen.map((fila) => fila.map((set) => new Set(set)));
}

/** Formatea segundos como MM:SS (o H:MM:SS si pasa de una hora). */
export function formatearTiempo(total) {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  const dos = (n) => String(n).padStart(2, "0");
  return horas > 0
    ? `${horas}:${dos(minutos)}:${dos(segs)}`
    : `${dos(minutos)}:${dos(segs)}`;
}
