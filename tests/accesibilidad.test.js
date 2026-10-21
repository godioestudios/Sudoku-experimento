import test from "node:test";
import assert from "node:assert/strict";

import { etiquetaCelda } from "../src/utils/accesibilidad.js";

test("la etiqueta indica posición y diferencia una celda original de una editable", () => {
  const original = etiquetaCelda({ fila: 0, columna: 2, valor: 7, esFija: true });
  const editable = etiquetaCelda({ fila: 1, columna: 3, valor: 4, esFija: false });

  assert.match(original, /Fila 1, columna 3/);
  assert.match(original, /Valor 7/);
  assert.match(original, /original, no editable/);
  assert.doesNotMatch(editable, /original, no editable/);
  assert.match(editable, /editable/);
  assert.match(editable, /Fila 2, columna 4/);
});

test("la etiqueta anuncia vacío, error y apuntes", () => {
  const vacia = etiquetaCelda({
    fila: 4,
    columna: 4,
    valor: 0,
    esFija: false,
    candidatos: new Set([9, 2, 5]),
  });
  const incorrecta = etiquetaCelda({
    fila: 8,
    columna: 8,
    valor: 3,
    esFija: false,
    incorrecta: true,
  });

  assert.match(vacia, /Vacía/);
  assert.match(vacia, /Apuntes: 2, 5, 9/);
  assert.match(incorrecta, /Valor 3, incorrecto/);
  assert.match(incorrecta, /Fila 9, columna 9/);
});

test("la etiqueta de una celda en pausa no revela el valor", () => {
  const etiqueta = etiquetaCelda({
    fila: 0,
    columna: 0,
    valor: 8,
    esFija: true,
    pausado: true,
  });

  assert.match(etiqueta, /juego en pausa/);
  assert.doesNotMatch(etiqueta, /Valor 8/);
});
