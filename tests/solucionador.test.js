import test from "node:test";
import assert from "node:assert/strict";

import {
  ESTADOS,
  TECNICAS,
  clasificarTablero,
  detectarHiddenSingles,
  detectarNakedSingles,
  obtenerCandidatos,
  resolverLogico,
  tableroEsValido,
} from "../src/utils/solucionador.js";
import { copiarTablero, contarSoluciones, esValido } from "../src/utils/sudoku.js";

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

// ------------------------------------------------------------
// resolverLogico
// ------------------------------------------------------------

test("resolverLogico resuelve por completo un puzzle de solución única", () => {
  const original = copiarTablero(RESOLUBLE_SINGLES);
  const { estado, pasos, tablero } = resolverLogico(RESOLUBLE_SINGLES);

  assert.equal(estado, ESTADOS.RESUELTO);
  assert.equal(tablero.flat().filter((v) => v === 0).length, 0);
  assert.equal(pasos.length, 51); // 81 - 30 pistas iniciales

  // Cada paso registra técnica y número colocado
  for (const paso of pasos) {
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
    assert.ok(
      esValido(enJuego, paso.fila, paso.columna, paso.numero),
      `paso contradictorio en (${paso.fila},${paso.columna}) = ${paso.numero}`
    );
    enJuego[paso.fila][paso.columna] = paso.numero;
  }

  assert.deepEqual(enJuego, tablero);
  assert.equal(tableroEsValido(tablero), true);
});

test("resolverLogico se bloquea cuando faltan técnicas básicas", () => {
  const original = copiarTablero(SE_BLOQUEA_DESPUES);
  const { estado, pasos, tablero } = resolverLogico(SE_BLOQUEA_DESPUES);

  assert.equal(estado, ESTADOS.BLOQUEADO);
  assert.equal(pasos.length, 8);
  assert.ok(tablero.flat().filter((v) => v === 0).length > 0);
  // Al bloquearse ya no queda ningún single disponible
  assert.equal(detectarNakedSingles(tablero).length, 0);
  assert.equal(detectarHiddenSingles(tablero).length, 0);

  // El tablero original no se modifica
  assert.deepEqual(SE_BLOQUEA_DESPUES, original);
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
