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
 * Vacía casillas del tablero resuelto para crear el puzzle,
 * cuidando que siga teniendo UNA ÚNICA solución.
 */
export function crearPuzzle(tableroResuelto, objetivoVacias) {
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

  return puzzle;
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
