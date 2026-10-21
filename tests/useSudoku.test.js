import test from "node:test";
import assert from "node:assert/strict";

import { contarDigitosCorrectos, resolverGeneracion } from "../src/hooks/useSudoku.js";

const tableroVacio = () => Array.from({ length: 9 }, () => Array(9).fill(0));

const solucionBase = () =>
  Array.from({ length: 9 }, (_, fila) =>
    Array.from({ length: 9 }, (_, columna) => ((fila * 3 + Math.floor(fila / 3) + columna) % 9) + 1)
  );

const posicionesDe = (solucion, numero) => {
  const posiciones = [];
  for (let fila = 0; fila < 9; fila++) {
    for (let columna = 0; columna < 9; columna++) {
      if (solucion[fila][columna] === numero) posiciones.push([fila, columna]);
    }
  }
  return posiciones;
};

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

test("conteo de dígitos: tablero vacío no cuenta apariciones", () => {
  const conteo = contarDigitosCorrectos(tableroVacio(), solucionBase());

  assert.deepEqual(conteo, Array(10).fill(0));
});

test("conteo de dígitos: cuenta las colocaciones correctas", () => {
  const solucion = solucionBase();
  const tablero = tableroVacio();
  const [filaA, columnaA] = posicionesDe(solucion, 4)[0];
  const [filaB, columnaB] = posicionesDe(solucion, 7)[0];
  tablero[filaA][columnaA] = 4;
  tablero[filaB][columnaB] = 7;

  const conteo = contarDigitosCorrectos(tablero, solucion);

  assert.equal(conteo[4], 1);
  assert.equal(conteo[7], 1);
});

test("conteo de dígitos: ignora un número incorrecto que coincide con el dígito consultado", () => {
  const solucion = solucionBase();
  const tablero = tableroVacio();
  const [fila, columna] = posicionesDe(solucion, 3)[0];
  tablero[fila][columna] = 5;

  const conteo = contarDigitosCorrectos(tablero, solucion);

  assert.equal(conteo[5], 0);
  assert.equal(9 - conteo[5], 9);
});

test("conteo de dígitos: un dígito completamente colocado de forma correcta queda completo", () => {
  const solucion = solucionBase();
  const tablero = tableroVacio();
  for (const [fila, columna] of posicionesDe(solucion, 5)) {
    tablero[fila][columna] = 5;
  }

  const conteo = contarDigitosCorrectos(tablero, solucion);

  assert.equal(conteo[5], 9);
  assert.equal(9 - conteo[5], 0);
});

test("conteo de dígitos: no suma colocaciones incorrectas a un dígito incompleto", () => {
  const solucion = solucionBase();
  const tablero = tableroVacio();
  const posiciones = posicionesDe(solucion, 5);
  for (const [fila, columna] of posiciones.slice(0, 3)) tablero[fila][columna] = 5;
  // Dos celdas donde la solución no es 5: no deben contarse
  for (const [fila, columna] of posicionesDe(solucion, 2).slice(0, 2)) tablero[fila][columna] = 5;

  const conteo = contarDigitosCorrectos(tablero, solucion);

  assert.equal(conteo[5], 3);
  assert.equal(9 - conteo[5], 6);
});

test("resolverGeneracion informa que la dificultad pedida no está garantizada", () => {
  const nueva = {
    tableroJuego: [[0]],
    tableroSolucion: [[1]],
    dificultadLogica: {
      solicitada: "experto",
      alcanzada: false,
      motivo: "dificultad",
      nivel: 0,
      nombre: "facil",
      etiqueta: "Fácil",
      verificado: true,
      vacias: 56,
      vaciasObjetivo: 56,
    },
  };

  const resultado = resolverGeneracion({
    id: 4,
    idVigente: 4,
    partidaAnterior,
    respuesta: { id: 4, partida: nueva },
  });

  assert.match(
    resultado.estado,
    /Dificultad Experto no garantizada: el puzzle generado es Fácil\./
  );
});

test("resolverGeneracion menciona el presupuesto agotado", () => {
  const nueva = {
    tableroJuego: [[0]],
    tableroSolucion: [[1]],
    dificultadLogica: {
      solicitada: "experto",
      alcanzada: false,
      motivo: "presupuesto",
      nivel: 0,
      nombre: "facil",
      etiqueta: "Fácil",
      verificado: true,
      vacias: 54,
      vaciasObjetivo: 56,
    },
  };

  const resultado = resolverGeneracion({
    id: 5,
    idVigente: 5,
    partidaAnterior,
    respuesta: { id: 5, partida: nueva },
  });

  assert.match(resultado.estado, /Se agotó el presupuesto de generación\./);
});
