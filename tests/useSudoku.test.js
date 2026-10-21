import test from "node:test";
import assert from "node:assert/strict";

import { resolverGeneracion } from "../src/hooks/useSudoku.js";

const partidaAnterior = {
  tableroJuego: [[1, 2, 3]],
  tableroSolucion: [[1, 2, 3]],
};

test("resolverGeneracion conserva la partida anterior ante un TypeError", () => {
  const resultado = resolverGeneracion({
    id: 1,
    idVigente: 1,
    partidaAnterior,
    respuesta: { id: 1, error: new TypeError("prepararPartida falló") },
  });

  assert.equal(resultado.partida, partidaAnterior);
  assert.equal(resultado.generando, false);
  assert.equal(resultado.activa, true);
  assert.match(resultado.estado, /No se pudo generar el puzzle/);
  assert.match(resultado.error, /TypeError/);
});

test("resolverGeneracion deja de cargar y aplica la partida nueva", () => {
  const nueva = { tableroJuego: [[0]], tableroSolucion: [[1]] };

  const resultado = resolverGeneracion({
    id: 2,
    idVigente: 2,
    partidaAnterior,
    respuesta: { id: 2, partida: nueva },
  });

  assert.equal(resultado.partida, nueva);
  assert.equal(resultado.error, null);
  assert.equal(resultado.generando, false);
  assert.equal(resultado.activa, true);
  assert.equal(resultado.estado, "Selecciona una casilla y coloca un número.");
});

test("resolverGeneracion trata una respuesta sin partida como error recuperable", () => {
  const resultado = resolverGeneracion({
    id: 3,
    idVigente: 3,
    partidaAnterior,
    respuesta: { id: 3 },
  });

  assert.equal(resultado.partida, partidaAnterior);
  assert.equal(resultado.generando, false);
  assert.match(resultado.error, /partida válida/);
});

test("una generación obsoleta no altera el estado de la generación vigente", () => {
  const resultado = resolverGeneracion({
    id: 1,
    idVigente: 2,
    partidaAnterior,
    respuesta: { id: 1, error: new TypeError("fallo viejo") },
  });

  assert.equal(resultado, null);
});
