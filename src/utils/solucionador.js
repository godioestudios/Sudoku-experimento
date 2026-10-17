/**
 * ============================================================
 *  SUDOKU — Solucionador lógico (técnicas básicas)
 * ============================================================
 *  Evalúa un puzzle con deducción pura (naked y hidden singles),
 *  sin backtracking. Ninguna función de este módulo modifica el
 *  tablero recibido: resolverLogico trabaja siempre sobre una
 *  copia.
 * ============================================================
 */

import {
  TAMAÑO,
  TAMAÑO_CAJA,
  VALORES,
  buscarCasillaVacia,
  copiarTablero,
  esValido,
} from "./sudoku.js";

// Nombre de cada técnica registrada en los pasos
export const TECNICAS = {
  NAKED_SINGLE: "naked-single",
  HIDDEN_SINGLE: "hidden-single",
};

// Estados posibles de un tablero según las técnicas disponibles
export const ESTADOS = {
  RESUELTO: "resuelto",
  RESOLUBLE: "resoluble",
  BLOQUEADO: "bloqueado",
  // Sin solución posible: números repetidos, valores fuera de rango,
  // estructura incorrecta o una casilla vacía sin candidatos.
  INVALIDO: "invalido",
};

/**
 * Números del 1 al 9 que pueden ocupar una casilla vacía,
 * según fila, columna y caja 3x3.
 * Devuelve [] si la casilla no está vacía.
 */
export function obtenerCandidatos(tablero, fila, columna) {
  if (tablero[fila][columna] !== 0) return [];
  return VALORES.filter((numero) => esValido(tablero, fila, columna, numero));
}

/**
 * Casillas vacías con un único candidato (naked single).
 * @returns {{fila: number, columna: number, numero: number, tecnica: string}[]}
 */
export function detectarNakedSingles(tablero) {
  const singles = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] !== 0) continue;
      const candidatos = obtenerCandidatos(tablero, fila, columna);
      if (candidatos.length === 1) {
        singles.push({
          fila,
          columna,
          numero: candidatos[0],
          tecnica: TECNICAS.NAKED_SINGLE,
        });
      }
    }
  }
  return singles;
}

/** Celdas [fila, columna] de cada fila, columna y caja. */
function construirUnidades() {
  const unidades = [];

  for (let fila = 0; fila < TAMAÑO; fila++) {
    unidades.push({
      tipo: "fila",
      celdas: Array.from({ length: TAMAÑO }, (_, columna) => [fila, columna]),
    });
  }

  for (let columna = 0; columna < TAMAÑO; columna++) {
    unidades.push({
      tipo: "columna",
      celdas: Array.from({ length: TAMAÑO }, (_, fila) => [fila, columna]),
    });
  }

  for (let inicioFila = 0; inicioFila < TAMAÑO; inicioFila += TAMAÑO_CAJA) {
    for (
      let inicioColumna = 0;
      inicioColumna < TAMAÑO;
      inicioColumna += TAMAÑO_CAJA
    ) {
      const celdas = [];
      for (let i = 0; i < TAMAÑO_CAJA; i++) {
        for (let j = 0; j < TAMAÑO_CAJA; j++) {
          celdas.push([inicioFila + i, inicioColumna + j]);
        }
      }
      unidades.push({ tipo: "caja", celdas });
    }
  }

  return unidades;
}

const UNIDADES = construirUnidades();

/**
 * Comprueba que el tablero tenga forma 9x9, valores enteros entre
 * 0 y 9 y ningún número repetido en fila, columna ni caja.
 * No valida que el tablero tenga solución, solo que cumple las
 * reglas básicas del Sudoku.
 */
export function tableroEsValido(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAMAÑO) return false;

  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAMAÑO) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 0 || valor > 9) return false;
    }
  }

  for (const { celdas } of UNIDADES) {
    const vistos = new Set();
    for (const [fila, columna] of celdas) {
      const valor = tablero[fila][columna];
      if (valor === 0) continue;
      if (vistos.has(valor)) return false;
      vistos.add(valor);
    }
  }

  return true;
}

/**
 * Detecta casillas vacías sin ningún candidato: el tablero no
 * tiene solución aunque no haya números repetidos.
 */
function hayCasillaSinCandidatos(tablero) {
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] !== 0) continue;
      if (obtenerCandidatos(tablero, fila, columna).length === 0) return true;
    }
  }
  return false;
}

/**
 * Números que solo pueden ocupar UNA casilla vacía dentro de una
 * fila, columna o caja (hidden single). Se contemplan todas las
 * casillas vacías, incluidas las que son naked singles: una celda
 * naked sigue siendo destino posible de otros números y excluiría
 * colocaciones reales. Si la misma casilla es hidden single en más
 * de una unidad se registra una sola vez.
 * @returns {{fila: number, columna: number, numero: number, tecnica: string, unidad: string}[]}
 */
export function detectarHiddenSingles(tablero) {
  const singles = [];
  const registrados = new Set();

  for (const { tipo, celdas } of UNIDADES) {
    for (const numero of VALORES) {
      const posibles = celdas.filter(
        ([fila, columna]) =>
          tablero[fila][columna] === 0 &&
          esValido(tablero, fila, columna, numero)
      );
      if (posibles.length !== 1) continue;

      const [fila, columna] = posibles[0];
      const clave = `${fila},${columna},${numero}`;
      if (registrados.has(clave)) continue;
      registrados.add(clave);

      singles.push({
        fila,
        columna,
        numero,
        tecnica: TECNICAS.HIDDEN_SINGLE,
        unidad: tipo,
      });
    }
  }

  return singles;
}

/**
 * Estado del tablero según las técnicas disponibles:
 * - "invalido":   incumple las reglas (repetidos, valores fuera de
 *                 rango, estructura) o tiene una casilla vacía sin
 *                 candidatos, así que no tiene solución posible.
 * - "resuelto":   completo y sin números repetidos.
 * - "resoluble":  al menos un single (naked u hidden) se puede aplicar.
 * - "bloqueado":  quedan vacías pero ninguna técnica básica aplica;
 *                 hace falta búsqueda o técnicas avanzadas.
 */
export function clasificarTablero(tablero) {
  if (!tableroEsValido(tablero)) return ESTADOS.INVALIDO;
  if (buscarCasillaVacia(tablero) === null) return ESTADOS.RESUELTO;
  if (hayCasillaSinCandidatos(tablero)) return ESTADOS.INVALIDO;
  if (detectarNakedSingles(tablero).length > 0) return ESTADOS.RESOLUBLE;
  if (detectarHiddenSingles(tablero).length > 0) return ESTADOS.RESOLUBLE;
  return ESTADOS.BLOQUEADO;
}

/**
 * Aplica singles hasta que no quede ninguna técnica disponible.
 * Prefiere naked singles; si no hay, aplica uno hidden single.
 * Recalcula los candidatos tras cada colocación, de modo que cada
 * paso se valida contra el tablero actual: nunca coloca un número
 * que rompa las reglas. Si el tablero de entrada es inválido o
 * contradictorio no aplica ningún paso.
 *
 * El tablero recibido NUNCA se modifica: se trabaja sobre una copia.
 *
 * @param {number[][]} tablero
 * @returns {{estado: string, pasos: object[], tablero: number[][]}}
 *   estado: "resuelto" | "bloqueado" | "invalido"; pasos: técnica
 *   aplicada y número colocado en cada iteración, en orden.
 */
export function resolverLogico(tablero) {
  const copia = copiarTablero(tablero);
  const pasos = [];

  let estado = clasificarTablero(copia);
  while (estado === ESTADOS.RESOLUBLE) {
    const naked = detectarNakedSingles(copia);
    const aplicables = naked.length > 0 ? naked : detectarHiddenSingles(copia);
    const paso = aplicables[0];

    copia[paso.fila][paso.columna] = paso.numero;
    pasos.push(paso);
    estado = clasificarTablero(copia);
  }

  return { estado, pasos, tablero: copia };
}
