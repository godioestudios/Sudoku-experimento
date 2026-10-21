import test from "node:test";
import assert from "node:assert/strict";

import { copiarTablero, contarSoluciones } from "../src/utils/sudoku.js";
import { generarPartida, procesarSolicitud } from "../src/utils/generador.js";

const TAM = 9;

function contarVacias(tablero) {
  return tablero.flat().filter((valor) => valor === 0).length;
}

test("procesarSolicitud responde con el id y una partida válida", () => {
  const respuesta = procesarSolicitud({ id: 42, nivel: "facil" });

  assert.equal(respuesta.id, 42);
  assert.equal(respuesta.error, undefined);

  const { partida } = respuesta;
  assert.ok(partida);
  assert.equal(partida.tableroSolucion.length, TAM);
  assert.equal(partida.tableroJuego.length, TAM);

  // Las pistas del tablero de juego coinciden con la solución y el puzzle
  // conserva una única solución.
  for (let fila = 0; fila < TAM; fila++) {
    for (let columna = 0; columna < TAM; columna++) {
      if (partida.celdasFijas[fila][columna]) {
        assert.equal(
          partida.tableroJuego[fila][columna],
          partida.tableroSolucion[fila][columna]
        );
      }
    }
  }

  assert.ok(contarVacias(partida.tableroJuego) > 0);
  assert.equal(contarSoluciones(copiarTablero(partida.tableroJuego), 2), 1);
  for (const fila of partida.notas) {
    for (const candidatos of fila) assert.equal(candidatos.size, 0);
  }

  assert.equal(partida.dificultadLogica.solicitada, "facil");
  assert.equal(partida.dificultadLogica.alcanzada, true);
  assert.equal(partida.dificultadLogica.motivo, "objetivo");
  assert.equal(partida.dificultadLogica.estado, "resuelto");
  assert.equal(partida.dificultadLogica.etiqueta, "Fácil");
  assert.equal(partida.dificultadLogica.vaciasRestantes, 0);
  assert.ok(partida.dificultadLogica.pasos > 0);
  assert.ok(
    partida.dificultadLogica.tecnicas.includes(
      partida.dificultadLogica.ultimaTecnica
    )
  );
});

test("procesarSolicitud devuelve el error con el mismo id", () => {
  const respuesta = procesarSolicitud({ id: 7, nivel: "inexistente" });

  assert.equal(respuesta.id, 7);
  assert.match(respuesta.error, /Dificultad desconocida/);
  assert.equal(respuesta.partida, undefined);
});

test("generarPartida comparte una semilla entre solución, vaciado e intercambios", () => {
  const primera = generarPartida("facil", { semilla: "partida-repetible" });
  const repetida = generarPartida("facil", { semilla: "partida-repetible" });

  assert.deepEqual(primera.tableroSolucion, repetida.tableroSolucion);
  assert.deepEqual(primera.tableroJuego, repetida.tableroJuego);
  assert.deepEqual(primera.celdasFijas, repetida.celdasFijas);
  assert.deepEqual(
    {
      ...primera.dificultadLogica.diagnostico,
      tiempoUnicidadMs: undefined,
      tiempoEvaluacionMs: undefined,
      tiempoTotalMs: undefined,
    },
    {
      ...repetida.dificultadLogica.diagnostico,
      tiempoUnicidadMs: undefined,
      tiempoEvaluacionMs: undefined,
      tiempoTotalMs: undefined,
    }
  );
  assert.equal(contarSoluciones(copiarTablero(primera.tableroJuego), 2), 1);
  assert.equal(primera.dificultadLogica.alcanzada, true);
});
