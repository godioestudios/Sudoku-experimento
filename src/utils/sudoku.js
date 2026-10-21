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
 * Comprueba la forma y las reglas de un tablero parcial. Se mantiene en este
 * módulo porque el resolvedor por backtracking y el contador son APIs
 * públicas: un tablero completo con pistas repetidas no es una solución.
 */
function tableroParcialEsValido(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAMAÑO) return false;

  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAMAÑO) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 0 || valor > TAMAÑO) return false;
    }
  }

  const sinRepetidos = (valores) => {
    const vistos = new Set();
    for (const valor of valores) {
      if (valor === 0) continue;
      if (vistos.has(valor)) return false;
      vistos.add(valor);
    }
    return true;
  };

  for (let indice = 0; indice < TAMAÑO; indice++) {
    if (!sinRepetidos(tablero[indice])) return false;
    if (!sinRepetidos(tablero.map((fila) => fila[indice]))) return false;
  }

  for (let inicioFila = 0; inicioFila < TAMAÑO; inicioFila += TAMAÑO_CAJA) {
    for (
      let inicioColumna = 0;
      inicioColumna < TAMAÑO;
      inicioColumna += TAMAÑO_CAJA
    ) {
      const caja = [];
      for (let fila = inicioFila; fila < inicioFila + TAMAÑO_CAJA; fila++) {
        for (
          let columna = inicioColumna;
          columna < inicioColumna + TAMAÑO_CAJA;
          columna++
        ) {
          caja.push(tablero[fila][columna]);
        }
      }
      if (!sinRepetidos(caja)) return false;
    }
  }

  return true;
}

/**
 * Resuelve el Sudoku con backtracking (recursión + vuelta atrás).
 */
export function resolverSudoku(tablero) {
  if (!tableroParcialEsValido(tablero)) return false;
  return resolverSudokuValido(tablero);
}

function resolverSudokuValido(tablero) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true; // Sin huecos: resuelto

  const [fila, columna] = casilla;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;

      if (resolverSudokuValido(tablero)) return true; // Seguir por este camino

      tablero[fila][columna] = 0; // Backtrack: deshacer y probar otro
    }
  }

  return false; // Ningún número sirve: retroceder
}

const INTERVALO_CHEQUEO_TIEMPO = 512;

function agotarPresupuesto(presupuesto, motivo) {
  if (!presupuesto.agotado) {
    presupuesto.agotado = true;
    presupuesto.motivo = motivo;
  }
}

/** Comprueba el presupuesto antes de iniciar trabajo costoso. */
function presupuestoExcedido(presupuesto, comprobarTiempo = true) {
  if (!presupuesto) return false;
  if (presupuesto.agotado) return true;

  if (presupuesto.nodos >= presupuesto.maxNodos) {
    agotarPresupuesto(presupuesto, "nodos");
    return true;
  }

  if (
    comprobarTiempo &&
    presupuesto.ahora() - presupuesto.inicio >= presupuesto.limiteMs
  ) {
    agotarPresupuesto(presupuesto, "tiempo");
    return true;
  }

  return false;
}

function consumirNodo(presupuesto) {
  if (!presupuesto) return true;
  if (presupuestoExcedido(presupuesto, false)) return false;

  presupuesto.nodos++;
  if (presupuesto.nodos % INTERVALO_CHEQUEO_TIEMPO === 0) {
    return !presupuestoExcedido(presupuesto);
  }

  return true;
}

function crearPresupuesto({ presupuestoMs, maxNodosUnicidad, ahora }) {
  return {
    inicio: ahora(),
    limiteMs: Math.max(0, presupuestoMs),
    maxNodos: Math.max(0, maxNodosUnicidad),
    nodos: 0,
    verificaciones: 0,
    interrumpidas: 0,
    tiempoUnicidadMs: 0,
    tiempoEvaluacionMs: 0,
    agotado: false,
    motivo: null,
    ahora,
  };
}

/**
 * Cuenta soluciones con un presupuesto compartido. Devuelve siempre un
 * resultado discriminado: `completa: false` significa que la búsqueda se
 * interrumpió y `total` no demuestra nada sobre el tablero.
 */
function contarSolucionesConPresupuesto(
  tablero,
  limite = 2,
  presupuesto = null
) {
  if (!consumirNodo(presupuesto)) {
    return { total: 0, completa: false, motivo: presupuesto.motivo };
  }

  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) {
    return { total: 1, completa: true, motivo: null }; // Solución completa
  }

  const [fila, columna] = casilla;
  let total = 0;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      const resultado = contarSolucionesConPresupuesto(
        tablero,
        limite - total,
        presupuesto
      );
      tablero[fila][columna] = 0; // Restaurar también al interrumpir

      if (!resultado.completa) return resultado;

      total += resultado.total;
      if (total >= limite) return { total, completa: true, motivo: null };
    }
  }

  return { total, completa: true, motivo: null };
}

/**
 * Cuenta soluciones del tablero (se detiene al llegar al límite).
 * Sirve para verificar que un puzzle tiene solución única.
 */
export function contarSoluciones(tablero, limite = 2) {
  if (!Number.isInteger(limite) || limite < 1 || !tableroParcialEsValido(tablero)) {
    return 0;
  }
  return contarSolucionesConPresupuesto(tablero, limite, null).total;
}

function verificarUnicidad(tablero, presupuesto) {
  if (!presupuesto) {
    return contarSolucionesConPresupuesto(tablero, 2, null);
  }

  const inicio = presupuesto.ahora();
  const resultado = contarSolucionesConPresupuesto(tablero, 2, presupuesto);

  presupuesto.verificaciones++;
  presupuesto.tiempoUnicidadMs += presupuesto.ahora() - inicio;
  if (!resultado.completa) presupuesto.interrumpidas++;

  return resultado;
}

// ============================================================
// 2. GENERACIÓN
// ============================================================

/** Copia profunda de un tablero 9x9. */
export function copiarTablero(tablero) {
  return tablero.map((fila) => [...fila]);
}

/**
 * Crea una fuente pseudoaleatoria reproducible de valores en [0, 1).
 *
 * Las cadenas se reducen con FNV-1a de 32 bits (sobre unidades UTF-16) y
 * los números finitos se truncan a un entero sin signo de 32 bits. El estado
 * se avanza con mulberry32. Es una fuente pequeña y estable para generación
 * reproducible, no un generador criptográficamente seguro.
 *
 * @param {number|string} semilla
 * @returns {() => number}
 */
export function crearAleatorioSembrado(semilla) {
  let estado;

  if (typeof semilla === "number" && Number.isFinite(semilla)) {
    estado = Math.trunc(semilla) >>> 0;
  } else if (typeof semilla === "string") {
    estado = 2166136261;
    for (let indice = 0; indice < semilla.length; indice++) {
      estado ^= semilla.charCodeAt(indice);
      estado = Math.imul(estado, 16777619);
    }
    estado >>>= 0;
  } else {
    throw new TypeError("La semilla debe ser un número finito o una cadena");
  }

  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let mezcla = estado;
    mezcla = Math.imul(mezcla ^ (mezcla >>> 15), mezcla | 1);
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61);
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;
  };
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
export function rellenarTablero(tablero, aleatorio = Math.random) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true;

  const [fila, columna] = casilla;

  for (const numero of mezclar([...VALORES], aleatorio)) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      if (rellenarTablero(tablero, aleatorio)) return true;
      tablero[fila][columna] = 0; // Backtrack
    }
  }
  return false;
}

/** Crea un tablero 9x9 válido y completo con la fuente aleatoria indicada. */
export function generarTableroResuelto(aleatorio = Math.random) {
  const tablero = Array.from({ length: TAMAÑO }, () => Array(TAMAÑO).fill(0));
  rellenarTablero(tablero, aleatorio);
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
 * @returns {{
 *   puzzle: number[][],
 *   vacias: number,
 *   interrumpido: boolean,
 *   motivo: "tiempo"|"nodos"|null
 * }}
 */
function intentoDeVaciado(
  tableroResuelto,
  objetivoVacias,
  aleatorio = Math.random,
  presupuesto = null
) {
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

    if (presupuestoExcedido(presupuesto)) {
      return {
        puzzle,
        vacias,
        interrumpido: true,
        motivo: presupuesto?.motivo ?? null,
      };
    }

    const guardado = puzzle[fila][columna];
    puzzle[fila][columna] = 0;

    const chequeo = verificarUnicidad(puzzle, presupuesto);

    if (!chequeo.completa) {
      // Sin prueba completa no se confirma el vaciado. El puzzle vuelve al
      // último estado cuya unicidad sí quedó demostrada.
      puzzle[fila][columna] = guardado;
      return {
        puzzle,
        vacias,
        interrumpido: true,
        motivo: chequeo.motivo,
      };
    }

    if (chequeo.total === 1) {
      vacias++; // Solución sigue siendo única: la dejamos vacía
    } else {
      puzzle[fila][columna] = guardado; // Varias soluciones: la restauramos
    }
  }

  return { puzzle, vacias, interrumpido: false, motivo: null };
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

/** Normaliza límites configurables para evitar bucles sin cota y retornos sin semilla. */
function enteroNoNegativo(valor, predeterminado) {
  return Number.isSafeInteger(valor) && valor >= 0 ? valor : predeterminado;
}

function numeroNoNegativo(valor, predeterminado) {
  return typeof valor === "number" && !Number.isNaN(valor) && valor >= 0
    ? valor
    : predeterminado;
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
 * número de vacías. Cada vecino se comprueba con el conteo controlado
 * antes de evaluarse. `puntuar` ordena los candidatos durante la
 * búsqueda; `aceptar` sigue siendo el único criterio de éxito.
 *
 * Las comprobaciones de unicidad comparten un presupuesto con la
 * generación de la semilla y con las evaluaciones lógicas. Si el
 * presupuesto se agota, la búsqueda se interrumpe y se devuelve el
 * último candidato cuya unicidad quedó demostrada.
 *
 * `busquedaCompleta` solo indica que el presupuesto compartido no fue
 * marcado como agotado (tiempo, nodos o evaluaciones) en ningún punto
 * de control. No significa que la búsqueda haya sido exhaustiva ni que
 * se hayan explorado todos los candidatos posibles.
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
 *   maxNodosUnicidad?: number,
 *   maxEvaluaciones?: number,
 *   maxIntercambiosPorSemilla?: number,
 *   evaluar?: (puzzle: number[][]) => object,
 *   aceptar?: (evaluacion: object) => boolean,
 *   puntuar?: (evaluacion: object) => number,
 *   aleatorio?: () => number,
 *   semilla?: number|string,
 *   ahora?: () => number,
 *   diagnostico?: {
 *     semillas?: number,
 *     semillasInterrumpidas?: number,
 *     intercambios?: number,
 *     evaluaciones?: number,
 *     rechazosUnicidad?: number,
 *     verificacionesUnicidad?: number,
 *     nodosUnicidad?: number,
 *     interrupcionesUnicidad?: number,
 *     tiempoUnicidadMs?: number,
 *     tiempoEvaluacionMs?: number,
 *     tiempoTotalMs?: number,
 *     motivoAgotamiento?: string|null
 *   }
 * }} opciones
 * @returns {{
 *   puzzle: number[][],
 *   vacias: number,
 *   evaluacion: object|null,
 *   alcanzado: boolean,
 *   motivo: "objetivo"|"dificultad"|"presupuesto"|"intentos",
 *   busquedaCompleta: boolean,
 *   presupuestoAgotado: boolean,
 *   motivoAgotamiento: string|null,
 *   diagnostico: object|null
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

  const maxIntentos = Math.max(1, enteroNoNegativo(opciones.maxIntentos, 5));
  const presupuestoMs = numeroNoNegativo(opciones.presupuestoMs, 3000);
  const maxNodosUnicidad = numeroNoNegativo(
    opciones.maxNodosUnicidad,
    Infinity
  );
  const maxEvaluaciones = enteroNoNegativo(opciones.maxEvaluaciones, 500);
  const maxIntercambiosPorSemilla = enteroNoNegativo(
    opciones.maxIntercambiosPorSemilla,
    400
  );
  const evaluar =
    typeof opciones.evaluar === "function" ? opciones.evaluar : null;
  const aceptar =
    typeof opciones.aceptar === "function" ? opciones.aceptar : () => true;
  const puntuar =
    typeof opciones.puntuar === "function" ? opciones.puntuar : null;
  const aleatorio =
    typeof opciones.aleatorio === "function"
      ? opciones.aleatorio
      : opciones.semilla !== undefined
        ? crearAleatorioSembrado(opciones.semilla)
        : Math.random;
  const ahora =
    typeof opciones.ahora === "function" ? opciones.ahora : () => performance.now();
  const diagnostico = opciones.diagnostico ?? null;

  const presupuesto = crearPresupuesto({
    presupuestoMs,
    maxNodosUnicidad,
    ahora,
  });

  if (diagnostico) {
    diagnostico.semillas = 0;
    diagnostico.semillasInterrumpidas = 0;
    diagnostico.intercambios = 0;
    diagnostico.evaluaciones = 0;
    diagnostico.rechazosUnicidad = 0;
  }

  const contar = (campo) => {
    if (diagnostico) diagnostico[campo] = (diagnostico[campo] ?? 0) + 1;
  };

  const sincronizarDiagnostico = () => {
    if (!diagnostico) return;
    diagnostico.verificacionesUnicidad = presupuesto.verificaciones;
    diagnostico.nodosUnicidad = presupuesto.nodos;
    diagnostico.interrupcionesUnicidad = presupuesto.interrumpidas;
    diagnostico.tiempoUnicidadMs = presupuesto.tiempoUnicidadMs;
    diagnostico.tiempoEvaluacionMs = presupuesto.tiempoEvaluacionMs;
    diagnostico.tiempoTotalMs = ahora() - presupuesto.inicio;
    diagnostico.motivoAgotamiento = presupuesto.motivo;
  };

  let evaluaciones = 0;
  let mejor = null;
  let presupuestoAgotado = false;
  const visitados = new Set();

  const tiempoAgotado = () => presupuestoExcedido(presupuesto);
  const evaluacionesConsumidas = () => evaluaciones >= maxEvaluaciones;
  const evaluacionesAgotadas = () => {
    if (!evaluacionesConsumidas()) return false;
    agotarPresupuesto(presupuesto, "evaluaciones");
    return true;
  };

  const crearCandidato = (puzzle, vacias) => {
    let evaluacion = null;

    if (
      evaluar &&
      !evaluacionesAgotadas() &&
      !presupuestoExcedido(presupuesto)
    ) {
      const inicioEvaluacion = ahora();
      evaluacion = evaluar(puzzle);
      presupuesto.tiempoEvaluacionMs += ahora() - inicioEvaluacion;
      evaluaciones++;
      contar("evaluaciones");
    }

    // `aceptar` define el nivel exacto, pero no puede convertir una
    // evaluación bloqueada, inválida o incompleta en un éxito.
    const cumpleLogica =
      !evaluar ||
      (esEvaluacionVerificada(evaluacion) && aceptar(evaluacion));

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

  const resultadoExito = (candidato) => {
    sincronizarDiagnostico();
    return {
      puzzle: candidato.puzzle,
      vacias: candidato.vacias,
      evaluacion: candidato.evaluacion,
      alcanzado: true,
      motivo: "objetivo",
      busquedaCompleta: !presupuesto.agotado,
      presupuestoAgotado: presupuesto.agotado,
      motivoAgotamiento: presupuesto.motivo,
      diagnostico,
    };
  };

  for (let intento = 0; intento < maxIntentos; intento++) {
    // El primer intento corre siempre; los demás solo si queda presupuesto
    if (intento > 0 && (tiempoAgotado() || evaluacionesAgotadas())) {
      presupuestoAgotado = true;
      break;
    }

    const semilla = intentoDeVaciado(
      tableroResuelto,
      objetivoVacias,
      aleatorio,
      presupuesto
    );
    const { puzzle, vacias } = semilla;
    contar("semillas");
    if (semilla.interrumpido) contar("semillasInterrumpidas");
    visitados.add(claveTablero(puzzle));

    let actual = crearCandidato(puzzle, vacias);

    if (
      !semilla.interrumpido &&
      actual.cumpleLogica &&
      vacias >= objetivoVacias
    ) {
      return resultadoExito(actual);
    }

    if (esMejor(actual)) mejor = actual;

    if (semilla.interrumpido) {
      presupuestoAgotado = true;
      break;
    }

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
      const chequeo = verificarUnicidad(vecino, presupuesto);

      if (!chequeo.completa) {
        // Interrumpido no significa no único: no se evalúa ni se acepta.
        presupuestoAgotado = true;
        break;
      }

      if (chequeo.total !== 1) {
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

  if (!presupuestoAgotado && tiempoAgotado()) {
    presupuestoAgotado = true;
  }

  sincronizarDiagnostico();

  const cumpleVacias = mejor.vacias >= objetivoVacias;
  const motivo = presupuestoAgotado
    ? "presupuesto"
    : cumpleVacias
      ? "dificultad"
      : "intentos";

  return {
    puzzle: mejor.puzzle,
    vacias: mejor.vacias,
    evaluacion: mejor.evaluacion,
    alcanzado: false,
    motivo,
    busquedaCompleta: !presupuesto.agotado,
    presupuestoAgotado: presupuesto.agotado,
    motivoAgotamiento: presupuesto.motivo,
    diagnostico,
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
