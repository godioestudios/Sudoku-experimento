import test from "node:test";
import assert from "node:assert/strict";

import {
  DIFICULTADES,
  crearPuzzle,
  generarTableroResuelto,
} from "../src/utils/sudoku.js";

// ------------------------------------------------------------
// Comprobaciones independientes del generador
// ------------------------------------------------------------

const TAM = 9;
const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EJECUCIONES_POR_NIVEL = 2;

function copiar(tablero) {
  return tablero.map((fila) => [...fila]);
}

function contarVacias(tablero) {
  return tablero.flat().filter((valor) => valor === 0).length;
}

/** Celdas de cada fila, columna y caja 3x3. */
function unidadesDe(tablero) {
  const unidades = [];

  for (let fila = 0; fila < TAM; fila++) {
    unidades.push(tablero[fila]);
  }
  for (let columna = 0; columna < TAM; columna++) {
    unidades.push(tablero.map((fila) => fila[columna]));
  }
  for (let inicioFila = 0; inicioFila < TAM; inicioFila += 3) {
    for (let inicioColumna = 0; inicioColumna < TAM; inicioColumna += 3) {
      const caja = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          caja.push(tablero[inicioFila + i][inicioColumna + j]);
        }
      }
      unidades.push(caja);
    }
  }

  return unidades;
}

function estructuraCorrecta(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAM) return false;
  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAM) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 0 || valor > TAM) return false;
    }
  }
  return true;
}

/**
 * Reglas reales del Sudoku, sin usar tableroEsValido().
 * Con `completa` exige además que no queden ceros y que cada unidad
 * contenga exactamente los dígitos 1..9.
 */
function esSudokuValido(tablero, { completa = false } = {}) {
  if (!estructuraCorrecta(tablero)) return false;

  for (const unidad of unidadesDe(tablero)) {
    const vistos = new Set();
    for (const valor of unidad) {
      if (valor === 0) {
        if (completa) return false;
        continue;
      }
      if (vistos.has(valor)) return false;
      vistos.add(valor);
    }
    if (completa && vistos.size !== TAM) return false;
  }

  return true;
}

function puedeColocar(tablero, fila, columna, numero) {
  for (let i = 0; i < TAM; i++) {
    if (tablero[fila][i] === numero || tablero[i][columna] === numero) {
      return false;
    }
  }

  const inicioFila = Math.floor(fila / 3) * 3;
  const inicioColumna = Math.floor(columna / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (tablero[inicioFila + i][inicioColumna + j] === numero) return false;
    }
  }

  return true;
}

/**
 * Contador de soluciones propio, limitado a `limite` (2 por defecto).
 * Se implementa aparte para no validar el generador con su misma
 * función de conteo. Un puzzle con más de una solución devuelve 2.
 */
function contarSolucionesIndependiente(tablero, limite = 2) {
  if (!esSudokuValido(tablero)) return 0;

  const copia = copiar(tablero);
  let total = 0;

  const resolver = () => {
    if (total >= limite) return;

    let filaVacia = -1;
    let columnaVacia = -1;
    for (let fila = 0; fila < TAM && filaVacia === -1; fila++) {
      for (let columna = 0; columna < TAM; columna++) {
        if (copia[fila][columna] === 0) {
          filaVacia = fila;
          columnaVacia = columna;
          break;
        }
      }
    }

    if (filaVacia === -1) {
      total++;
      return;
    }

    for (let numero = 1; numero <= TAM; numero++) {
      if (!puedeColocar(copia, filaVacia, columnaVacia, numero)) continue;
      copia[filaVacia][columnaVacia] = numero;
      resolver();
      copia[filaVacia][columnaVacia] = 0;
      if (total >= limite) return;
    }
  };

  resolver();
  return total;
}

// ------------------------------------------------------------
// Solución completa
// ------------------------------------------------------------

test("generarTableroResuelto devuelve una solución 9x9 completa y válida", () => {
  for (let ejecucion = 0; ejecucion < 3; ejecucion++) {
    const tablero = generarTableroResuelto();

    assert.equal(tablero.length, TAM);
    for (const fila of tablero) assert.equal(fila.length, TAM);
    assert.equal(contarVacias(tablero), 0);

    // Cada fila, columna y caja es una permutación exacta de 1..9.
    for (const unidad of unidadesDe(tablero)) {
      assert.deepEqual(
        [...unidad].sort((a, b) => a - b),
        DIGITOS,
        "cada unidad debe contener 1..9 sin repetir"
      );
    }

    assert.equal(esSudokuValido(tablero, { completa: true }), true);
  }
});

// ------------------------------------------------------------
// Puzzles generados por nivel
// ------------------------------------------------------------

for (const [nivel, objetivo] of Object.entries(DIFICULTADES)) {
  test(`crearPuzzle genera puzzles válidos y de solución única (${nivel})`, () => {
    const solucion = generarTableroResuelto();
    const copiaSolucion = copiar(solucion);

    for (let ejecucion = 0; ejecucion < EJECUCIONES_POR_NIVEL; ejecucion++) {
      const puzzle = crearPuzzle(solucion, objetivo);

      assert.ok(puzzle, `el generador debe devolver un puzzle (${nivel})`);
      assert.equal(puzzle.length, TAM);
      for (const fila of puzzle) assert.equal(fila.length, TAM);
      assert.equal(
        esSudokuValido(puzzle),
        true,
        `el puzzle ${nivel} debe respetar las reglas del Sudoku`
      );

      // El generador puede quedarse corto (reintentos/presupuesto), pero
      // nunca debe vaciar más casillas que el objetivo.
      const vacias = contarVacias(puzzle);
      assert.ok(
        vacias <= objetivo,
        `${nivel}: se esperaban como máximo ${objetivo} vacías y hay ${vacias}`
      );

      // Toda pista debe coincidir con la solución completa de origen.
      for (let fila = 0; fila < TAM; fila++) {
        for (let columna = 0; columna < TAM; columna++) {
          if (puzzle[fila][columna] !== 0) {
            assert.equal(puzzle[fila][columna], solucion[fila][columna]);
          }
        }
      }

      // Unicidad comprobada con un contador ajeno al de producción.
      assert.equal(
        contarSolucionesIndependiente(puzzle, 2),
        1,
        `el puzzle ${nivel} debe tener exactamente una solución`
      );
    }

    assert.deepEqual(solucion, copiaSolucion, "la solución no debe modificarse");
  });
}

// ------------------------------------------------------------
// Contratos y límites
// ------------------------------------------------------------

test("crearPuzzle(solucion, 0) conserva una solución completa y válida", () => {
  const solucion = generarTableroResuelto();
  const copiaSolucion = copiar(solucion);

  const puzzle = crearPuzzle(solucion, 0);

  assert.ok(puzzle);
  assert.deepEqual(puzzle, solucion);
  assert.notEqual(puzzle, solucion);
  assert.equal(esSudokuValido(puzzle, { completa: true }), true);
  assert.deepEqual(solucion, copiaSolucion);
});

test("crearPuzzle devuelve el mejor puzzle válido si no alcanza el objetivo", () => {
  const solucion = generarTableroResuelto();

  // 81 vacías es inalcanzable con solución única. Un solo intento acota
  // el costo y documenta que, al quedarse corto, se devuelve un puzzle
  // válido en lugar de null o un tablero roto.
  const puzzle = crearPuzzle(solucion, 81, {
    maxIntentos: 1,
    presupuestoMs: 10000,
  });

  assert.ok(puzzle);
  assert.equal(esSudokuValido(puzzle), true);
  assert.ok(contarVacias(puzzle) > 0);
  assert.ok(contarVacias(puzzle) < 81);
  assert.equal(contarSolucionesIndependiente(puzzle, 2), 1);

  for (let fila = 0; fila < TAM; fila++) {
    for (let columna = 0; columna < TAM; columna++) {
      if (puzzle[fila][columna] !== 0) {
        assert.equal(puzzle[fila][columna], solucion[fila][columna]);
      }
    }
  }
});

test("crearPuzzle rechaza con TypeError una solución completa con duplicados", () => {
  const solucion = generarTableroResuelto();
  const invalida = copiar(solucion);
  // Duplicado en la fila 0 y en la caja 0-2/0-2.
  invalida[0][0] = invalida[0][1];

  assert.throws(() => crearPuzzle(invalida, 0), TypeError);
});

test("crearPuzzle rechaza entradas que no son matrices 9x9", () => {
  const invalidas = [
    null,
    undefined,
    "texto",
    [[0]],
    Array.from({ length: 8 }, () => Array(TAM).fill(0)),
  ];

  for (const entrada of invalidas) {
    assert.throws(() => crearPuzzle(entrada, 36), TypeError);
  }
});
