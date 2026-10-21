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
export function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
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
function intentoDeVaciado(tableroResuelto, objetivoVacias) {
  const puzzle = copiarTablero(tableroResuelto);

  const posiciones = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      posiciones.push([fila, columna]);
    }
  }
  mezclar(posiciones);

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
 * Nota: "vacías" mide casillas vacías, no dificultad lógica real;
 * un puzzle con 56 vacías puede ser más fácil de resolver que otro
 * con menos si sus técnicas de deducción son más directas.
 *
 * @param {number[][]} tableroResuelto - Solución completa (no se modifica).
 * @param {number} objetivoVacias - Casillas vacías deseadas.
 * @param {{maxIntentos?: number, presupuestoMs?: number}} opciones
 */
export function crearPuzzle(tableroResuelto, objetivoVacias, opciones = {}) {
  if (!esSolucionCompleta(tableroResuelto)) {
    throw new TypeError(
      "crearPuzzle espera una solución completa y válida de Sudoku"
    );
  }

  const maxIntentos = Math.max(1, opciones.maxIntentos ?? 5);
  const presupuestoMs = opciones.presupuestoMs ?? 3000;
  const inicio = performance.now();

  let mejorPuzzle = null;
  let mejorVacias = -1;

  for (let intento = 0; intento < maxIntentos; intento++) {
    // El primer intento corre siempre; los demás solo si queda presupuesto
    if (intento > 0 && performance.now() - inicio >= presupuestoMs) break;
    if (mejorVacias >= objetivoVacias) break;

    const { puzzle, vacias } = intentoDeVaciado(tableroResuelto, objetivoVacias);

    if (vacias > mejorVacias) {
      mejorPuzzle = puzzle;
      mejorVacias = vacias;
    }
  }

  return mejorPuzzle;
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
