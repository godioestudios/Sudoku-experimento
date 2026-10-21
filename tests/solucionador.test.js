import test from "node:test";
import assert from "node:assert/strict";

import {
  CRITERIOS_DIFICULTAD_LOGICA,
  ESTADOS,
  NIVELES_DIFICULTAD_LOGICA,
  TECNICAS,
  aplicarColocacion,
  clasificarTablero,
  cumpleDificultadLogica,
  detectarHiddenPares,
  detectarHiddenQuads,
  detectarHiddenSingles,
  detectarHiddenTriples,
  detectarNakedPares,
  detectarNakedQuads,
  detectarNakedSingles,
  detectarNakedTriples,
  evaluarDificultadLogica,
  obtenerCandidatos,
  resolverLogico,
  tableroEsValido,
} from "../src/utils/solucionador.js";
import {
  copiarTablero,
  contarSoluciones,
  esValido,
  resolverSudoku,
} from "../src/utils/sudoku.js";

// ------------------------------------------------------------
// Fixtures deterministas
// ------------------------------------------------------------

// Tablero válido (ciclo de 3 desplazamientos) con casillas vacías:
//   (0,0) candidatos {1,2} · (3,0) naked single 2 · (3,2) hidden single 4
const CON_CANDIDATOS = [
  [0, 0, 0, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [0, 0, 0, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 2, 3, 4],
  [8, 9, 0, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

// Puzzle clásico difícil: sin ningún single al inicio.
const SIN_SINGLES = [
  [8, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 6, 0, 0, 0, 0, 0],
  [0, 7, 0, 0, 9, 0, 2, 0, 0],
  [0, 5, 0, 0, 0, 7, 0, 0, 0],
  [0, 0, 0, 0, 4, 5, 7, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 3, 0],
  [0, 0, 1, 0, 0, 0, 0, 6, 8],
  [0, 0, 8, 5, 0, 0, 0, 1, 0],
  [0, 9, 0, 0, 0, 0, 4, 0, 0],
];

// Puzzle de solución única resoluble solo con singles.
const RESOLUBLE_SINGLES = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

// Puzzle de solución única que avanza con singles y luego se bloquea
// (8 pasos aplicados antes de quedarse sin técnicas básicas).
const SE_BLOQUEA_DESPUES = [
  [0, 8, 4, 2, 3, 0, 0, 0, 5],
  [0, 0, 0, 0, 0, 0, 0, 0, 4],
  [0, 1, 0, 5, 0, 0, 8, 0, 0],
  [0, 0, 0, 0, 9, 0, 0, 3, 0],
  [7, 5, 0, 0, 0, 6, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 7, 0, 0],
  [6, 0, 0, 0, 0, 0, 5, 0, 7],
  [8, 0, 0, 0, 0, 0, 0, 4, 9],
  [5, 0, 0, 0, 0, 4, 0, 1, 0],
];

// Solución válida conocida (pistas del puzzle RESOLUBLE_SINGLES).
const SOLUCION = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

// ------------------------------------------------------------
// Fixtures de naked pairs
// ------------------------------------------------------------

// Puzzle válido de solución única con pares desnudos en fila, columna
// y caja:
//   fila    (8,6)-(8,8) = {1,3} → elimina el 1 de (8,4)
//   columna (0,8)-(8,8) = {1,3} → elimina {1,3} de (5,8) y (7,8)
//   caja    (4,1)-(5,0) = {2,8} → elimina {2,8} de (5,1)
const CON_PARES = [
  [0, 0, 0, 8, 0, 7, 0, 0, 0],
  [0, 0, 4, 0, 3, 9, 0, 0, 6],
  [7, 0, 5, 2, 0, 6, 0, 4, 9],
  [6, 3, 0, 4, 5, 2, 0, 0, 7],
  [4, 0, 1, 0, 7, 0, 9, 0, 5],
  [0, 0, 0, 0, 9, 0, 6, 0, 0],
  [0, 7, 3, 0, 8, 5, 0, 0, 2],
  [0, 0, 2, 7, 6, 0, 5, 9, 0],
  [5, 6, 8, 9, 0, 4, 0, 7, 0],
];

// Tablero donde todos los pares detectados están "aislados": ninguna
// otra casilla de la unidad comparte sus candidatos, por lo que no
// eliminan nada.
const PARES_SIN_ELIMINAR = [
  [0, 6, 0, 0, 0, 0, 9, 5, 2],
  [9, 0, 8, 0, 4, 0, 3, 6, 1],
  [5, 1, 2, 9, 3, 0, 0, 8, 7],
  [0, 0, 5, 8, 0, 3, 1, 0, 9],
  [8, 9, 7, 2, 1, 0, 6, 0, 0],
  [6, 3, 0, 4, 0, 9, 8, 0, 0],
  [4, 0, 0, 0, 2, 0, 7, 1, 6],
  [1, 2, 3, 0, 0, 0, 5, 4, 0],
  [7, 8, 6, 0, 5, 4, 2, 9, 0],
];

// Tablero donde (5,2) tiene candidatos {1,7}. El par desnudo de la
// caja 3-5/0-1, celdas (3,1) y (5,1) = {1,2}, elimina el 1 de (5,2),
// habilitando un naked single 7 que antes no existía.
const PAR_HABILITA_SINGLE = [
  [1, 7, 0, 0, 0, 0, 0, 9, 5],
  [0, 0, 0, 7, 9, 3, 8, 1, 2],
  [2, 9, 0, 0, 0, 0, 6, 0, 7],
  [5, 0, 4, 0, 0, 0, 0, 0, 0],
  [8, 3, 6, 0, 4, 1, 0, 0, 0],
  [9, 0, 0, 0, 0, 0, 5, 8, 4],
  [3, 8, 2, 0, 1, 0, 0, 5, 0],
  [0, 6, 0, 3, 2, 0, 0, 0, 8],
  [7, 5, 0, 6, 8, 9, 0, 0, 0],
];

// Estado intermedio de SE_BLOQUEA_DESPUES tras sus 8 singles: no queda
// ningún single, pero hay pares desnudos aplicables. Al aplicarlos se
// habilitan los singles que permiten terminarlo.
const PAR_HABILITA_SINGLES_SIN_SINGLES = [
  [9, 8, 4, 2, 3, 0, 0, 0, 5],
  [0, 0, 5, 0, 0, 0, 0, 0, 4],
  [0, 1, 0, 5, 4, 0, 8, 0, 0],
  [0, 0, 0, 7, 9, 5, 0, 3, 0],
  [7, 5, 0, 0, 0, 6, 0, 0, 0],
  [0, 0, 0, 0, 2, 0, 7, 5, 0],
  [6, 4, 0, 0, 0, 0, 5, 0, 7],
  [8, 0, 0, 0, 5, 0, 0, 4, 9],
  [5, 0, 0, 0, 0, 4, 0, 1, 0],
];

// Puzzle válido de solución única que se queda bloqueado incluso con
// naked pairs (usa 1, pero no alcanza para terminar).
const BLOQUEADO_CON_PASOS = [
  [3, 0, 6, 1, 0, 0, 4, 0, 5],
  [0, 0, 2, 0, 0, 0, 0, 0, 7],
  [7, 1, 0, 5, 9, 0, 0, 0, 3],
  [6, 0, 0, 7, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 7, 0, 0],
  [0, 5, 0, 0, 0, 0, 0, 3, 0],
  [0, 0, 0, 0, 2, 5, 8, 7, 0],
  [0, 0, 5, 0, 8, 7, 9, 1, 4],
  [0, 0, 0, 6, 1, 9, 0, 5, 0],
];

// ------------------------------------------------------------
// Fixtures inválidos / contradictorios
// ------------------------------------------------------------

// Sin repetidos, pero (0,0) no tiene candidato posible:
// la fila 0 contiene 1-8 (bloquea 1-8) y la columna 0 contiene 9.
const CASILLA_MUERTA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [9, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

function conValor(base, fila, columna, valor) {
  const copia = copiarTablero(base);
  copia[fila][columna] = valor;
  return copia;
}

// Repetición solo en fila: el 5 aparece en (0,0) y (0,6)
const DUPLICADO_FILA = conValor(RESOLUBLE_SINGLES, 0, 6, 5);

// Repetición solo en columna: el 6 aparece dos veces en la columna 0
const DUPLICADO_COLUMNA = conValor(RESOLUBLE_SINGLES, 6, 0, 6);

// Repetición solo en caja: el 3 aparece en (0,1) y (1,2), ambas en la caja 0
const DUPLICADO_CAJA = conValor(RESOLUBLE_SINGLES, 1, 2, 3);

// Valor fuera de rango permitido (0..9)
const FUERA_DE_RANGO = conValor(RESOLUBLE_SINGLES, 0, 2, 10);

// Estructura incorrecta: una fila con 8 celdas
const ESTRUCTURA_ROTA = RESOLUBLE_SINGLES.map((fila, i) =>
  i === 4 ? fila.slice(0, 8) : fila
);

// ------------------------------------------------------------
// Candidatos
// ------------------------------------------------------------

test("obtenerCandidatos limita por fila, columna y caja", () => {
  // (0,0): fila tiene 4-9, columna 4-9 y 8,9, caja 4-9 → quedan 1,2
  assert.deepEqual(obtenerCandidatos(CON_CANDIDATOS, 0, 0), [1, 2]);
  // (0,3) está ocupada (valor 4): sin candidatos
  assert.deepEqual(obtenerCandidatos(CON_CANDIDATOS, 0, 3), []);
  assert.deepEqual(obtenerCandidatos(CON_CANDIDATOS, 3, 0), [2]);
});

test("obtenerCandidatos devuelve [] en casillas ocupadas", () => {
  assert.deepEqual(obtenerCandidatos(CON_CANDIDATOS, 1, 0), []);
});

// ------------------------------------------------------------
// Naked singles
// ------------------------------------------------------------

test("detectarNakedSingles encuentra casillas con un solo candidato", () => {
  const naked = detectarNakedSingles(CON_CANDIDATOS);

  // (3,0) solo puede ser 2; (5,2) solo puede ser 1
  assert.ok(
    naked.some(
      (s) =>
        s.fila === 3 &&
        s.columna === 0 &&
        s.numero === 2 &&
        s.tecnica === TECNICAS.NAKED_SINGLE
    )
  );
  assert.ok(naked.some((s) => s.fila === 5 && s.columna === 2 && s.numero === 1));

  // (0,0) tiene dos candidatos: no es naked single
  assert.ok(!naked.some((s) => s.fila === 0 && s.columna === 0));
});

test("detectarNakedSingles no devuelve nada cuando no hay singles", () => {
  assert.deepEqual(detectarNakedSingles(SIN_SINGLES), []);
});

// ------------------------------------------------------------
// Hidden singles
// ------------------------------------------------------------

test("detectarHiddenSingles encuentra números con una sola casilla en la unidad", () => {
  const hidden = detectarHiddenSingles(CON_CANDIDATOS);

  // (3,2) tiene dos candidatos {3,4}, pero el 4 solo cabe ahí en la fila 3
  const cuatro = hidden.filter((s) => s.fila === 3 && s.columna === 2 && s.numero === 4);
  assert.equal(cuatro.length, 1);
  assert.equal(cuatro[0].tecnica, TECNICAS.HIDDEN_SINGLE);
  assert.equal(cuatro[0].unidad, "fila");

  // (3,2) no debe aparecer como naked single
  assert.ok(
    !detectarNakedSingles(CON_CANDIDATOS).some((s) => s.fila === 3 && s.columna === 2)
  );

  // Sin repetir la misma casilla/número en varias unidades
  const claves = hidden.map((s) => `${s.fila},${s.columna},${s.numero}`);
  assert.equal(new Set(claves).size, claves.length);
});

test("detectarHiddenSingles no encuentra nada en un puzzle sin singles", () => {
  assert.deepEqual(detectarHiddenSingles(SIN_SINGLES), []);
});

// ------------------------------------------------------------
// Naked pairs
// ------------------------------------------------------------

test("detectarNakedPares encuentra pares en fila, columna y caja", () => {
  const pares = detectarNakedPares(CON_PARES);

  const deFila = pares.find(
    (p) =>
      p.tecnica === TECNICAS.NAKED_PAIR &&
      p.unidad === "fila" &&
      p.candidatos.join(",") === "1,3"
  );
  assert.ok(deFila);
  assert.deepEqual(deFila.celdas, [
    [8, 6],
    [8, 8],
  ]);
  assert.ok(
    deFila.eliminados.some(
      ([fila, columna, numero]) => fila === 8 && columna === 4 && numero === 1
    )
  );

  const deColumna = pares.find(
    (p) =>
      p.unidad === "columna" &&
      p.celdas.some(([f, c]) => f === 0 && c === 8) &&
      p.celdas.some(([f, c]) => f === 8 && c === 8)
  );
  assert.ok(deColumna);
  assert.deepEqual(deColumna.candidatos, [1, 3]);
  assert.ok(
    deColumna.eliminados.some(([f, c, n]) => f === 5 && c === 8 && n === 1)
  );

  const deCaja = pares.find(
    (p) =>
      p.unidad === "caja" &&
      p.candidatos.join(",") === "2,8" &&
      p.celdas.some(([f, c]) => f === 5 && c === 0)
  );
  assert.ok(deCaja);
  assert.deepEqual(deCaja.eliminados, [
    [5, 1, 2],
    [5, 1, 8],
  ]);
});

test("detectarNakedPares no encuentra nada en un puzzle sin pares", () => {
  assert.deepEqual(detectarNakedPares(SIN_SINGLES), []);
});

test("detectarNakedPares devuelve el par aunque no elimine candidatos", () => {
  const pares = detectarNakedPares(PARES_SIN_ELIMINAR);

  // Hay pares detectados, pero ninguno descarta candidatos
  assert.ok(pares.length > 0);
  assert.ok(pares.every((p) => p.eliminados.length === 0));
});

test("una eliminación de par habilita un naked single", () => {
  // Antes de eliminar, (5,2) tiene dos candidatos y no es naked single
  assert.deepEqual(obtenerCandidatos(PAR_HABILITA_SINGLE, 5, 2), [1, 7]);
  assert.ok(
    !detectarNakedSingles(PAR_HABILITA_SINGLE).some(
      (s) => s.fila === 5 && s.columna === 2
    )
  );

  const par = detectarNakedPares(PAR_HABILITA_SINGLE).find(
    (p) =>
      p.unidad === "caja" &&
      p.candidatos.join(",") === "1,2" &&
      p.celdas.some(([f, c]) => f === 3 && c === 1)
  );
  assert.ok(par);
  assert.deepEqual(par.eliminados, [[5, 2, 1]]);

  // Tras descontar el candidato eliminado, (5,2) pasa a ser naked single 7
  const eliminados = new Set(par.eliminados.map(([f, c, n]) => `${f},${c},${n}`));
  const singles = detectarNakedSingles(PAR_HABILITA_SINGLE, eliminados);
  assert.ok(
    singles.some((s) => s.fila === 5 && s.columna === 2 && s.numero === 7)
  );
});

test("resolverLogico aplica el par y luego los singles que habilita", () => {
  // Este estado arranca sin ningún single: la única técnica disponible
  // es un par desnudo. Debe aplicarlo y después continuar con singles.
  assert.equal(detectarNakedSingles(PAR_HABILITA_SINGLES_SIN_SINGLES).length, 0);
  assert.equal(detectarHiddenSingles(PAR_HABILITA_SINGLES_SIN_SINGLES).length, 0);

  const { estado, pasos } = resolverLogico(PAR_HABILITA_SINGLES_SIN_SINGLES);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(pasos[0].tecnica, TECNICAS.NAKED_PAIR);
  assert.ok(
    pasos.some(
      (p) =>
        p.tecnica === TECNICAS.NAKED_SINGLE ||
        p.tecnica === TECNICAS.HIDDEN_SINGLE
    )
  );
});

test("un par que no elimina candidatos no se registra ni coloca números", () => {
  const original = copiarTablero(PARES_SIN_ELIMINAR);
  const { pasos, tablero } = resolverLogico(PARES_SIN_ELIMINAR);

  assert.ok(!pasos.some((p) => p.tecnica === TECNICAS.NAKED_PAIR));
  assert.deepEqual(PARES_SIN_ELIMINAR, original);

  // Los pasos aplicados siguen siendo colocaciones válidas
  for (const paso of pasos) {
    assert.ok(paso.numero >= 1 && paso.numero <= 9);
  }
  assert.equal(tableroEsValido(tablero), true);
});

test("los pasos de naked pair registran unidad, posiciones y eliminados", () => {
  const { pasos } = resolverLogico(PAR_HABILITA_SINGLES_SIN_SINGLES);
  const par = pasos.find((p) => p.tecnica === TECNICAS.NAKED_PAIR);

  assert.ok(par);
  assert.ok(["fila", "columna", "caja"].includes(par.unidad));
  assert.equal(par.celdas.length, 2);
  assert.equal(par.candidatos.length, 2);
  assert.ok(par.eliminados.length > 0);
  for (const [fila, columna, numero] of par.eliminados) {
    assert.ok(fila >= 0 && fila < 9 && columna >= 0 && columna < 9);
    assert.ok(par.candidatos.includes(numero));
  }
  // Los pasos de par NO colocan números
  assert.equal(par.numero, undefined);
});

// ------------------------------------------------------------
// Naked triples
// ------------------------------------------------------------

// Fila 0: falta {1,2,3,4}. El 4 de la caja 0 bloquea (0,0),(0,1),(0,2),
// cuyos candidatos son los tres {1,2,3}; el trío desnudo elimina esos
// tres números de (0,3).
const NAKED_TRIPLE_FILA = [
  [0, 0, 0, 0, 5, 6, 7, 8, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Misma fila 0, pero las tres casillas del trío tienen dos candidatos
// cada una: (0,0)={1,2}, (0,1)={2,3} y (0,2)={1,3}.
const NAKED_TRIPLE_DOS_CANDIDATOS = [
  [0, 0, 0, 0, 5, 6, 7, 8, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 0],
  [3, 1, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Columna 0: falta {1,2,3,4}. El 4 de la caja 0 bloquea las filas 0-2,
// que quedan con {1,2,3}; el trío elimina esos números de (3,0).
const NAKED_TRIPLE_COLUMNA = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [6, 0, 0, 0, 0, 0, 0, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 0],
  [8, 0, 0, 0, 0, 0, 0, 0, 0],
  [9, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Caja 0: (0,0),(0,1),(0,2) quedan con {1,2,3}; el trío elimina esos
// números de la otra casilla vacía de la caja, (1,0).
const NAKED_TRIPLE_CAJA = [
  [0, 0, 0, 4, 5, 6, 7, 8, 9],
  [0, 5, 6, 7, 8, 9, 0, 0, 0],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Trío en la fila 0 formado por las únicas tres casillas vacías, sin
// ninguna otra casilla en la unidad de la que eliminar candidatos.
const NAKED_TRIPLE_SIN_ELIMINAR = [
  [0, 0, 0, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 8, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 5, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Solución completa con huecos aislados: cada hueco es un naked single,
// así que no existe ningún trío.
const SIN_TRIPLES = [
  [0, 2, 3, 4, 5, 6, 7, 8, 9],
  [4, 5, 6, 7, 0, 9, 1, 2, 3],
  [7, 8, 9, 1, 2, 3, 4, 0, 6],
  [2, 0, 4, 5, 6, 7, 8, 9, 1],
  [5, 6, 7, 8, 9, 1, 0, 3, 4],
  [8, 9, 1, 2, 3, 4, 5, 6, 7],
  [3, 4, 5, 6, 7, 8, 9, 1, 2],
  [6, 7, 8, 9, 1, 2, 3, 4, 5],
  [9, 1, 2, 3, 4, 5, 6, 7, 8],
];

test("detectarNakedTriples encuentra un trío en una fila", () => {
  const triples = detectarNakedTriples(NAKED_TRIPLE_FILA);
  const triple = triples.find(
    (t) =>
      t.unidad === "fila" &&
      t.candidatos.join(",") === "1,2,3" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.equal(triple.tecnica, TECNICAS.NAKED_TRIPLE);
  assert.deepEqual(triple.celdas, [
    [0, 0],
    [0, 1],
    [0, 2],
  ]);
  assert.deepEqual(triple.eliminados, [
    [0, 3, 1],
    [0, 3, 2],
    [0, 3, 3],
  ]);
});

test("detectarNakedTriples encuentra un trío en una columna", () => {
  const triples = detectarNakedTriples(NAKED_TRIPLE_COLUMNA);
  const triple = triples.find(
    (t) =>
      t.unidad === "columna" &&
      t.candidatos.join(",") === "1,2,3" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.celdas, [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  assert.deepEqual(triple.eliminados, [
    [3, 0, 1],
    [3, 0, 2],
    [3, 0, 3],
  ]);
});

test("detectarNakedTriples encuentra un trío en una caja", () => {
  const triples = detectarNakedTriples(NAKED_TRIPLE_CAJA);
  const triple = triples.find(
    (t) =>
      t.unidad === "caja" &&
      t.candidatos.join(",") === "1,2,3" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.celdas, [
    [0, 0],
    [0, 1],
    [0, 2],
  ]);
  assert.deepEqual(triple.eliminados, [
    [1, 0, 1],
    [1, 0, 2],
    [1, 0, 3],
  ]);
});

test("detectarNakedTriples detecta un trío de casillas con dos candidatos", () => {
  // Las tres casillas del trío tienen exactamente dos candidatos
  assert.deepEqual(obtenerCandidatos(NAKED_TRIPLE_DOS_CANDIDATOS, 0, 0), [1, 2]);
  assert.deepEqual(obtenerCandidatos(NAKED_TRIPLE_DOS_CANDIDATOS, 0, 1), [2, 3]);
  assert.deepEqual(obtenerCandidatos(NAKED_TRIPLE_DOS_CANDIDATOS, 0, 2), [1, 3]);

  const triples = detectarNakedTriples(NAKED_TRIPLE_DOS_CANDIDATOS);
  const triple = triples.find(
    (t) =>
      t.unidad === "fila" &&
      t.candidatos.join(",") === "1,2,3" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.celdas, [
    [0, 0],
    [0, 1],
    [0, 2],
  ]);
  assert.ok(
    triple.celdas.every(
      ([fila, columna]) =>
        obtenerCandidatos(NAKED_TRIPLE_DOS_CANDIDATOS, fila, columna).length === 2
    )
  );
  assert.deepEqual(triple.eliminados, [
    [0, 3, 1],
    [0, 3, 2],
    [0, 3, 3],
  ]);
});

test("detectarNakedTriples no encuentra nada en un puzzle sin tríos", () => {
  assert.deepEqual(detectarNakedTriples(SIN_TRIPLES), []);
});

test("un trío sin eliminaciones no es un paso efectivo", () => {
  const triples = detectarNakedTriples(NAKED_TRIPLE_SIN_ELIMINAR);
  const triple = triples.find(
    (t) =>
      t.unidad === "fila" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  // El trío se detecta, pero no descarta ningún candidato...
  assert.ok(triple);
  assert.deepEqual(triple.eliminados, []);
  // ...así que ninguno de los tríos detectados sería un paso efectivo.
  assert.equal(triples.some((t) => t.eliminados.length > 0), false);
});

test("detectarNakedTriples respeta eliminaciones previas y evita duplicarlas", () => {
  // Ya se descartó el 1 de (0,3): el trío sigue detectándose, pero solo
  // registra el 2 y el 3 de (0,3), sin repetir el 1.
  const previos = new Set(["0,3,1"]);
  const triples = detectarNakedTriples(NAKED_TRIPLE_DOS_CANDIDATOS, previos);
  const triple = triples.find(
    (t) =>
      t.unidad === "fila" &&
      t.candidatos.join(",") === "1,2,3" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.eliminados, [
    [0, 3, 2],
    [0, 3, 3],
  ]);
});

test("una eliminación de trío habilita un naked single", () => {
  // (0,3) empieza con cuatro candidatos: no es naked single.
  assert.deepEqual(obtenerCandidatos(NAKED_TRIPLE_DOS_CANDIDATOS, 0, 3), [1, 2, 3, 4]);
  assert.ok(
    !detectarNakedSingles(NAKED_TRIPLE_DOS_CANDIDATOS).some(
      (s) => s.fila === 0 && s.columna === 3
    )
  );

  const triple = detectarNakedTriples(NAKED_TRIPLE_DOS_CANDIDATOS).find(
    (t) =>
      t.unidad === "fila" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );
  assert.ok(triple);

  // Tras descontar los candidatos eliminados, (0,3) pasa a ser naked single 4
  const eliminados = new Set(
    triple.eliminados.map(([fila, columna, numero]) => `${fila},${columna},${numero}`)
  );
  const singles = detectarNakedSingles(NAKED_TRIPLE_DOS_CANDIDATOS, eliminados);
  assert.ok(
    singles.some((s) => s.fila === 0 && s.columna === 3 && s.numero === 4)
  );
});

test("detectarNakedTriples no modifica el tablero original", () => {
  const original = copiarTablero(NAKED_TRIPLE_FILA);
  detectarNakedTriples(NAKED_TRIPLE_FILA);
  assert.deepEqual(NAKED_TRIPLE_FILA, original);
});

// ------------------------------------------------------------
// Naked quads
// ------------------------------------------------------------

// Fila 0: falta {1,2,3,4,5}. El 5 de la caja 0 bloquea (0,0), (0,1) y
// (0,2), y el 5 de la columna 3 bloquea (0,3), así que esas cuatro
// casillas tienen exactamente {1,2,3,4}. El cuarteto desnudo elimina
// esos cuatro números de (0,4), que queda con el 5.
const NAKED_QUAD_FILA = [
  [0, 0, 0, 0, 0, 6, 7, 8, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 5, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Traspuesta del fixture anterior: el cuarteto está en la columna 0
// ((0,0)-(3,0)) y elimina {1,2,3,4} de (4,0).
const NAKED_QUAD_COLUMNA = [
  [0, 0, 5, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 5, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [6, 0, 0, 0, 0, 0, 0, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 0],
  [8, 0, 0, 0, 0, 0, 0, 0, 0],
  [9, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Caja 0: falta {1,2,3,4,5}. Las casillas (0,0), (0,1), (1,0) y (1,1)
// combinan {1,2,3,4} y el cuarteto elimina esos números de (2,2).
const NAKED_QUAD_CAJA = [
  [0, 0, 6, 4, 5, 0, 0, 0, 0],
  [0, 0, 7, 0, 0, 0, 5, 0, 0],
  [8, 9, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Cuarteto en la fila 0 con subconjuntos distintos: (0,0)={1,2},
// (0,1)={2,3}, (0,2)={3,4} y (0,3)={1,4}. La unión es {1,2,3,4}.
const NAKED_QUAD_SUBCONJUNTOS = [
  [0, 0, 0, 0, 0, 6, 7, 8, 9],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 2, 5, 0, 0, 0, 0, 0],
  [4, 0, 0, 2, 0, 0, 0, 0, 0],
  [0, 1, 0, 3, 0, 0, 0, 0, 0],
  [0, 4, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Fila 0: las cuatro primeras casillas combinan cinco números
// ({1,2,3,4,5}), por lo que no forman un cuarteto desnudo.
const NAKED_QUAD_CINCO = [
  [0, 0, 0, 0, 0, 6, 7, 8, 9],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 1, 2, 0, 0, 0, 0, 0, 0],
  [4, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 3, 0, 0, 0, 0, 0],
  [0, 4, 1, 2, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Fila 0: las cuatro casillas vacías combinan {1,2,3,4}, pero son las
// únicas vacías de la fila, así que no hay ninguna eliminación real.
const NAKED_QUAD_SIN_ELIMINAR = [
  [0, 0, 0, 0, 5, 6, 7, 8, 9],
  [4, 5, 6, 0, 0, 0, 0, 0, 0],
  [7, 8, 9, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

test("detectarNakedQuads encuentra un cuarteto en una fila", () => {
  const quads = detectarNakedQuads(NAKED_QUAD_FILA);
  const quad = quads.find(
    (q) =>
      q.tecnica === TECNICAS.NAKED_QUAD &&
      q.unidad === "fila" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.equal(TECNICAS.NAKED_QUAD, "naked-quad");
  assert.deepEqual(quad.celdas, [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ]);
  assert.deepEqual(quad.candidatos, [1, 2, 3, 4]);
  assert.deepEqual(quad.eliminados, [
    [0, 4, 1],
    [0, 4, 2],
    [0, 4, 3],
    [0, 4, 4],
  ]);
});

test("detectarNakedQuads encuentra un cuarteto en una columna", () => {
  const quads = detectarNakedQuads(NAKED_QUAD_COLUMNA);
  const quad = quads.find(
    (q) =>
      q.unidad === "columna" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.celdas, [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ]);
  assert.deepEqual(quad.candidatos, [1, 2, 3, 4]);
  assert.deepEqual(quad.eliminados, [
    [4, 0, 1],
    [4, 0, 2],
    [4, 0, 3],
    [4, 0, 4],
  ]);
});

test("detectarNakedQuads encuentra un cuarteto en una caja", () => {
  const quads = detectarNakedQuads(NAKED_QUAD_CAJA);
  const quad = quads.find(
    (q) =>
      q.unidad === "caja" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.celdas, [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]);
  assert.deepEqual(quad.candidatos, [1, 2, 3, 4]);
  assert.deepEqual(quad.eliminados, [
    [2, 2, 1],
    [2, 2, 2],
    [2, 2, 3],
    [2, 2, 4],
  ]);
});

test("detectarNakedQuads acepta casillas con subconjuntos distintos", () => {
  // Cada casilla del grupo tiene un subconjunto diferente de {1,2,3,4}
  assert.deepEqual(obtenerCandidatos(NAKED_QUAD_SUBCONJUNTOS, 0, 0), [1, 2]);
  assert.deepEqual(obtenerCandidatos(NAKED_QUAD_SUBCONJUNTOS, 0, 1), [2, 3]);
  assert.deepEqual(obtenerCandidatos(NAKED_QUAD_SUBCONJUNTOS, 0, 2), [3, 4]);
  assert.deepEqual(obtenerCandidatos(NAKED_QUAD_SUBCONJUNTOS, 0, 3), [1, 4]);

  const quad = detectarNakedQuads(NAKED_QUAD_SUBCONJUNTOS).find(
    (q) =>
      q.unidad === "fila" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.candidatos, [1, 2, 3, 4]);
  assert.deepEqual(quad.eliminados, [
    [0, 4, 1],
    [0, 4, 2],
    [0, 4, 3],
    [0, 4, 4],
  ]);
});

test("detectarNakedQuads rechaza un grupo cuya unión tiene cinco candidatos", () => {
  const grupo = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ];
  const union = new Set(
    grupo.flatMap(([fila, columna]) =>
      obtenerCandidatos(NAKED_QUAD_CINCO, fila, columna)
    )
  );
  assert.equal(union.size, 5);

  const quads = detectarNakedQuads(NAKED_QUAD_CINCO);
  assert.equal(
    quads.filter(
      (q) => q.unidad === "fila" && q.celdas.some(([fila]) => fila === 0)
    ).length,
    0
  );
});

test("detectarNakedQuads no devuelve cuartetos sin eliminaciones reales", () => {
  const grupo = [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ];
  // Las cuatro casillas combinan exactamente {1,2,3,4}...
  assert.equal(
    new Set(
      grupo.flatMap(([fila, columna]) =>
        obtenerCandidatos(NAKED_QUAD_SIN_ELIMINAR, fila, columna)
      )
    ).size,
    4
  );

  // ...pero al no haber otra casilla vacía en la fila no eliminan nada,
  // así que no se registran como deducción.
  const quads = detectarNakedQuads(NAKED_QUAD_SIN_ELIMINAR);
  assert.equal(
    quads.filter(
      (q) => q.unidad === "fila" && q.celdas.some(([fila]) => fila === 0)
    ).length,
    0
  );
  assert.ok(quads.every((q) => q.eliminados.length > 0));
});

test("detectarNakedQuads respeta eliminaciones previas y no las repite", () => {
  // Ya se descartaron el 1 y el 2 de (0,4): el cuarteto sigue
  // detectándose, pero solo registra el 3 y el 4 de esa casilla.
  const previos = new Set(["0,4,1", "0,4,2"]);
  const quad = detectarNakedQuads(NAKED_QUAD_FILA, previos).find(
    (q) =>
      q.unidad === "fila" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.eliminados, [
    [0, 4, 3],
    [0, 4, 4],
  ]);
});

test("detectarNakedQuads no modifica el tablero original", () => {
  const original = copiarTablero(NAKED_QUAD_FILA);
  detectarNakedQuads(NAKED_QUAD_FILA);
  assert.deepEqual(NAKED_QUAD_FILA, original);
});

test("detectarNakedQuads no produce falsos positivos sin cuartetos", () => {
  // Las casillas vacías de SIN_TRIPLES están aisladas: ninguna unidad
  // reúne cuatro casillas vacías, así que no puede haber cuarteto.
  assert.deepEqual(detectarNakedQuads(SIN_TRIPLES), []);
});

// ------------------------------------------------------------
// Clasificación del tablero
// ------------------------------------------------------------

test("clasificarTablero distingue resuelto, resoluble y bloqueado", () => {
  assert.equal(clasificarTablero(SOLUCION), ESTADOS.RESUELTO);
  assert.equal(clasificarTablero(RESOLUBLE_SINGLES), ESTADOS.RESOLUBLE);
  assert.equal(clasificarTablero(SIN_SINGLES), ESTADOS.BLOQUEADO);
});

// ------------------------------------------------------------
// Validación de tableros
// ------------------------------------------------------------

test("tableroEsValido acepta tableros correctos", () => {
  assert.equal(tableroEsValido(SOLUCION), true);
  assert.equal(tableroEsValido(RESOLUBLE_SINGLES), true);
  assert.equal(tableroEsValido(SIN_SINGLES), true);
  // Sin repetidos, aunque tenga una casilla muerta: eso lo detecta
  // la clasificación, no la validez estructural.
  assert.equal(tableroEsValido(CASILLA_MUERTA), true);
});

test("tableroEsValido rechaza repetidos en fila, columna y caja", () => {
  assert.equal(tableroEsValido(DUPLICADO_FILA), false);
  assert.equal(tableroEsValido(DUPLICADO_COLUMNA), false);
  assert.equal(tableroEsValido(DUPLICADO_CAJA), false);
});

test("tableroEsValido rechaza valores fuera de rango y estructuras rotas", () => {
  assert.equal(tableroEsValido(FUERA_DE_RANGO), false);
  assert.equal(tableroEsValido(ESTRUCTURA_ROTA), false);
  assert.equal(tableroEsValido([[0]]), false);
});

// ------------------------------------------------------------
// Tableros inválidos y contradictorios
// ------------------------------------------------------------

test("resuelto solo se devuelve con tablero completo y sin repetidos", () => {
  const solucionConDup = conValor(SOLUCION, 4, 0, 9);
  // Completo pero con repetidos: no es "resuelto"
  assert.equal(clasificarTablero(solucionConDup), ESTADOS.INVALIDO);
  assert.equal(clasificarTablero(SOLUCION), ESTADOS.RESUELTO);
});

test("clasificarTablero marca invalido los tableros con repetidos", () => {
  assert.equal(clasificarTablero(DUPLICADO_FILA), ESTADOS.INVALIDO);
  assert.equal(clasificarTablero(DUPLICADO_COLUMNA), ESTADOS.INVALIDO);
  assert.equal(clasificarTablero(DUPLICADO_CAJA), ESTADOS.INVALIDO);
  assert.equal(clasificarTablero(FUERA_DE_RANGO), ESTADOS.INVALIDO);
  assert.equal(clasificarTablero(ESTRUCTURA_ROTA), ESTADOS.INVALIDO);
});

test("una casilla vacía sin candidatos es invalido, no bloqueado", () => {
  // Sin repetidos, pero (0,0) no puede ser ningún número
  assert.equal(obtenerCandidatos(CASILLA_MUERTA, 0, 0).length, 0);
  assert.equal(clasificarTablero(CASILLA_MUERTA), ESTADOS.INVALIDO);
});

test("resolverLogico no aplica pasos sobre tableros inválidos", () => {
  for (const invalido of [
    DUPLICADO_FILA,
    DUPLICADO_COLUMNA,
    DUPLICADO_CAJA,
    FUERA_DE_RANGO,
    ESTRUCTURA_ROTA,
    CASILLA_MUERTA,
  ]) {
    const original = copiarTablero(invalido);
    const { estado, pasos, tablero } = resolverLogico(invalido);

    assert.equal(estado, ESTADOS.INVALIDO);
    assert.equal(pasos.length, 0);
    assert.deepEqual(tablero, original); // ni siquiera intenta deducir
    assert.deepEqual(invalido, original); // el original queda intacto
  }
});

test("resolverLogico devuelve invalido sin lanzar si la entrada no es un tablero", () => {
  for (const entrada of [null, undefined, "texto"]) {
    let resultado;
    assert.doesNotThrow(() => {
      resultado = resolverLogico(entrada);
    });
    assert.equal(resultado.estado, ESTADOS.INVALIDO);
    assert.deepEqual(resultado.pasos, []);
    // Entrada no copiable: se devuelve tal cual, sin transformarla.
    assert.equal(resultado.tablero, entrada);
  }
});

test("resolverLogico devuelve invalido sin lanzar si una fila no es copiable", () => {
  const entrada = [null];
  let resultado;
  assert.doesNotThrow(() => {
    resultado = resolverLogico(entrada);
  });
  assert.equal(resultado.estado, ESTADOS.INVALIDO);
  assert.deepEqual(resultado.pasos, []);
  // Entrada no copiable: se devuelve tal cual, sin transformarla.
  assert.equal(resultado.tablero, entrada);
});

test("resolverLogico conserva el contrato de copia en tableros inválidos copiables", () => {
  const original = copiarTablero(ESTRUCTURA_ROTA);
  const { estado, pasos, tablero } = resolverLogico(ESTRUCTURA_ROTA);

  assert.equal(estado, ESTADOS.INVALIDO);
  assert.deepEqual(pasos, []);
  assert.deepEqual(tablero, original);
  assert.notEqual(tablero, ESTRUCTURA_ROTA);
  assert.notEqual(tablero[0], ESTRUCTURA_ROTA[0]);
  assert.deepEqual(ESTRUCTURA_ROTA, original);
});

test("una entrada válida conserva estado, pasos y tablero original", () => {
  const original = copiarTablero(RESOLUBLE_SINGLES);
  const { estado, pasos, tablero } = resolverLogico(RESOLUBLE_SINGLES);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(pasos.length, 51);
  assert.deepEqual(tablero, SOLUCION);
  assert.deepEqual(RESOLUBLE_SINGLES, original);
});

// ------------------------------------------------------------
// resolverLogico
// ------------------------------------------------------------

test("resolverLogico resuelve por completo un puzzle de solución única", () => {
  const original = copiarTablero(RESOLUBLE_SINGLES);
  const { estado, pasos, tablero } = resolverLogico(RESOLUBLE_SINGLES);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);
  assert.equal(pasos.length, 51); // 81 - 30 pistas iniciales

  // Cada paso registra su técnica y, si coloca, su número
  for (const paso of pasos) {
    if (paso.tecnica === TECNICAS.NAKED_PAIR) {
      assert.equal(paso.numero, undefined);
      continue;
    }
    assert.ok(
      paso.tecnica === TECNICAS.NAKED_SINGLE || paso.tecnica === TECNICAS.HIDDEN_SINGLE
    );
    assert.ok(paso.numero >= 1 && paso.numero <= 9);
  }

  // El tablero original no se modifica
  assert.deepEqual(RESOLUBLE_SINGLES, original);
});

test("cada paso de resolverLogico es válido contra el tablero del momento", () => {
  const { pasos, tablero } = resolverLogico(RESOLUBLE_SINGLES);

  // Reproducimos los pasos uno por uno: si el solucionador no
  // recalculara los singles, en algún paso esValido fallaría.
  const enJuego = copiarTablero(RESOLUBLE_SINGLES);
  for (const paso of pasos) {
    if (paso.tecnica === TECNICAS.NAKED_PAIR) continue; // no coloca
    assert.ok(
      esValido(enJuego, paso.fila, paso.columna, paso.numero),
      `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
    );
    enJuego[paso.fila][paso.columna] = paso.numero;
  }

  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("aplicarColocacion coloca un número válido", () => {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));

  aplicarColocacion(tablero, { fila: 0, columna: 0, numero: 5 });

  assert.equal(tablero[0][0], 5);
});

test("aplicarColocacion rechaza un número que contradice la fila", () => {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));
  tablero[0][5] = 5;
  const original = copiarTablero(tablero);

  assert.throws(
    () => aplicarColocacion(tablero, { fila: 0, columna: 0, numero: 5 }),
    /colocación inválida/
  );
  assert.deepEqual(tablero, original);
});

test("aplicarColocacion rechaza un número que contradice la columna", () => {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));
  tablero[5][0] = 5;
  const original = copiarTablero(tablero);

  assert.throws(
    () => aplicarColocacion(tablero, { fila: 0, columna: 0, numero: 5 }),
    /colocación inválida/
  );
  assert.deepEqual(tablero, original);
});

test("aplicarColocacion rechaza un número que contradice la caja", () => {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));
  tablero[1][1] = 5;
  const original = copiarTablero(tablero);

  assert.throws(
    () => aplicarColocacion(tablero, { fila: 0, columna: 0, numero: 5 }),
    /colocación inválida/
  );
  assert.deepEqual(tablero, original);
});

test("un fallo de colocación no deja el tablero parcialmente modificado", () => {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));
  tablero[0][8] = 7;
  tablero[8][0] = 7;
  const original = copiarTablero(tablero);

  assert.throws(
    () => aplicarColocacion(tablero, { fila: 0, columna: 0, numero: 7 }),
    /colocación inválida/
  );
  assert.deepEqual(tablero, original);
});

test("los naked pairs desbloquean un puzzle estancado con singles", () => {
  const original = copiarTablero(SE_BLOQUEA_DESPUES);
  const { estado, pasos, tablero } = resolverLogico(SE_BLOQUEA_DESPUES);

  // Con singles solos este puzzle se detenía; ahora los pares desnudos
  // habilitan los singles que faltaban y lo terminan.
  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);
  assert.ok(pasos.some((p) => p.tecnica === TECNICAS.NAKED_PAIR));

  // Justo antes del primer par no había ningún single disponible
  const indicePar = pasos.findIndex((p) => p.tecnica === TECNICAS.NAKED_PAIR);
  assert.ok(indicePar > 0);
  const antes = copiarTablero(SE_BLOQUEA_DESPUES);
  for (let i = 0; i < indicePar; i++) {
    const paso = pasos[i];
    antes[paso.fila][paso.columna] = paso.numero;
  }
  assert.equal(detectarNakedSingles(antes).length, 0);
  assert.equal(detectarHiddenSingles(antes).length, 0);
  assert.ok(detectarNakedPares(antes).some((p) => p.eliminados.length > 0));

  // El tablero original no se modifica
  assert.deepEqual(SE_BLOQUEA_DESPUES, original);
});

test("resolverLogico sigue bloqueado si los pares no alcanzan", () => {
  const original = copiarTablero(BLOQUEADO_CON_PASOS);
  const { estado, pasos, tablero } = resolverLogico(BLOQUEADO_CON_PASOS);

  assert.equal(estado, ESTADOS.BLOQUEADO);
  assert.ok(pasos.length > 0);
  assert.ok(pasos.some((p) => p.tecnica === TECNICAS.NAKED_PAIR));
  assert.ok(tablero.flat().filter((v) => v === 0).length > 0);
  // Al bloquearse ya no queda ningún single disponible
  assert.equal(detectarNakedSingles(tablero).length, 0);
  assert.equal(detectarHiddenSingles(tablero).length, 0);

  // El tablero original no se modifica
  assert.deepEqual(BLOQUEADO_CON_PASOS, original);
});

test("resolverLogico devuelve bloqueado sin pasos si no hay singles", () => {
  const { estado, pasos, tablero } = resolverLogico(SIN_SINGLES);
  assert.equal(estado, ESTADOS.BLOQUEADO);
  assert.equal(pasos.length, 0);
  assert.deepEqual(tablero, SIN_SINGLES);
});

test("los pasos aplicados conservan la unicidad del puzzle", () => {
  const { tablero } = resolverLogico(SE_BLOQUEA_DESPUES);
  assert.equal(contarSoluciones(copiarTablero(tablero), 2), 1);
});

// ------------------------------------------------------------
// Hidden pairs
// ------------------------------------------------------------

// Fila 0: falta {2,3,6}. Los 2 y 3 de la columna 5 bloquean (0,5), así
// que en la fila 0 los números 2 y 3 solo caben en (0,1) y (0,2). Ambas
// casillas también admiten el 6, que el par oculto {2,3} elimina.
const HIDDEN_PAIR_FILA = [
  [1, 0, 0, 4, 5, 0, 7, 8, 9],
  [0, 0, 0, 0, 0, 2, 0, 0, 0],
  [0, 0, 0, 0, 0, 3, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Columna 0: falta {2,3,8}. Los 2 y 3 de la fila 7 bloquean (7,0), así
// que en la columna 0 los 2 y 3 solo caben en (1,0) y (2,0). El par
// oculto {2,3} elimina el 8 de ambas casillas.
const HIDDEN_PAIR_COLUMNA = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [6, 0, 0, 0, 0, 0, 0, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 3, 0, 0, 0, 0, 0, 0],
  [9, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Caja 0: los números 2 y 3 solo caben en (1,0) y (2,0). El par oculto
// {2,3} elimina el 6 de ambas casillas.
const HIDDEN_PAIR_CAJA = [
  [7, 0, 1, 2, 3, 0, 0, 0, 0],
  [0, 4, 5, 0, 0, 0, 0, 0, 0],
  [0, 8, 9, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Fila 0: (0,1) y (0,2) ya tienen exactamente {2,3}, sin candidatos
// extraños, así que el par oculto {2,3} no elimina nada.
const HIDDEN_PAIR_SIN_ELIMINAR = [
  [1, 0, 0, 4, 5, 6, 7, 8, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Tablero con casillas vacías pero sin ningún par oculto.
const SIN_PARES_OCULTOS = [
  [5, 0, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 0, 9, 5, 0, 4, 8],
  [0, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 0, 6, 1, 4, 2, 3],
  [4, 2, 6, 0, 0, 3, 0, 9, 1],
  [7, 1, 3, 9, 0, 4, 8, 0, 6],
  [9, 6, 1, 5, 3, 0, 2, 0, 4],
  [2, 8, 0, 0, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 0, 1, 7, 9],
];

// Dos pares ocultos en cruz sobre (0,1): uno en la fila 0 ({3,7}) y otro
// en la columna 1 ({3,9}). Sus eliminaciones combinadas dejan a (0,1)
// con un único candidato, el 3.
const HIDDEN_PARES_EN_CRUZ = [
  [5, 0, 4, 6, 0, 0, 0, 0, 2],
  [6, 0, 2, 0, 9, 5, 3, 0, 8],
  [0, 0, 0, 0, 4, 0, 0, 6, 7],
  [0, 0, 9, 7, 0, 1, 4, 2, 0],
  [4, 0, 6, 8, 0, 3, 7, 0, 0],
  [0, 0, 3, 0, 0, 0, 0, 0, 6],
  [9, 0, 0, 5, 0, 7, 2, 8, 4],
  [2, 8, 7, 0, 1, 0, 6, 0, 5],
  [3, 0, 5, 0, 8, 0, 0, 0, 0],
];

// Puzzle de solución única que queda BLOQUEADO con singles y naked
// pairs, pero se desbloquea con un hidden pair: en la fila 2 los
// números 1 y 8 solo caben en (2,4) y (2,5), así que el par oculto
// {1,8} elimina el resto de candidatos de esas dos casillas y habilita
// un single que permite terminar el puzzle.
const HIDDEN_PAIR_DESBLOQUEA = [
  [8, 0, 6, 0, 0, 0, 0, 2, 5],
  [0, 0, 3, 0, 0, 4, 0, 9, 1],
  [5, 4, 9, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 8, 2, 0, 0, 4, 9],
  [0, 8, 0, 0, 0, 0, 7, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 8, 0],
  [0, 0, 7, 0, 0, 0, 0, 0, 4],
  [0, 0, 0, 1, 7, 0, 0, 6, 0],
  [2, 6, 0, 5, 4, 0, 9, 0, 0],
];

test("detectarHiddenPares encuentra un par oculto en una fila", () => {
  const pares = detectarHiddenPares(HIDDEN_PAIR_FILA);
  const par = pares.find(
    (p) =>
      p.unidad === "fila" &&
      p.candidatos.join(",") === "2,3" &&
      p.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(par);
  assert.equal(par.tecnica, TECNICAS.HIDDEN_PAIR);
  assert.deepEqual(par.celdas, [
    [0, 1],
    [0, 2],
  ]);
  assert.deepEqual(par.eliminados, [
    [0, 1, 6],
    [0, 2, 6],
  ]);
});

test("detectarHiddenPares encuentra un par oculto en una columna", () => {
  const pares = detectarHiddenPares(HIDDEN_PAIR_COLUMNA);
  const par = pares.find(
    (p) => p.unidad === "columna" && p.candidatos.join(",") === "2,3"
  );

  assert.ok(par);
  assert.deepEqual(par.celdas, [
    [1, 0],
    [2, 0],
  ]);
  assert.deepEqual(par.eliminados, [
    [1, 0, 8],
    [2, 0, 8],
  ]);
});

test("detectarHiddenPares encuentra un par oculto en una caja", () => {
  const pares = detectarHiddenPares(HIDDEN_PAIR_CAJA);
  const par = pares.find(
    (p) => p.unidad === "caja" && p.candidatos.join(",") === "2,3"
  );

  assert.ok(par);
  assert.deepEqual(par.celdas, [
    [1, 0],
    [2, 0],
  ]);
  assert.deepEqual(par.eliminados, [
    [1, 0, 6],
    [2, 0, 6],
  ]);
});

test("detectarHiddenPares no encuentra nada sin pares ocultos", () => {
  assert.deepEqual(detectarHiddenPares(SIN_PARES_OCULTOS), []);
});

test("un par oculto sin eliminaciones no es un paso efectivo", () => {
  const pares = detectarHiddenPares(HIDDEN_PAIR_SIN_ELIMINAR);
  const par = pares.find(
    (p) => p.unidad === "fila" && p.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  // El par se detecta, pero no descarta ningún candidato...
  assert.ok(par);
  assert.deepEqual(par.eliminados, []);
  // ...así que ninguno de los pares detectados sería un paso efectivo.
  assert.equal(pares.some((p) => p.eliminados.length > 0), false);
});

test("los pares ocultos en cruz habilitan un naked single", () => {
  // (0,1) empieza con cuatro candidatos: no es naked single.
  assert.deepEqual(obtenerCandidatos(HIDDEN_PARES_EN_CRUZ, 0, 1), [1, 3, 7, 9]);
  assert.ok(
    !detectarNakedSingles(HIDDEN_PARES_EN_CRUZ).some(
      (s) => s.fila === 0 && s.columna === 1
    )
  );

  const pares = detectarHiddenPares(HIDDEN_PARES_EN_CRUZ);
  const deFila = pares.find(
    (p) => p.unidad === "fila" && p.celdas.some(([f, c]) => f === 0 && c === 1)
  );
  const deColumna = pares.find(
    (p) => p.unidad === "columna" && p.celdas.some(([f, c]) => f === 0 && c === 1)
  );
  assert.ok(deFila);
  assert.ok(deColumna);

  const eliminados = new Set(
    [...deFila.eliminados, ...deColumna.eliminados].map(
      ([fila, columna, numero]) => `${fila},${columna},${numero}`
    )
  );
  const singles = detectarNakedSingles(HIDDEN_PARES_EN_CRUZ, eliminados);
  assert.ok(
    singles.some((s) => s.fila === 0 && s.columna === 1 && s.numero === 3)
  );
});

test("detectarHiddenPares respeta eliminaciones previas y evita duplicarlas", () => {
  // Ya se descartó el 6 de (0,1): el par oculto sigue detectándose, pero
  // solo registra el 6 de (0,2), sin repetir el de (0,1).
  const previos = new Set(["0,1,6"]);
  const pares = detectarHiddenPares(HIDDEN_PAIR_FILA, previos);
  const par = pares.find(
    (p) =>
      p.unidad === "fila" &&
      p.candidatos.join(",") === "2,3" &&
      p.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(par);
  assert.deepEqual(par.eliminados, [[0, 2, 6]]);
});

test("detectarHiddenPares no modifica el tablero original", () => {
  const original = copiarTablero(HIDDEN_PAIR_FILA);
  detectarHiddenPares(HIDDEN_PAIR_FILA);
  assert.deepEqual(HIDDEN_PAIR_FILA, original);
});

// ------------------------------------------------------------
// Hidden triples
// ------------------------------------------------------------

// Fila 0: falta {2,3,6,9}. La columna 8 bloquea (0,8) para 2, 3 y 6,
// así que en la fila 0 esos tres números solo caben en (0,1), (0,2) y
// (0,5). El trío oculto {2,3,6} elimina el 9 de esas tres casillas.
const HIDDEN_TRIPLE_FILA = [
  [1, 0, 0, 4, 5, 0, 7, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Columna 0: falta {2,3,6,9}. La fila 8 bloquea (8,0) para 2, 3 y 6,
// así que en la columna 0 esos tres números solo caben en (1,0), (2,0)
// y (5,0). El trío oculto {2,3,6} elimina el 9 de esas tres casillas.
const HIDDEN_TRIPLE_COLUMNA = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 0],
  [8, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 3, 6, 0, 0, 0, 0, 0],
];

// Caja 0: falta {2,3,6,7}. La columna 1 bloquea (0,1) para 2, 3 y 6,
// así que en la caja 0 esos tres números solo caben en (0,0), (1,0) y
// (2,0). El trío oculto {2,3,6} elimina el 7 de esas tres casillas.
const HIDDEN_TRIPLE_CAJA = [
  [0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 4, 5, 0, 0, 0, 0, 0, 0],
  [0, 8, 9, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 0],
  [0, 3, 0, 0, 0, 0, 0, 0, 0],
  [0, 6, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Igual que HIDDEN_TRIPLE_FILA pero sin el 2 de (1,8): ahora el 2
// también cabe en (0,8), de modo que {2,3,6} abarca cuatro casillas y
// no llega a formar un trío oculto.
const HIDDEN_TRIPLE_CUATRO_CELDAS = [
  [1, 0, 0, 4, 5, 0, 7, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Fila 0: solo faltan {2,3,6} y las tres casillas vacías tienen
// exactamente esos candidatos, así que el trío oculto se detecta pero
// no elimina ningún candidato.
const HIDDEN_TRIPLE_SIN_ELIMINAR = [
  [1, 0, 0, 4, 5, 0, 7, 8, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

test("detectarHiddenTriples encuentra un trío oculto en una fila", () => {
  const triples = detectarHiddenTriples(HIDDEN_TRIPLE_FILA);
  const triple = triples.find(
    (t) =>
      t.unidad === "fila" &&
      t.candidatos.join(",") === "2,3,6" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(triple);
  assert.equal(triple.tecnica, TECNICAS.HIDDEN_TRIPLE);
  assert.deepEqual(triple.celdas, [
    [0, 1],
    [0, 2],
    [0, 5],
  ]);
  assert.deepEqual(triple.eliminados, [
    [0, 1, 9],
    [0, 2, 9],
    [0, 5, 9],
  ]);
});

test("detectarHiddenTriples encuentra un trío oculto en una columna", () => {
  const triples = detectarHiddenTriples(HIDDEN_TRIPLE_COLUMNA);
  const triple = triples.find(
    (t) =>
      t.unidad === "columna" &&
      t.candidatos.join(",") === "2,3,6" &&
      t.celdas.some(([fila, columna]) => fila === 1 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.celdas, [
    [1, 0],
    [2, 0],
    [5, 0],
  ]);
  assert.deepEqual(triple.eliminados, [
    [1, 0, 9],
    [2, 0, 9],
    [5, 0, 9],
  ]);
});

test("detectarHiddenTriples encuentra un trío oculto en una caja", () => {
  const triples = detectarHiddenTriples(HIDDEN_TRIPLE_CAJA);
  const triple = triples.find(
    (t) =>
      t.unidad === "caja" &&
      t.candidatos.join(",") === "2,3,6" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(triple);
  assert.deepEqual(triple.celdas, [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);
  assert.deepEqual(triple.eliminados, [
    [0, 0, 7],
    [1, 0, 7],
    [2, 0, 7],
  ]);
});

test("detectarHiddenTriples elimina solo los candidatos ajenos al trío", () => {
  const triple = detectarHiddenTriples(HIDDEN_TRIPLE_FILA).find(
    (t) => t.unidad === "fila" && t.candidatos.join(",") === "2,3,6"
  );
  assert.ok(triple);

  // Tras descontar las eliminaciones, cada una de las tres casillas
  // queda exactamente con los tres números del trío.
  for (const [fila, columna] of triple.celdas) {
    const restantes = obtenerCandidatos(HIDDEN_TRIPLE_FILA, fila, columna).filter(
      (numero) =>
        !triple.eliminados.some(
          ([f, c, n]) => f === fila && c === columna && n === numero
        )
    );
    assert.deepEqual(restantes, [2, 3, 6]);
  }

  // Cada eliminación afecta a una de las tres casillas y quita un
  // candidato que NO pertenece al trío.
  for (const [fila, columna, numero] of triple.eliminados) {
    assert.ok(!triple.candidatos.includes(numero));
    assert.ok(triple.celdas.some(([f, c]) => f === fila && c === columna));
  }
});

test("detectarHiddenTriples no detecta un trío si abarca más de tres celdas", () => {
  // El 2 también cabe en (0,8): {2,3,6} ocupa cuatro casillas.
  assert.ok(obtenerCandidatos(HIDDEN_TRIPLE_CUATRO_CELDAS, 0, 8).includes(2));

  const triples = detectarHiddenTriples(HIDDEN_TRIPLE_CUATRO_CELDAS);
  assert.equal(
    triples.filter(
      (t) => t.unidad === "fila" && t.celdas.some(([fila]) => fila === 0)
    ).length,
    0
  );
});

test("un trío oculto sin eliminaciones reales no es un paso efectivo", () => {
  const triples = detectarHiddenTriples(HIDDEN_TRIPLE_SIN_ELIMINAR);
  const triple = triples.find(
    (t) => t.unidad === "fila" && t.celdas.some(([f, c]) => f === 0 && c === 1)
  );

  // El trío se detecta, pero no descarta ningún candidato...
  assert.ok(triple);
  assert.deepEqual(triple.eliminados, []);
  // ...así que ningún trío de la fila sería un paso efectivo.
  assert.equal(
    triples.filter((t) => t.unidad === "fila").some((t) => t.eliminados.length > 0),
    false
  );
});

test("detectarHiddenTriples respeta eliminaciones previas y evita duplicarlas", () => {
  // Ya se descartó el 9 de (0,1): el trío sigue detectándose, pero solo
  // registra el 9 de (0,2) y (0,5), sin repetir el de (0,1).
  const previos = new Set(["0,1,9"]);
  const triple = detectarHiddenTriples(HIDDEN_TRIPLE_FILA, previos).find(
    (t) =>
      t.unidad === "fila" &&
      t.candidatos.join(",") === "2,3,6" &&
      t.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(triple);
  assert.deepEqual(triple.eliminados, [
    [0, 2, 9],
    [0, 5, 9],
  ]);
});

test("detectarHiddenTriples no modifica el tablero original", () => {
  const original = copiarTablero(HIDDEN_TRIPLE_FILA);
  detectarHiddenTriples(HIDDEN_TRIPLE_FILA);
  assert.deepEqual(HIDDEN_TRIPLE_FILA, original);
});

test("detectarHiddenTriples no encuentra nada en un puzzle sin tríos ocultos", () => {
  assert.deepEqual(detectarHiddenTriples(SIN_TRIPLES), []);
});

// ------------------------------------------------------------
// Hidden quads
// ------------------------------------------------------------

// Fila 0: falta {2,3,6,8,9}. La columna 8 bloquea (0,8) para 2, 3, 6 y
// 9, así que esos cuatro números solo caben en (0,1), (0,2), (0,5) y
// (0,7). El cuarteto oculto {2,3,6,9} elimina el 8 de esas cuatro
// casillas.
const HIDDEN_QUAD_FILA = [
  [1, 0, 0, 4, 5, 0, 7, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 2],
  [0, 0, 0, 0, 0, 0, 0, 0, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Traspuesta del fixture anterior: el cuarteto está en la columna 0,
// en (1,0), (2,0), (5,0) y (7,0), y elimina el 8 de las cuatro casillas.
const HIDDEN_QUAD_COLUMNA = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 0, 0, 0, 0, 0, 0, 0, 0],
  [5, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 2, 3, 6, 9, 0, 0],
];

// Caja 0: falta {2,3,6,8,9}. Los 2, 3, 6 y 9 de la fila 2 bloquean
// (2,2), así que esos cuatro números solo caben en (0,0), (0,1), (1,0)
// y (1,1). El cuarteto oculto {2,3,6,9} elimina el 8 de esas casillas.
const HIDDEN_QUAD_CAJA = [
  [0, 0, 1, 0, 0, 0, 0, 0, 0],
  [0, 0, 4, 0, 0, 0, 0, 0, 0],
  [5, 7, 0, 2, 3, 6, 9, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Igual que HIDDEN_QUAD_FILA pero sin el 2 de (3,8): ahora el 2 también
// cabe en (0,8), de modo que {2,3,6,9} abarca cinco casillas y no llega
// a formar un cuarteto oculto.
const HIDDEN_QUAD_CINCO_CELDAS = [
  [1, 0, 0, 4, 5, 0, 7, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 3],
  [0, 0, 0, 0, 0, 0, 0, 0, 6],
  [0, 0, 0, 0, 0, 0, 0, 0, 9],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

// Fila 0: solo faltan {2,3,6,9} y las cuatro casillas vacías tienen
// exactamente esos candidatos, así que el cuarteto oculto se detecta
// pero no elimina ningún candidato.
const HIDDEN_QUAD_SIN_ELIMINAR = [
  [1, 0, 0, 4, 5, 0, 7, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

test("detectarHiddenQuads encuentra un cuarteto oculto en una fila", () => {
  const quads = detectarHiddenQuads(HIDDEN_QUAD_FILA);
  const quad = quads.find(
    (q) =>
      q.unidad === "fila" &&
      q.candidatos.join(",") === "2,3,6,9" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(quad);
  assert.equal(TECNICAS.HIDDEN_QUAD, "hidden-quad");
  assert.equal(quad.tecnica, TECNICAS.HIDDEN_QUAD);
  assert.deepEqual(quad.celdas, [
    [0, 1],
    [0, 2],
    [0, 5],
    [0, 7],
  ]);
  assert.deepEqual(quad.eliminados, [
    [0, 1, 8],
    [0, 2, 8],
    [0, 5, 8],
    [0, 7, 8],
  ]);
});

test("detectarHiddenQuads encuentra un cuarteto oculto en una columna", () => {
  const quads = detectarHiddenQuads(HIDDEN_QUAD_COLUMNA);
  const quad = quads.find(
    (q) =>
      q.unidad === "columna" &&
      q.candidatos.join(",") === "2,3,6,9" &&
      q.celdas.some(([fila, columna]) => fila === 1 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.celdas, [
    [1, 0],
    [2, 0],
    [5, 0],
    [7, 0],
  ]);
  assert.deepEqual(quad.eliminados, [
    [1, 0, 8],
    [2, 0, 8],
    [5, 0, 8],
    [7, 0, 8],
  ]);
});

test("detectarHiddenQuads encuentra un cuarteto oculto en una caja", () => {
  const quads = detectarHiddenQuads(HIDDEN_QUAD_CAJA);
  const quad = quads.find(
    (q) =>
      q.unidad === "caja" &&
      q.candidatos.join(",") === "2,3,6,9" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 0)
  );

  assert.ok(quad);
  assert.deepEqual(quad.celdas, [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ]);
  assert.deepEqual(quad.eliminados, [
    [0, 0, 8],
    [0, 1, 8],
    [1, 0, 8],
    [1, 1, 8],
  ]);
});

test("detectarHiddenQuads elimina solo los candidatos ajenos al cuarteto", () => {
  const quad = detectarHiddenQuads(HIDDEN_QUAD_FILA).find(
    (q) => q.unidad === "fila" && q.candidatos.join(",") === "2,3,6,9"
  );
  assert.ok(quad);

  // Tras descontar las eliminaciones, cada una de las cuatro casillas
  // queda exactamente con los cuatro números del cuarteto.
  for (const [fila, columna] of quad.celdas) {
    const restantes = obtenerCandidatos(HIDDEN_QUAD_FILA, fila, columna).filter(
      (numero) =>
        !quad.eliminados.some(
          ([f, c, n]) => f === fila && c === columna && n === numero
        )
    );
    assert.deepEqual(restantes, [2, 3, 6, 9]);
  }

  // Cada eliminación afecta a una de las cuatro casillas y quita un
  // candidato que NO pertenece al cuarteto.
  for (const [fila, columna, numero] of quad.eliminados) {
    assert.ok(!quad.candidatos.includes(numero));
    assert.ok(quad.celdas.some(([f, c]) => f === fila && c === columna));
  }
});

test("detectarHiddenQuads no detecta un cuarteto si abarca más de cuatro celdas", () => {
  // El 2 también cabe en (0,8): {2,3,6,9} ocupa cinco casillas.
  assert.ok(obtenerCandidatos(HIDDEN_QUAD_CINCO_CELDAS, 0, 8).includes(2));

  const quads = detectarHiddenQuads(HIDDEN_QUAD_CINCO_CELDAS);
  assert.equal(
    quads.filter(
      (q) =>
        q.unidad === "fila" &&
        q.candidatos.join(",") === "2,3,6,9" &&
        q.celdas.some(([fila]) => fila === 0)
    ).length,
    0
  );
});

test("un cuarteto oculto sin eliminaciones reales no se devuelve", () => {
  // Las cuatro casillas combinan exactamente {2,3,6,9} y no tienen
  // candidatos adicionales, así que no hay nada que eliminar.
  for (const [fila, columna] of [
    [0, 1],
    [0, 2],
    [0, 5],
    [0, 8],
  ]) {
    assert.deepEqual(
      obtenerCandidatos(HIDDEN_QUAD_SIN_ELIMINAR, fila, columna),
      [2, 3, 6, 9]
    );
  }

  const quads = detectarHiddenQuads(HIDDEN_QUAD_SIN_ELIMINAR);
  assert.equal(
    quads.filter(
      (q) => q.unidad === "fila" && q.celdas.some(([fila]) => fila === 0)
    ).length,
    0
  );
  assert.ok(quads.every((q) => q.eliminados.length > 0));
});

test("detectarHiddenQuads respeta eliminaciones previas y no las repite", () => {
  // Ya se descartó el 8 de (0,1): el cuarteto sigue detectándose, pero
  // solo registra el 8 de las otras tres casillas.
  const previos = new Set(["0,1,8"]);
  const quad = detectarHiddenQuads(HIDDEN_QUAD_FILA, previos).find(
    (q) =>
      q.unidad === "fila" &&
      q.candidatos.join(",") === "2,3,6,9" &&
      q.celdas.some(([fila, columna]) => fila === 0 && columna === 1)
  );

  assert.ok(quad);
  assert.deepEqual(quad.eliminados, [
    [0, 2, 8],
    [0, 5, 8],
    [0, 7, 8],
  ]);
});

test("detectarHiddenQuads no modifica el tablero original", () => {
  const original = copiarTablero(HIDDEN_QUAD_FILA);
  detectarHiddenQuads(HIDDEN_QUAD_FILA);
  assert.deepEqual(HIDDEN_QUAD_FILA, original);
});

test("detectarHiddenQuads no produce falsos positivos sin cuartetos", () => {
  // Las casillas vacías de SIN_TRIPLES están aisladas y cada una tiene un
  // único candidato: ningún cuarteto puede eliminar nada.
  assert.deepEqual(detectarHiddenQuads(SIN_TRIPLES), []);
});

// ------------------------------------------------------------
// Hidden pairs integrados en resolverLogico
// ------------------------------------------------------------

// Reproduce los pasos de un solver sobre un tablero, llevando el
// registro de candidatos eliminados. Devuelve el estado del tablero
// justo antes del paso `hasta`.
function estadoAntesDe(tablero, pasos, hasta) {
  const enJuego = copiarTablero(tablero);
  const eliminados = new Set();
  for (let i = 0; i < hasta; i++) {
    const paso = pasos[i];
    if (paso.eliminados) {
      for (const [fila, columna, numero] of paso.eliminados) {
        eliminados.add(`${fila},${columna},${numero}`);
      }
    } else {
      enJuego[paso.fila][paso.columna] = paso.numero;
    }
  }
  return { enJuego, eliminados };
}

test("un hidden pair desbloquea un puzzle que antes quedaba bloqueado", () => {
  const original = copiarTablero(HIDDEN_PAIR_DESBLOQUEA);
  assert.equal(contarSoluciones(copiarTablero(HIDDEN_PAIR_DESBLOQUEA), 2), 1);

  const { estado, pasos, tablero } = resolverLogico(HIDDEN_PAIR_DESBLOQUEA);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);

  const indicePar = pasos.findIndex((p) => p.tecnica === TECNICAS.HIDDEN_PAIR);
  assert.ok(indicePar >= 0);

  // Justo antes del primer hidden pair no había ninguna técnica previa
  // disponible: ni singles ni naked pairs efectivos. Es decir, con las
  // técnicas anteriores el puzzle se quedaba bloqueado.
  const { enJuego, eliminados } = estadoAntesDe(HIDDEN_PAIR_DESBLOQUEA, pasos, indicePar);
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.equal(
    detectarNakedPares(enJuego, eliminados).filter((p) => p.eliminados.length > 0).length,
    0
  );
  // ...pero sí había un hidden pair aplicable.
  assert.ok(
    detectarHiddenPares(enJuego, eliminados).some((p) => p.eliminados.length > 0)
  );

  // El tablero original no se modifica
  assert.deepEqual(HIDDEN_PAIR_DESBLOQUEA, original);
});

test("los pasos con hidden pairs se reproducen sin contradicciones", () => {
  const { pasos, tablero } = resolverLogico(HIDDEN_PAIR_DESBLOQUEA);

  const enJuego = copiarTablero(HIDDEN_PAIR_DESBLOQUEA);
  const eliminados = new Set();

  for (const paso of pasos) {
    if (
      paso.tecnica === TECNICAS.NAKED_SINGLE ||
      paso.tecnica === TECNICAS.HIDDEN_SINGLE
    ) {
      assert.ok(
        esValido(enJuego, paso.fila, paso.columna, paso.numero),
        `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
      );
      enJuego[paso.fila][paso.columna] = paso.numero;
      continue;
    }

    // Técnicas de par: no colocan número y registran eliminaciones reales
    assert.equal(paso.numero, undefined);
    assert.equal(paso.celdas.length, 2);
    assert.equal(paso.candidatos.length, 2);
    assert.ok(paso.eliminados.length > 0);

    for (const [fila, columna, numero] of paso.eliminados) {
      const clave = `${fila},${columna},${numero}`;
      const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
        (n) => !eliminados.has(`${fila},${columna},${n}`)
      );
      // La eliminación debe quitar un candidato que todavía está presente
      assert.ok(candidatos.includes(numero), `eliminación inexistente ${clave}`);

      if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
        // En un hidden pair lo eliminado NO son los números del par y la
        // casilla afectada es una de las dos del par
        assert.ok(!paso.candidatos.includes(numero));
        assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      } else {
        // En un naked pair lo eliminado SON los números del par y la
        // casilla afectada NO es una de las dos del par
        assert.ok(paso.candidatos.includes(numero));
        assert.ok(!paso.celdas.some(([f, c]) => f === fila && c === columna));
      }

      eliminados.add(clave);
    }
  }

  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("las técnicas conservan su prioridad (singles y naked pairs antes que hidden pairs)", () => {
  const fixtures = [
    HIDDEN_PAIR_DESBLOQUEA,
    SE_BLOQUEA_DESPUES,
    PAR_HABILITA_SINGLES_SIN_SINGLES,
    RESOLUBLE_SINGLES,
  ];

  for (const fixture of fixtures) {
    const { pasos } = resolverLogico(fixture);
    const enJuego = copiarTablero(fixture);
    const eliminados = new Set();

    for (const paso of pasos) {
      // Un hidden single solo se aplica cuando no hay naked singles
      if (paso.tecnica === TECNICAS.HIDDEN_SINGLE) {
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
      }

      if (paso.eliminados) {
        // Antes de cualquier par no debe quedar ningún single
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
        assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

        // Un hidden pair solo se aplica cuando no hay naked pairs efectivos
        if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }

        for (const [fila, columna, numero] of paso.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
      } else {
        enJuego[paso.fila][paso.columna] = paso.numero;
      }
    }
  }
});

test("resolverLogico registra hidden pairs sin colocar números ni eliminar de más", () => {
  const { pasos } = resolverLogico(HIDDEN_PAIR_DESBLOQUEA);
  const pares = pasos.filter((p) => p.tecnica === TECNICAS.HIDDEN_PAIR);

  assert.ok(pares.length > 0);
  for (const par of pares) {
    assert.equal(par.numero, undefined);
    assert.equal(par.celdas.length, 2);
    assert.equal(par.candidatos.length, 2);
    assert.ok(par.eliminados.length > 0);
    assert.ok(["fila", "columna", "caja"].includes(par.unidad));
  }
});

test("las eliminaciones de un hidden pair habilitan un single en una iteración posterior", () => {
  const { pasos } = resolverLogico(HIDDEN_PAIR_DESBLOQUEA);
  const indicePar = pasos.findIndex((p) => p.tecnica === TECNICAS.HIDDEN_PAIR);
  assert.ok(indicePar >= 0);

  const { enJuego, eliminados } = estadoAntesDe(HIDDEN_PAIR_DESBLOQUEA, pasos, indicePar);

  // Antes de aplicar el par no hay ningún single...
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

  // ...y tras descontar sus eliminaciones aparece al menos un single.
  const conEliminaciones = new Set(eliminados);
  for (const [fila, columna, numero] of pasos[indicePar].eliminados) {
    conEliminaciones.add(`${fila},${columna},${numero}`);
  }
  const singles =
    detectarNakedSingles(enJuego, conEliminaciones).length +
    detectarHiddenSingles(enJuego, conEliminaciones).length;
  assert.ok(singles > 0);

  // El solver lo detecta en la iteración siguiente (progreso garantizado)
  assert.ok(
    pasos[indicePar + 1].tecnica === TECNICAS.NAKED_SINGLE ||
      pasos[indicePar + 1].tecnica === TECNICAS.HIDDEN_SINGLE
  );
});

// ------------------------------------------------------------
// Naked triples integrados en resolverLogico
// ------------------------------------------------------------

// Puzzle de solución única que se BLOQUEA con singles y pares (naked y
// ocultos), pero se desbloquea con un naked triple: en la caja 3-5/3-5
// las casillas (6,5), (7,5) y (8,5) solo combinan {3,4,8}, así que el
// trío elimina esos números del resto de la caja y habilita un naked
// single que permite terminar.
const NAKED_TRIPLE_DESBLOQUEA = [
  [3, 8, 0, 0, 9, 0, 0, 6, 0],
  [0, 0, 0, 0, 0, 7, 9, 0, 0],
  [0, 4, 0, 8, 0, 0, 0, 3, 1],
  [0, 0, 0, 7, 0, 2, 0, 0, 0],
  [0, 3, 2, 5, 1, 9, 0, 0, 0],
  [0, 0, 5, 0, 8, 6, 0, 2, 0],
  [5, 0, 0, 1, 0, 0, 0, 0, 8],
  [0, 0, 4, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 2, 0, 9],
];

// Variante con el trío en una fila: (3,6), (3,7) y (3,8) combinan
// {1,2,8} y la eliminación habilita un naked single en (3,5).
const NAKED_TRIPLE_FILA_DESBLOQUEA = [
  [0, 0, 7, 0, 2, 0, 0, 0, 0],
  [0, 0, 4, 7, 0, 9, 0, 0, 0],
  [5, 0, 0, 6, 0, 0, 0, 0, 7],
  [0, 0, 5, 0, 0, 0, 0, 0, 0],
  [0, 8, 0, 5, 0, 3, 4, 7, 9],
  [0, 0, 0, 0, 0, 8, 3, 6, 5],
  [0, 9, 0, 0, 5, 6, 2, 0, 0],
  [0, 0, 0, 1, 9, 0, 0, 4, 0],
  [1, 0, 0, 3, 8, 0, 9, 0, 6],
];

test("un naked triple desbloquea un puzzle que antes quedaba bloqueado", () => {
  const original = copiarTablero(NAKED_TRIPLE_DESBLOQUEA);
  assert.equal(contarSoluciones(copiarTablero(NAKED_TRIPLE_DESBLOQUEA), 2), 1);

  const { estado, pasos, tablero } = resolverLogico(NAKED_TRIPLE_DESBLOQUEA);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);

  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_TRIPLE
  );
  assert.ok(indiceTriple >= 0);

  // Justo antes del primer naked triple no había ninguna técnica previa
  // efectiva: ni singles ni pares (desnudos u ocultos) aplicables. Es
  // decir, con las técnicas anteriores el puzzle se quedaba bloqueado.
  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_TRIPLE_DESBLOQUEA,
    pasos,
    indiceTriple
  );
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.equal(
    detectarNakedPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  // ...pero sí había un naked triple efectivo.
  assert.ok(
    detectarNakedTriples(enJuego, eliminados).some(
      (t) => t.eliminados.length > 0
    )
  );

  // El tablero original no se modifica
  assert.deepEqual(NAKED_TRIPLE_DESBLOQUEA, original);
});

test("la eliminación de un naked triple habilita un naked single", () => {
  const { pasos } = resolverLogico(NAKED_TRIPLE_DESBLOQUEA);
  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_TRIPLE
  );
  assert.ok(indiceTriple >= 0);

  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_TRIPLE_DESBLOQUEA,
    pasos,
    indiceTriple
  );

  // Antes de aplicar el trío no hay ningún single...
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

  // ...y tras descontar sus eliminaciones aparece al menos un naked single.
  const conEliminaciones = new Set(eliminados);
  for (const [fila, columna, numero] of pasos[indiceTriple].eliminados) {
    conEliminaciones.add(`${fila},${columna},${numero}`);
  }
  assert.ok(detectarNakedSingles(enJuego, conEliminaciones).length > 0);

  // El solver lo detecta en la iteración siguiente (progreso garantizado)
  assert.equal(pasos[indiceTriple + 1].tecnica, TECNICAS.NAKED_SINGLE);
});

test("los pasos con naked triples se reproducen sin contradicciones", () => {
  const { pasos, tablero } = resolverLogico(NAKED_TRIPLE_DESBLOQUEA);

  const enJuego = copiarTablero(NAKED_TRIPLE_DESBLOQUEA);
  const eliminados = new Set();
  let triplesVistos = 0;

  for (const paso of pasos) {
    if (
      paso.tecnica === TECNICAS.NAKED_SINGLE ||
      paso.tecnica === TECNICAS.HIDDEN_SINGLE
    ) {
      assert.ok(
        esValido(enJuego, paso.fila, paso.columna, paso.numero),
        `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
      );
      enJuego[paso.fila][paso.columna] = paso.numero;
      continue;
    }

    // Técnicas de eliminación: no colocan número y eliminan candidatos
    // que todavía estaban presentes.
    assert.equal(paso.numero, undefined);
    assert.ok(paso.eliminados.length > 0);

    if (paso.tecnica === TECNICAS.NAKED_TRIPLE) {
      triplesVistos++;
      assert.equal(paso.celdas.length, 3);
      assert.equal(paso.candidatos.length, 3);
    } else {
      assert.equal(paso.celdas.length, 2);
      assert.equal(paso.candidatos.length, 2);
    }

    for (const [fila, columna, numero] of paso.eliminados) {
      const clave = `${fila},${columna},${numero}`;
      const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
        (n) => !eliminados.has(`${fila},${columna},${n}`)
      );
      assert.ok(candidatos.includes(numero), `eliminación inexistente ${clave}`);

      if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
        assert.ok(!paso.candidatos.includes(numero));
        assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      } else {
        // Naked pair y naked triple: lo eliminado SON sus números y la
        // casilla afectada NO pertenece a la técnica.
        assert.ok(paso.candidatos.includes(numero));
        assert.ok(!paso.celdas.some(([f, c]) => f === fila && c === columna));
      }

      eliminados.add(clave);
    }
  }

  assert.ok(triplesVistos > 0);
  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("resolverLogico registra naked triples sin colocar números ni eliminar de más", () => {
  const { pasos } = resolverLogico(NAKED_TRIPLE_DESBLOQUEA);
  const triples = pasos.filter((p) => p.tecnica === TECNICAS.NAKED_TRIPLE);

  assert.ok(triples.length > 0);
  for (const triple of triples) {
    assert.equal(triple.numero, undefined);
    assert.equal(triple.celdas.length, 3);
    assert.equal(triple.candidatos.length, 3);
    assert.ok(triple.eliminados.length > 0);
    assert.ok(["fila", "columna", "caja"].includes(triple.unidad));
  }
});

test("las técnicas conservan su prioridad también con naked triples", () => {
  const fixtures = [
    NAKED_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_FILA_DESBLOQUEA,
    HIDDEN_PAIR_DESBLOQUEA,
    SE_BLOQUEA_DESPUES,
    PAR_HABILITA_SINGLES_SIN_SINGLES,
    RESOLUBLE_SINGLES,
  ];

  let triplesVistos = 0;

  for (const fixture of fixtures) {
    const { pasos } = resolverLogico(fixture);
    const enJuego = copiarTablero(fixture);
    const eliminados = new Set();

    for (const paso of pasos) {
      // Un hidden single solo se aplica cuando no hay naked singles
      if (paso.tecnica === TECNICAS.HIDDEN_SINGLE) {
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
      }

      if (paso.eliminados) {
        // Antes de cualquier técnica de eliminación no debe quedar single
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
        assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

        // Ni un naked pair efectivo, salvo que el paso sea uno
        if (paso.tecnica !== TECNICAS.NAKED_PAIR) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }

        // Un hidden pair solo se aplica si antes no hay naked pairs
        // efectivos ni, para el naked triple, tampoco hidden pairs.
        if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }
        if (paso.tecnica === TECNICAS.NAKED_TRIPLE) {
          triplesVistos++;
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }

        for (const [fila, columna, numero] of paso.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
      } else {
        enJuego[paso.fila][paso.columna] = paso.numero;
      }
    }
  }

  // Los tríos retrasados se ejercieron en la reproducción de prioridad
  assert.ok(triplesVistos > 0);
});

test("un naked triple en fila también desbloquea y habilita un naked single", () => {
  const original = copiarTablero(NAKED_TRIPLE_FILA_DESBLOQUEA);
  assert.equal(contarSoluciones(copiarTablero(NAKED_TRIPLE_FILA_DESBLOQUEA), 2), 1);

  const { estado, pasos, tablero } = resolverLogico(NAKED_TRIPLE_FILA_DESBLOQUEA);
  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);

  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_TRIPLE
  );
  assert.ok(indiceTriple >= 0);
  assert.equal(pasos[indiceTriple].unidad, "fila");
  assert.equal(pasos[indiceTriple + 1].tecnica, TECNICAS.NAKED_SINGLE);

  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_TRIPLE_FILA_DESBLOQUEA,
    pasos,
    indiceTriple
  );
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.equal(
    detectarNakedPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );

  assert.deepEqual(NAKED_TRIPLE_FILA_DESBLOQUEA, original);
});

// ------------------------------------------------------------
// Hidden triples integrados en resolverLogico
// ------------------------------------------------------------

// Puzzle de solución única que se BLOQUEA con singles, pares (naked y
// ocultos) y naked triples, pero se desbloquea con un hidden triple:
// en la columna 2 los números {1,2,5} solo caben en (0,2), (1,2) y
// (3,2), así que el trío oculto elimina el 4 de (0,2) y el 3 y el 6 de
// (1,2), habilitando un hidden single 3 en (1,0) que permite terminar.
const HIDDEN_TRIPLE_DESBLOQUEA = [
  [8, 0, 0, 0, 3, 6, 0, 7, 0],
  [0, 0, 0, 1, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 5, 2, 0, 0, 3],
  [0, 3, 0, 0, 0, 0, 0, 2, 6],
  [4, 0, 0, 0, 2, 8, 0, 0, 7],
  [0, 0, 8, 0, 6, 1, 0, 4, 9],
  [0, 0, 0, 0, 0, 0, 7, 0, 0],
  [0, 0, 7, 0, 8, 3, 9, 0, 0],
  [2, 0, 0, 4, 0, 0, 5, 0, 1],
];

test("un hidden triple desbloquea un puzzle que antes quedaba bloqueado", () => {
  const original = copiarTablero(HIDDEN_TRIPLE_DESBLOQUEA);
  assert.equal(contarSoluciones(copiarTablero(HIDDEN_TRIPLE_DESBLOQUEA), 2), 1);

  const { estado, pasos, tablero } = resolverLogico(HIDDEN_TRIPLE_DESBLOQUEA);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);

  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.HIDDEN_TRIPLE
  );
  assert.ok(indiceTriple >= 0);

  // Justo antes del primer hidden triple no había ninguna técnica previa
  // efectiva: ni singles ni pares (desnudos u ocultos) ni naked triples
  // aplicables. Es decir, con las técnicas anteriores el puzzle se
  // quedaba bloqueado.
  const { enJuego, eliminados } = estadoAntesDe(
    HIDDEN_TRIPLE_DESBLOQUEA,
    pasos,
    indiceTriple
  );
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.equal(
    detectarNakedPares(enJuego, eliminados).filter((p) => p.eliminados.length > 0)
      .length,
    0
  );
  assert.equal(
    detectarHiddenPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarNakedTriples(enJuego, eliminados).filter(
      (t) => t.eliminados.length > 0
    ).length,
    0
  );
  // ...pero sí había un hidden triple efectivo.
  assert.ok(
    detectarHiddenTriples(enJuego, eliminados).some(
      (t) => t.eliminados.length > 0
    )
  );

  // El tablero original no se modifica
  assert.deepEqual(HIDDEN_TRIPLE_DESBLOQUEA, original);
});

test("la eliminación de un hidden triple habilita un single", () => {
  const { pasos } = resolverLogico(HIDDEN_TRIPLE_DESBLOQUEA);
  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.HIDDEN_TRIPLE
  );
  assert.ok(indiceTriple >= 0);

  const { enJuego, eliminados } = estadoAntesDe(
    HIDDEN_TRIPLE_DESBLOQUEA,
    pasos,
    indiceTriple
  );

  // Antes de aplicar el trío no hay ningún single...
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

  // ...y tras descontar sus eliminaciones aparece al menos un single.
  const conEliminaciones = new Set(eliminados);
  for (const [fila, columna, numero] of pasos[indiceTriple].eliminados) {
    conEliminaciones.add(`${fila},${columna},${numero}`);
  }
  const singles =
    detectarNakedSingles(enJuego, conEliminaciones).length +
    detectarHiddenSingles(enJuego, conEliminaciones).length;
  assert.ok(singles > 0);

  // El solver lo detecta en la iteración siguiente (progreso garantizado)
  assert.ok(
    pasos[indiceTriple + 1].tecnica === TECNICAS.NAKED_SINGLE ||
      pasos[indiceTriple + 1].tecnica === TECNICAS.HIDDEN_SINGLE
  );
});

test("las eliminaciones de un hidden triple se conservan en los pasos siguientes", () => {
  const { pasos } = resolverLogico(HIDDEN_TRIPLE_DESBLOQUEA);
  const indiceTriple = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.HIDDEN_TRIPLE
  );
  assert.ok(indiceTriple >= 0);
  assert.ok(pasos[indiceTriple].eliminados.length > 0);

  // Reproducir hasta justo después del trío: los candidatos descartados
  // siguen registrados y no reaparecen al recalcular.
  const { enJuego, eliminados } = estadoAntesDe(
    HIDDEN_TRIPLE_DESBLOQUEA,
    pasos,
    indiceTriple + 1
  );
  for (const [fila, columna, numero] of pasos[indiceTriple].eliminados) {
    assert.ok(eliminados.has(`${fila},${columna},${numero}`));
    const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
      (n) => !eliminados.has(`${fila},${columna},${n}`)
    );
    assert.ok(!candidatos.includes(numero));
  }

  // Ningún paso posterior vuelve a colocar un número que el trío eliminó.
  for (let i = indiceTriple + 1; i < pasos.length; i++) {
    const paso = pasos[i];
    if (paso.eliminados) continue;
    assert.ok(
      !pasos[indiceTriple].eliminados.some(
        ([fila, columna, numero]) =>
          fila === paso.fila && columna === paso.columna && numero === paso.numero
      ),
      `se colocó un candidato eliminado en (${paso.fila},${paso.columna})`
    );
  }
});

test("los pasos con hidden triples se reproducen sin contradicciones", () => {
  const { pasos, tablero } = resolverLogico(HIDDEN_TRIPLE_DESBLOQUEA);

  const enJuego = copiarTablero(HIDDEN_TRIPLE_DESBLOQUEA);
  const eliminados = new Set();
  let triplesOcultosVistos = 0;

  for (const paso of pasos) {
    if (
      paso.tecnica === TECNICAS.NAKED_SINGLE ||
      paso.tecnica === TECNICAS.HIDDEN_SINGLE
    ) {
      assert.ok(
        esValido(enJuego, paso.fila, paso.columna, paso.numero),
        `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
      );
      enJuego[paso.fila][paso.columna] = paso.numero;
      continue;
    }

    // Técnicas de eliminación: no colocan número y eliminan candidatos
    // que todavía estaban presentes.
    assert.equal(paso.numero, undefined);
    assert.ok(paso.eliminados.length > 0);

    if (paso.tecnica === TECNICAS.NAKED_TRIPLE) {
      assert.equal(paso.celdas.length, 3);
      assert.equal(paso.candidatos.length, 3);
    } else if (paso.tecnica === TECNICAS.HIDDEN_TRIPLE) {
      triplesOcultosVistos++;
      assert.equal(paso.celdas.length, 3);
      assert.equal(paso.candidatos.length, 3);
    } else {
      assert.equal(paso.celdas.length, 2);
      assert.equal(paso.candidatos.length, 2);
    }

    for (const [fila, columna, numero] of paso.eliminados) {
      const clave = `${fila},${columna},${numero}`;
      const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
        (n) => !eliminados.has(`${fila},${columna},${n}`)
      );
      assert.ok(candidatos.includes(numero), `eliminación inexistente ${clave}`);

      if (
        paso.tecnica === TECNICAS.HIDDEN_PAIR ||
        paso.tecnica === TECNICAS.HIDDEN_TRIPLE
      ) {
        assert.ok(!paso.candidatos.includes(numero));
        assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      } else {
        assert.ok(paso.candidatos.includes(numero));
        assert.ok(!paso.celdas.some(([f, c]) => f === fila && c === columna));
      }

      eliminados.add(clave);
    }
  }

  assert.ok(triplesOcultosVistos > 0);
  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("resolverLogico registra hidden triples sin colocar números ni eliminar de más", () => {
  const { pasos } = resolverLogico(HIDDEN_TRIPLE_DESBLOQUEA);
  const triples = pasos.filter((p) => p.tecnica === TECNICAS.HIDDEN_TRIPLE);

  assert.ok(triples.length > 0);
  for (const triple of triples) {
    assert.equal(triple.numero, undefined);
    assert.equal(triple.celdas.length, 3);
    assert.equal(triple.candidatos.length, 3);
    assert.ok(triple.eliminados.length > 0);
    assert.ok(["fila", "columna", "caja"].includes(triple.unidad));
  }
});

test("las técnicas conservan su prioridad también con hidden triples", () => {
  const fixtures = [
    HIDDEN_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_FILA_DESBLOQUEA,
    HIDDEN_PAIR_DESBLOQUEA,
    SE_BLOQUEA_DESPUES,
    PAR_HABILITA_SINGLES_SIN_SINGLES,
    RESOLUBLE_SINGLES,
  ];

  let hiddenTriplesVistos = 0;

  for (const fixture of fixtures) {
    const { pasos } = resolverLogico(fixture);
    const enJuego = copiarTablero(fixture);
    const eliminados = new Set();

    for (const paso of pasos) {
      // Un hidden single solo se aplica cuando no hay naked singles
      if (paso.tecnica === TECNICAS.HIDDEN_SINGLE) {
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
      }

      if (paso.eliminados) {
        // Antes de cualquier técnica de eliminación no debe quedar single
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
        assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

        // Un hidden pair solo se aplica si antes no hay naked pairs efectivos
        if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }
        // Un naked triple solo se aplica si antes no hay pares efectivos
        if (paso.tecnica === TECNICAS.NAKED_TRIPLE) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }
        // Un hidden triple es la técnica de menor prioridad: solo se
        // aplica si antes ninguna de las anteriores produce deducción.
        if (paso.tecnica === TECNICAS.HIDDEN_TRIPLE) {
          hiddenTriplesVistos++;
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarNakedTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
        }

        for (const [fila, columna, numero] of paso.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
      } else {
        enJuego[paso.fila][paso.columna] = paso.numero;
      }
    }
  }

  // Los tríos ocultos retrasados se ejercieron en la reproducción
  assert.ok(hiddenTriplesVistos > 0);
});

test("los tableros inválidos siguen clasificándose como inválidos con hidden triples", () => {
  for (const invalido of [
    DUPLICADO_FILA,
    DUPLICADO_COLUMNA,
    DUPLICADO_CAJA,
    FUERA_DE_RANGO,
    ESTRUCTURA_ROTA,
    CASILLA_MUERTA,
  ]) {
    const { estado, pasos } = resolverLogico(invalido);
    assert.equal(estado, ESTADOS.INVALIDO);
    assert.equal(pasos.length, 0);
    assert.ok(!pasos.some((p) => p.tecnica === TECNICAS.HIDDEN_TRIPLE));
  }
});

// ------------------------------------------------------------
// Naked quads integrados en resolverLogico
// ------------------------------------------------------------

// Puzzle de solución única que se BLOQUEA con singles, pares y tríos
// (naked y hidden), pero se desbloquea con un naked quad: en la caja
// 3-5/6-8 las casillas (3,8), (4,6), (4,8) y (5,8) combinan {5,7,8,9},
// así que el cuarteto elimina esos números del resto de la caja. Las
// eliminaciones habilitan un naked triple y, después, los singles que
// permiten terminar el puzzle.
const NAKED_QUAD_DESBLOQUEA = [
  [0, 0, 0, 6, 0, 0, 0, 8, 0],
  [0, 3, 0, 5, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 3, 0, 4],
  [5, 9, 0, 0, 6, 0, 0, 0, 0],
  [6, 0, 4, 0, 0, 2, 0, 0, 0],
  [0, 0, 2, 0, 9, 0, 0, 0, 0],
  [4, 0, 0, 0, 3, 0, 0, 0, 1],
  [0, 8, 0, 0, 0, 7, 0, 0, 2],
  [0, 0, 0, 8, 0, 0, 0, 6, 3],
];

// Puzzle de solución única que se BLOQUEA con singles, pares y tríos y
// avanza con un naked quad: en la caja 3-5/6-8 las casillas (3,6),
// (4,6), (4,8) y (5,6) combinan {1,4,5,9}. El cuarteto elimina el 5 y
// el 9 de la columna 7, habilitando en la iteración siguiente el hidden
// single 5 de (0,7). El puzzle vuelve a bloquearse más adelante, pero
// ya ha avanzado gracias al cuarteto.
const NAKED_QUAD_HABILITA_SINGLE = [
  [4, 0, 0, 0, 0, 0, 3, 0, 0],
  [0, 5, 0, 0, 1, 3, 0, 0, 0],
  [0, 9, 0, 0, 5, 0, 7, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 8, 6, 9, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 8],
  [0, 0, 9, 0, 0, 0, 0, 1, 0],
  [5, 0, 0, 0, 9, 0, 0, 4, 0],
  [0, 0, 0, 6, 0, 4, 0, 8, 0],
];

test("un naked quad desbloquea un puzzle que antes quedaba bloqueado", () => {
  const original = copiarTablero(NAKED_QUAD_DESBLOQUEA);
  assert.equal(contarSoluciones(copiarTablero(NAKED_QUAD_DESBLOQUEA), 2), 1);

  const { estado, pasos, tablero } = resolverLogico(NAKED_QUAD_DESBLOQUEA);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);

  const indiceQuad = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_QUAD
  );
  assert.ok(indiceQuad >= 0);

  // Justo antes del primer naked quad no había ninguna técnica previa
  // efectiva: ni singles, ni pares, ni tríos. Es decir, con las técnicas
  // anteriores el puzzle se quedaba bloqueado.
  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_QUAD_DESBLOQUEA,
    pasos,
    indiceQuad
  );
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.equal(
    detectarNakedPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenPares(enJuego, eliminados).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarNakedTriples(enJuego, eliminados).filter(
      (t) => t.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenTriples(enJuego, eliminados).filter(
      (t) => t.eliminados.length > 0
    ).length,
    0
  );
  // ...pero sí había un naked quad efectivo.
  assert.ok(
    detectarNakedQuads(enJuego, eliminados).some(
      (q) => q.eliminados.length > 0
    )
  );

  // El tablero original no se modifica
  assert.deepEqual(NAKED_QUAD_DESBLOQUEA, original);
});

test("las eliminaciones de un naked quad se conservan entre iteraciones", () => {
  const { pasos } = resolverLogico(NAKED_QUAD_DESBLOQUEA);
  const indiceQuad = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_QUAD
  );
  assert.ok(indiceQuad >= 0);
  assert.ok(pasos[indiceQuad].eliminados.length > 0);

  // Reproducir hasta justo después del cuarteto: los candidatos
  // descartados siguen registrados y no reaparecen al recalcular.
  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_QUAD_DESBLOQUEA,
    pasos,
    indiceQuad + 1
  );
  for (const [fila, columna, numero] of pasos[indiceQuad].eliminados) {
    assert.ok(eliminados.has(`${fila},${columna},${numero}`));
    const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
      (n) => !eliminados.has(`${fila},${columna},${n}`)
    );
    assert.ok(!candidatos.includes(numero));
  }

  // Ningún paso posterior vuelve a colocar un número que el cuarteto eliminó.
  for (let i = indiceQuad + 1; i < pasos.length; i++) {
    const paso = pasos[i];
    if (paso.eliminados) continue;
    assert.ok(
      !pasos[indiceQuad].eliminados.some(
        ([fila, columna, numero]) =>
          fila === paso.fila && columna === paso.columna && numero === paso.numero
      ),
      `se colocó un candidato eliminado en (${paso.fila},${paso.columna})`
    );
  }
});

test("una eliminación de naked quad habilita un single en una iteración posterior", () => {
  const original = copiarTablero(NAKED_QUAD_HABILITA_SINGLE);
  assert.equal(
    contarSoluciones(copiarTablero(NAKED_QUAD_HABILITA_SINGLE), 2),
    1
  );

  const { estado, pasos, tablero } = resolverLogico(
    NAKED_QUAD_HABILITA_SINGLE
  );
  const indiceQuad = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.NAKED_QUAD
  );
  assert.ok(indiceQuad >= 0);

  const { enJuego, eliminados } = estadoAntesDe(
    NAKED_QUAD_HABILITA_SINGLE,
    pasos,
    indiceQuad
  );

  // Antes del cuarteto no hay ningún single y (0,7) tiene tres candidatos.
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);
  assert.deepEqual(obtenerCandidatos(enJuego, 0, 7), [2, 5, 6]);

  // Tras descontar sus eliminaciones aparece un hidden single.
  const conEliminaciones = new Set(eliminados);
  for (const [fila, columna, numero] of pasos[indiceQuad].eliminados) {
    conEliminaciones.add(`${fila},${columna},${numero}`);
  }
  assert.ok(
    detectarHiddenSingles(enJuego, conEliminaciones).some(
      (s) => s.fila === 0 && s.columna === 7 && s.numero === 5
    )
  );

  // El solver lo detecta en la iteración siguiente (progreso garantizado)
  assert.equal(pasos[indiceQuad + 1].tecnica, TECNICAS.HIDDEN_SINGLE);
  assert.equal(pasos[indiceQuad + 1].fila, 0);
  assert.equal(pasos[indiceQuad + 1].columna, 7);
  assert.equal(pasos[indiceQuad + 1].numero, 5);

  // El puzzle avanza (coloca números) y luego vuelve a bloquearse: con
  // las técnicas anteriores ni siquiera habría empezado a avanzar aquí.
  assert.ok(
    pasos.slice(indiceQuad + 1).some((paso) => !paso.eliminados)
  );
  assert.equal(estado, ESTADOS.BLOQUEADO);
  assert.ok(
    tablero.flat().filter((v) => v === 0).length <
      enJuego.flat().filter((v) => v === 0).length
  );

  // El tablero original no se modifica
  assert.deepEqual(NAKED_QUAD_HABILITA_SINGLE, original);
});

test("los pasos con naked quads se reproducen sin contradicciones", () => {
  const { pasos, tablero } = resolverLogico(NAKED_QUAD_DESBLOQUEA);

  const enJuego = copiarTablero(NAKED_QUAD_DESBLOQUEA);
  const eliminados = new Set();
  let quadsVistos = 0;

  for (const paso of pasos) {
    if (
      paso.tecnica === TECNICAS.NAKED_SINGLE ||
      paso.tecnica === TECNICAS.HIDDEN_SINGLE
    ) {
      assert.ok(
        esValido(enJuego, paso.fila, paso.columna, paso.numero),
        `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
      );
      enJuego[paso.fila][paso.columna] = paso.numero;
      continue;
    }

    // Técnicas de eliminación: no colocan número y eliminan candidatos
    // que todavía estaban presentes.
    assert.equal(paso.numero, undefined);
    assert.ok(paso.eliminados.length > 0);

    let tamano = 2;
    if (
      paso.tecnica === TECNICAS.NAKED_TRIPLE ||
      paso.tecnica === TECNICAS.HIDDEN_TRIPLE
    ) {
      tamano = 3;
    }
    if (paso.tecnica === TECNICAS.NAKED_QUAD) {
      tamano = 4;
      quadsVistos++;
    }
    assert.equal(paso.celdas.length, tamano);
    assert.equal(paso.candidatos.length, tamano);

    for (const [fila, columna, numero] of paso.eliminados) {
      const clave = `${fila},${columna},${numero}`;
      const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
        (n) => !eliminados.has(`${fila},${columna},${n}`)
      );
      assert.ok(candidatos.includes(numero), `eliminación inexistente ${clave}`);

      if (
        paso.tecnica === TECNICAS.HIDDEN_PAIR ||
        paso.tecnica === TECNICAS.HIDDEN_TRIPLE
      ) {
        assert.ok(!paso.candidatos.includes(numero));
        assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      } else {
        assert.ok(paso.candidatos.includes(numero));
        assert.ok(!paso.celdas.some(([f, c]) => f === fila && c === columna));
      }

      eliminados.add(clave);
    }
  }

  assert.ok(quadsVistos > 0);
  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("resolverLogico registra naked quads sin colocar números ni eliminar de más", () => {
  const { pasos } = resolverLogico(NAKED_QUAD_DESBLOQUEA);
  const quads = pasos.filter((p) => p.tecnica === TECNICAS.NAKED_QUAD);

  assert.ok(quads.length > 0);
  for (const quad of quads) {
    assert.equal(quad.numero, undefined);
    assert.equal(quad.celdas.length, 4);
    assert.equal(quad.candidatos.length, 4);
    assert.ok(quad.eliminados.length > 0);
    assert.ok(["fila", "columna", "caja"].includes(quad.unidad));
    for (const [fila, columna, numero] of quad.eliminados) {
      assert.ok(quad.candidatos.includes(numero));
      assert.ok(!quad.celdas.some(([f, c]) => f === fila && c === columna));
    }
  }
});

test("las técnicas conservan su prioridad también con naked quads", () => {
  const fixtures = [
    NAKED_QUAD_DESBLOQUEA,
    NAKED_QUAD_HABILITA_SINGLE,
    HIDDEN_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_FILA_DESBLOQUEA,
    HIDDEN_PAIR_DESBLOQUEA,
    SE_BLOQUEA_DESPUES,
    PAR_HABILITA_SINGLES_SIN_SINGLES,
    RESOLUBLE_SINGLES,
  ];

  let quadsVistos = 0;

  for (const fixture of fixtures) {
    const { pasos } = resolverLogico(fixture);
    const enJuego = copiarTablero(fixture);
    const eliminados = new Set();

    for (const paso of pasos) {
      // Un hidden single solo se aplica cuando no hay naked singles
      if (paso.tecnica === TECNICAS.HIDDEN_SINGLE) {
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
      }

      if (paso.eliminados) {
        // Antes de cualquier técnica de eliminación no debe quedar single
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
        assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

        if (paso.tecnica === TECNICAS.HIDDEN_PAIR) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }
        if (paso.tecnica === TECNICAS.NAKED_TRIPLE) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
        }
        if (paso.tecnica === TECNICAS.HIDDEN_TRIPLE) {
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarNakedTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
        }
        // El naked quad es la última técnica: solo se aplica si ninguna
        // de las anteriores produce una deducción efectiva.
        if (paso.tecnica === TECNICAS.NAKED_QUAD) {
          quadsVistos++;
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarNakedTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
        }

        for (const [fila, columna, numero] of paso.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
      } else {
        enJuego[paso.fila][paso.columna] = paso.numero;
      }
    }
  }

  // Los cuartetos retrasados se ejercieron en la reproducción
  assert.ok(quadsVistos > 0);
});

test("los tableros inválidos siguen clasificándose como inválidos con naked quads", () => {
  for (const invalido of [
    DUPLICADO_FILA,
    DUPLICADO_COLUMNA,
    DUPLICADO_CAJA,
    FUERA_DE_RANGO,
    ESTRUCTURA_ROTA,
    CASILLA_MUERTA,
  ]) {
    const original = copiarTablero(invalido);
    const { estado, pasos, tablero } = resolverLogico(invalido);
    assert.equal(estado, ESTADOS.INVALIDO);
    assert.equal(pasos.length, 0);
    assert.ok(!pasos.some((p) => p.tecnica === TECNICAS.NAKED_QUAD));
    assert.deepEqual(tablero, original);
    assert.deepEqual(invalido, original);
  }
});

// ------------------------------------------------------------
// Hidden quads integrados en resolverLogico
// ------------------------------------------------------------

// Puzzle de solución única que queda BLOQUEADO con singles, pares,
// tríos y naked quads: en la caja 0 el cuarteto oculto {1,2,3,4} ocupa
// (1,1), (1,2), (2,1) y (2,2), por lo que elimina los candidatos ajenos
// de esas cuatro casillas. Entre ellos, el 6 de (1,1) y (1,2) deja el 6
// como hidden single de la fila 1 en (1,6). Después el solver avanza con
// otro hidden single, pero vuelve a bloquearse.
const HIDDEN_QUAD_DESBLOQUEA = [
  [0, 0, 0, 1, 2, 3, 4, 0, 0],
  [0, 0, 0, 5, 0, 9, 0, 1, 0],
  [0, 0, 0, 6, 7, 0, 0, 3, 0],
  [1, 0, 0, 3, 0, 7, 5, 2, 6],
  [2, 5, 0, 8, 0, 0, 3, 7, 0],
  [3, 0, 0, 0, 5, 0, 0, 4, 0],
  [4, 2, 0, 7, 0, 5, 0, 0, 0],
  [6, 9, 0, 4, 0, 0, 7, 8, 0],
  [0, 0, 0, 0, 6, 0, 0, 0, 4],
];

test("un hidden quad desbloquea un puzzle que antes quedaba bloqueado", () => {
  const original = copiarTablero(HIDDEN_QUAD_DESBLOQUEA);

  // Con las técnicas anteriores no hay ninguna deducción efectiva.
  assert.equal(detectarNakedSingles(HIDDEN_QUAD_DESBLOQUEA).length, 0);
  assert.equal(detectarHiddenSingles(HIDDEN_QUAD_DESBLOQUEA).length, 0);
  assert.equal(
    detectarNakedPares(HIDDEN_QUAD_DESBLOQUEA).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenPares(HIDDEN_QUAD_DESBLOQUEA).filter(
      (p) => p.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarNakedTriples(HIDDEN_QUAD_DESBLOQUEA).filter(
      (t) => t.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarHiddenTriples(HIDDEN_QUAD_DESBLOQUEA).filter(
      (t) => t.eliminados.length > 0
    ).length,
    0
  );
  assert.equal(
    detectarNakedQuads(HIDDEN_QUAD_DESBLOQUEA).filter(
      (q) => q.eliminados.length > 0
    ).length,
    0
  );
  // ...pero sí hay un hidden quad efectivo.
  assert.ok(
    detectarHiddenQuads(HIDDEN_QUAD_DESBLOQUEA).some(
      (q) => q.eliminados.length > 0
    )
  );

  const { estado, pasos, tablero } = resolverLogico(HIDDEN_QUAD_DESBLOQUEA);

  // El primer paso es el cuarteto oculto y el puzzle avanza después.
  assert.equal(pasos[0].tecnica, TECNICAS.HIDDEN_QUAD);
  assert.ok(pasos.slice(1).some((p) => !p.eliminados));
  assert.ok(
    tablero.flat().filter((v) => v === 0).length <
      HIDDEN_QUAD_DESBLOQUEA.flat().filter((v) => v === 0).length
  );
  // No se resuelve por completo: vuelve a bloquearse tras avanzar.
  assert.equal(estado, ESTADOS.BLOQUEADO);

  // El tablero original no se modifica
  assert.deepEqual(HIDDEN_QUAD_DESBLOQUEA, original);
});

test("el fixture hidden quad es válido, único y sus eliminaciones respetan la solución", () => {
  const original = copiarTablero(HIDDEN_QUAD_DESBLOQUEA);

  // Validez y solución única verificadas sin el solucionador lógico.
  assert.equal(tableroEsValido(HIDDEN_QUAD_DESBLOQUEA), true);
  assert.equal(contarSoluciones(copiarTablero(HIDDEN_QUAD_DESBLOQUEA), 2), 1);

  const solucion = copiarTablero(HIDDEN_QUAD_DESBLOQUEA);
  assert.equal(resolverSudoku(solucion), true);
  assert.equal(tableroEsValido(solucion), true);
  assert.deepEqual(HIDDEN_QUAD_DESBLOQUEA, original);

  const { pasos } = resolverLogico(HIDDEN_QUAD_DESBLOQUEA);
  assert.equal(pasos[0].tecnica, TECNICAS.HIDDEN_QUAD);

  const quadInicial = pasos[0];
  assert.equal(quadInicial.unidad, "caja");
  assert.deepEqual(quadInicial.celdas, [
    [1, 1],
    [1, 2],
    [2, 1],
    [2, 2],
  ]);
  assert.deepEqual(quadInicial.candidatos, [1, 2, 3, 4]);

  const eliminaciones = pasos
    .filter((paso) => paso.tecnica === TECNICAS.HIDDEN_QUAD)
    .flatMap((paso) => paso.eliminados);
  assert.ok(eliminaciones.length > 0);

  // Ninguna eliminación se registra dos veces en todo el proceso.
  const claves = eliminaciones.map(
    ([fila, columna, numero]) => `${fila},${columna},${numero}`
  );
  assert.equal(new Set(claves).size, claves.length);

  for (const paso of pasos) {
    if (paso.tecnica !== TECNICAS.HIDDEN_QUAD) continue;

    assert.equal(paso.unidad, "caja");
    assert.equal(paso.celdas.length, 4);
    assert.equal(paso.candidatos.length, 4);

    const cajaFila = Math.floor(paso.celdas[0][0] / 3);
    const cajaColumna = Math.floor(paso.celdas[0][1] / 3);

    for (const [fila, columna, numero] of paso.eliminados) {
      // La casilla afectada pertenece a la caja del cuarteto oculto.
      assert.equal(Math.floor(fila / 3), cajaFila);
      assert.equal(Math.floor(columna / 3), cajaColumna);
      assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      // Lo eliminado es ajeno al conjunto {1,2,3,4} del cuarteto.
      assert.ok(!paso.candidatos.includes(numero));
      // Y nunca es el valor que la solución única tiene en esa casilla.
      assert.notEqual(numero, solucion[fila][columna]);
    }
  }

  // Los números colocados coinciden con la solución independiente.
  const enJuego = copiarTablero(HIDDEN_QUAD_DESBLOQUEA);
  for (const paso of pasos) {
    if (paso.eliminados) continue;
    assert.ok(esValido(enJuego, paso.fila, paso.columna, paso.numero));
    assert.equal(paso.numero, solucion[paso.fila][paso.columna]);
    enJuego[paso.fila][paso.columna] = paso.numero;
  }
});

test("las eliminaciones de un hidden quad se conservan entre iteraciones", () => {
  const { pasos } = resolverLogico(HIDDEN_QUAD_DESBLOQUEA);
  const indiceQuad = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.HIDDEN_QUAD
  );
  assert.ok(indiceQuad >= 0);
  assert.ok(pasos[indiceQuad].eliminados.length > 0);

  // Reproducir hasta justo después del cuarteto: los candidatos
  // descartados siguen registrados y no reaparecen al recalcular.
  const { enJuego, eliminados } = estadoAntesDe(
    HIDDEN_QUAD_DESBLOQUEA,
    pasos,
    indiceQuad + 1
  );
  for (const [fila, columna, numero] of pasos[indiceQuad].eliminados) {
    assert.ok(eliminados.has(`${fila},${columna},${numero}`));
    const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
      (n) => !eliminados.has(`${fila},${columna},${n}`)
    );
    assert.ok(!candidatos.includes(numero));
  }

  // Ningún paso posterior vuelve a colocar un candidato eliminado.
  for (let i = indiceQuad + 1; i < pasos.length; i++) {
    const paso = pasos[i];
    if (paso.eliminados) continue;
    assert.ok(
      !pasos[indiceQuad].eliminados.some(
        ([fila, columna, numero]) =>
          fila === paso.fila && columna === paso.columna && numero === paso.numero
      ),
      `se colocó un candidato eliminado en (${paso.fila},${paso.columna})`
    );
  }
});

test("una eliminación de hidden quad habilita un single en una iteración posterior", () => {
  const { pasos } = resolverLogico(HIDDEN_QUAD_DESBLOQUEA);
  const indiceQuad = pasos.findIndex(
    (p) => p.tecnica === TECNICAS.HIDDEN_QUAD
  );
  assert.ok(indiceQuad >= 0);

  const { enJuego, eliminados } = estadoAntesDe(
    HIDDEN_QUAD_DESBLOQUEA,
    pasos,
    indiceQuad
  );

  // Antes del cuarteto no hay ningún single.
  assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
  assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

  // Tras descontar sus eliminaciones aparece un hidden single 6 en (1,6).
  const conEliminaciones = new Set(eliminados);
  for (const [fila, columna, numero] of pasos[indiceQuad].eliminados) {
    conEliminaciones.add(`${fila},${columna},${numero}`);
  }
  assert.ok(
    detectarHiddenSingles(enJuego, conEliminaciones).some(
      (s) => s.fila === 1 && s.columna === 6 && s.numero === 6
    )
  );

  // El solver lo detecta en la iteración siguiente (progreso garantizado)
  assert.equal(pasos[indiceQuad + 1].tecnica, TECNICAS.HIDDEN_SINGLE);
  assert.equal(pasos[indiceQuad + 1].fila, 1);
  assert.equal(pasos[indiceQuad + 1].columna, 6);
  assert.equal(pasos[indiceQuad + 1].numero, 6);
});

test("los pasos con hidden quads se reproducen sin contradicciones", () => {
  const { pasos, tablero } = resolverLogico(HIDDEN_QUAD_DESBLOQUEA);

  const enJuego = copiarTablero(HIDDEN_QUAD_DESBLOQUEA);
  const eliminados = new Set();
  let quadsOcultosVistos = 0;

  for (const paso of pasos) {
    if (
      paso.tecnica === TECNICAS.NAKED_SINGLE ||
      paso.tecnica === TECNICAS.HIDDEN_SINGLE
    ) {
      assert.ok(
        esValido(enJuego, paso.fila, paso.columna, paso.numero),
        `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
      );
      enJuego[paso.fila][paso.columna] = paso.numero;
      continue;
    }

    // Técnicas de eliminación: no colocan número y eliminan candidatos
    // que todavía estaban presentes.
    assert.equal(paso.numero, undefined);
    assert.ok(paso.eliminados.length > 0);

    let tamano = 2;
    if (
      paso.tecnica === TECNICAS.NAKED_TRIPLE ||
      paso.tecnica === TECNICAS.HIDDEN_TRIPLE
    ) {
      tamano = 3;
    }
    if (
      paso.tecnica === TECNICAS.NAKED_QUAD ||
      paso.tecnica === TECNICAS.HIDDEN_QUAD
    ) {
      tamano = 4;
    }
    if (paso.tecnica === TECNICAS.HIDDEN_QUAD) quadsOcultosVistos++;
    assert.equal(paso.celdas.length, tamano);
    assert.equal(paso.candidatos.length, tamano);

    for (const [fila, columna, numero] of paso.eliminados) {
      const clave = `${fila},${columna},${numero}`;
      const candidatos = obtenerCandidatos(enJuego, fila, columna).filter(
        (n) => !eliminados.has(`${fila},${columna},${n}`)
      );
      assert.ok(candidatos.includes(numero), `eliminación inexistente ${clave}`);

      if (
        paso.tecnica === TECNICAS.HIDDEN_PAIR ||
        paso.tecnica === TECNICAS.HIDDEN_TRIPLE ||
        paso.tecnica === TECNICAS.HIDDEN_QUAD
      ) {
        // En una técnica oculta lo eliminado NO pertenece al conjunto y
        // la casilla afectada pertenece a la propia técnica.
        assert.ok(!paso.candidatos.includes(numero));
        assert.ok(paso.celdas.some(([f, c]) => f === fila && c === columna));
      } else {
        // En una técnica desnuda lo eliminado SON sus números y la
        // casilla afectada NO pertenece a la técnica.
        assert.ok(paso.candidatos.includes(numero));
        assert.ok(!paso.celdas.some(([f, c]) => f === fila && c === columna));
      }

      eliminados.add(clave);
    }
  }

  assert.ok(quadsOcultosVistos > 0);
  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("las técnicas conservan su prioridad también con hidden quads", () => {
  const fixtures = [
    HIDDEN_QUAD_DESBLOQUEA,
    NAKED_QUAD_DESBLOQUEA,
    NAKED_QUAD_HABILITA_SINGLE,
    HIDDEN_TRIPLE_DESBLOQUEA,
    NAKED_TRIPLE_DESBLOQUEA,
    HIDDEN_PAIR_DESBLOQUEA,
    SE_BLOQUEA_DESPUES,
    RESOLUBLE_SINGLES,
  ];

  let quadsOcultosVistos = 0;

  for (const fixture of fixtures) {
    const { pasos } = resolverLogico(fixture);
    const enJuego = copiarTablero(fixture);
    const eliminados = new Set();

    for (const paso of pasos) {
      if (paso.tecnica === TECNICAS.HIDDEN_SINGLE) {
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
      }

      if (paso.eliminados) {
        // Antes de cualquier técnica de eliminación no debe quedar single
        assert.equal(detectarNakedSingles(enJuego, eliminados).length, 0);
        assert.equal(detectarHiddenSingles(enJuego, eliminados).length, 0);

        // El hidden quad es la última técnica: solo se aplica si ninguna
        // de las anteriores produce una deducción efectiva.
        if (paso.tecnica === TECNICAS.HIDDEN_QUAD) {
          quadsOcultosVistos++;
          assert.equal(
            detectarNakedPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenPares(enJuego, eliminados).filter(
              (p) => p.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarNakedTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarHiddenTriples(enJuego, eliminados).filter(
              (t) => t.eliminados.length > 0
            ).length,
            0
          );
          assert.equal(
            detectarNakedQuads(enJuego, eliminados).filter(
              (q) => q.eliminados.length > 0
            ).length,
            0
          );
        }

        for (const [fila, columna, numero] of paso.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
      } else {
        enJuego[paso.fila][paso.columna] = paso.numero;
      }
    }
  }

  assert.ok(quadsOcultosVistos > 0);
});

test("los tableros inválidos siguen clasificándose como inválidos con hidden quads", () => {
  for (const invalido of [
    DUPLICADO_FILA,
    DUPLICADO_COLUMNA,
    DUPLICADO_CAJA,
    FUERA_DE_RANGO,
    ESTRUCTURA_ROTA,
    CASILLA_MUERTA,
  ]) {
    const original = copiarTablero(invalido);
    const { estado, pasos, tablero } = resolverLogico(invalido);
    assert.equal(estado, ESTADOS.INVALIDO);
    assert.equal(pasos.length, 0);
    assert.ok(!pasos.some((p) => p.tecnica === TECNICAS.HIDDEN_QUAD));
    assert.deepEqual(tablero, original);
    assert.deepEqual(invalido, original);
  }
});

// ------------------------------------------------------------
// Dificultad lógica
// ------------------------------------------------------------

test("evaluarDificultadLogica distingue singles, pares, tríos y cuartetos", () => {
  assert.equal(evaluarDificultadLogica(SOLUCION).nivel, NIVELES_DIFICULTAD_LOGICA.FACIL);
  assert.equal(evaluarDificultadLogica(SOLUCION).resuelto, true);

  const singles = evaluarDificultadLogica(RESOLUBLE_SINGLES);
  assert.equal(singles.nivel, NIVELES_DIFICULTAD_LOGICA.FACIL);
  assert.equal(singles.resuelto, true);
  assert.equal(singles.etiqueta, "Fácil");

  const pares = evaluarDificultadLogica(PAR_HABILITA_SINGLES_SIN_SINGLES);
  assert.equal(pares.nivel, NIVELES_DIFICULTAD_LOGICA.MEDIO);
  assert.equal(pares.etiqueta, "Medio");

  const triples = evaluarDificultadLogica(NAKED_TRIPLE_DESBLOQUEA);
  assert.equal(triples.nivel, NIVELES_DIFICULTAD_LOGICA.DIFICIL);
  assert.equal(triples.etiqueta, "Difícil");

  const quads = evaluarDificultadLogica(NAKED_QUAD_DESBLOQUEA);
  assert.equal(quads.nivel, NIVELES_DIFICULTAD_LOGICA.EXPERTO);
  assert.equal(quads.etiqueta, "Experto");
  assert.equal(quads.verificado, true);
});

test("evaluarDificultadLogica no garantiza un nivel si el solucionador se bloquea", () => {
  const evaluacion = evaluarDificultadLogica(BLOQUEADO_CON_PASOS);

  assert.equal(evaluacion.estado, ESTADOS.BLOQUEADO);
  assert.equal(evaluacion.resuelto, false);
  assert.equal(evaluacion.nivel, NIVELES_DIFICULTAD_LOGICA.DESCONOCIDO);
  assert.equal(evaluacion.verificado, false);
  assert.match(evaluacion.etiqueta, /sin verificar/);
});

test("evaluarDificultadLogica expone un diagnóstico determinista por nivel", () => {
  const porNivel = [
    [RESOLUBLE_SINGLES, NIVELES_DIFICULTAD_LOGICA.FACIL, 51],
    [PAR_HABILITA_SINGLES_SIN_SINGLES, NIVELES_DIFICULTAD_LOGICA.MEDIO, 52],
    [NAKED_TRIPLE_DESBLOQUEA, NIVELES_DIFICULTAD_LOGICA.DIFICIL, 58],
    [NAKED_QUAD_DESBLOQUEA, NIVELES_DIFICULTAD_LOGICA.EXPERTO, 61],
  ];

  for (const [puzzle, nivel, pasos] of porNivel) {
    const evaluacion = evaluarDificultadLogica(puzzle);

    assert.equal(evaluacion.estado, ESTADOS.RESUELTO);
    assert.equal(evaluacion.nivel, nivel);
    assert.equal(evaluacion.pasos, pasos);
    assert.equal(evaluacion.vaciasRestantes, 0);
    assert.ok(evaluacion.tecnicas.includes(evaluacion.ultimaTecnica));
  }

  const bloqueado = evaluarDificultadLogica(BLOQUEADO_CON_PASOS);
  assert.equal(bloqueado.pasos, 18);
  assert.equal(bloqueado.vaciasRestantes, 33);
  assert.equal(bloqueado.ultimaTecnica, TECNICAS.NAKED_TRIPLE);
});

test("cumpleDificultadLogica exige el nivel exacto, resuelto y verificado", () => {
  const facil = evaluarDificultadLogica(RESOLUBLE_SINGLES);
  const medio = evaluarDificultadLogica(PAR_HABILITA_SINGLES_SIN_SINGLES);
  const dificil = evaluarDificultadLogica(NAKED_TRIPLE_DESBLOQUEA);
  const experto = evaluarDificultadLogica(NAKED_QUAD_DESBLOQUEA);
  const sinVerificar = evaluarDificultadLogica(BLOQUEADO_CON_PASOS);

  for (const evaluacion of [facil, medio, dificil, experto]) {
    assert.equal(evaluacion.resuelto, true);
    assert.equal(evaluacion.verificado, true);
  }

  assert.equal(cumpleDificultadLogica(facil, "facil"), true);
  assert.equal(cumpleDificultadLogica(medio, "facil"), false);
  assert.equal(cumpleDificultadLogica(medio, "medio"), true);
  assert.equal(cumpleDificultadLogica(dificil, "facil"), false);
  assert.equal(cumpleDificultadLogica(dificil, "medio"), false);
  assert.equal(cumpleDificultadLogica(dificil, "dificil"), true);
  assert.equal(cumpleDificultadLogica(experto, "dificil"), false);
  assert.equal(cumpleDificultadLogica(experto, "experto"), true);

  // Bloqueado/sin verificar o desconocido no cumple ningún nivel.
  assert.equal(sinVerificar.verificado, false);
  for (const nivel of Object.keys(CRITERIOS_DIFICULTAD_LOGICA)) {
    assert.equal(cumpleDificultadLogica(sinVerificar, nivel), false);
  }

  assert.equal(
    Object.keys(CRITERIOS_DIFICULTAD_LOGICA).length,
    Object.keys(NIVELES_DIFICULTAD_LOGICA).length - 1
  );
});

test("cada nivel lógico solo acepta su nivel exacto", () => {
  const porNivel = {
    facil: evaluarDificultadLogica(RESOLUBLE_SINGLES),
    medio: evaluarDificultadLogica(PAR_HABILITA_SINGLES_SIN_SINGLES),
    dificil: evaluarDificultadLogica(NAKED_TRIPLE_DESBLOQUEA),
    experto: evaluarDificultadLogica(NAKED_QUAD_DESBLOQUEA),
  };

  for (const [nivel, evaluacion] of Object.entries(porNivel)) {
    assert.equal(evaluacion.resuelto, true);
    assert.equal(evaluacion.verificado, true);
    for (const otro of Object.keys(CRITERIOS_DIFICULTAD_LOGICA)) {
      assert.equal(
        cumpleDificultadLogica(evaluacion, otro),
        otro === nivel,
        `${nivel} evaluado como ${otro}`
      );
    }
  }
});

test("cumpleDificultadLogica rechaza resultados no resueltos o no verificados", () => {
  const resuelto = evaluarDificultadLogica(RESOLUBLE_SINGLES);

  assert.equal(
    cumpleDificultadLogica({ ...resuelto, resuelto: false }, "facil"),
    false
  );
  assert.equal(
    cumpleDificultadLogica({ ...resuelto, verificado: false }, "facil"),
    false
  );

  const incompleto = evaluarDificultadLogica(SIN_SINGLES);
  assert.equal(incompleto.estado, ESTADOS.BLOQUEADO);
  assert.equal(incompleto.resuelto, false);
  assert.equal(incompleto.verificado, false);
  for (const nivel of Object.keys(CRITERIOS_DIFICULTAD_LOGICA)) {
    assert.equal(cumpleDificultadLogica(incompleto, nivel), false);
  }
});

test("evaluarDificultadLogica marca inválido un tablero con repetidos", () => {
  const evaluacion = evaluarDificultadLogica(DUPLICADO_FILA);

  assert.equal(evaluacion.estado, ESTADOS.INVALIDO);
  assert.equal(evaluacion.nivel, null);
  assert.equal(evaluacion.verificado, false);
  assert.equal(evaluacion.pasos, 0);
  assert.equal(evaluacion.vaciasRestantes, null);
  assert.equal(evaluacion.ultimaTecnica, null);
  for (const nivel of Object.keys(CRITERIOS_DIFICULTAD_LOGICA)) {
    assert.equal(cumpleDificultadLogica(evaluacion, nivel), false);
  }
});
