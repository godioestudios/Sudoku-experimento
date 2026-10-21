import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useSudoku } from "../src/hooks/useSudoku.js";

const TAM = 9;

function crearSolucion() {
  return Array.from({ length: TAM }, (_, fila) =>
    Array.from(
      { length: TAM },
      (_, columna) => ((fila * 3 + Math.floor(fila / 3) + columna) % 9) + 1
    )
  );
}

function crearPartida(vacias = []) {
  const tableroSolucion = crearSolucion();
  const tableroJuego = tableroSolucion.map((fila) => [...fila]);
  const celdasFijas = tableroJuego.map((fila) => fila.map(() => true));

  for (const [fila, columna] of vacias) {
    tableroJuego[fila][columna] = 0;
    celdasFijas[fila][columna] = false;
  }

  const notas = Array.from({ length: TAM }, () =>
    Array.from({ length: TAM }, () => new Set())
  );

  return { tableroSolucion, tableroJuego, celdasFijas, notas };
}

function restaurarGlobal(nombre, valor) {
  if (valor === undefined) delete globalThis[nombre];
  else globalThis[nombre] = valor;
}

function instalarDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const previos = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return () => {
    dom.window.close();
    restaurarGlobal("window", previos.window);
    restaurarGlobal("document", previos.document);
    restaurarGlobal(
      "IS_REACT_ACT_ENVIRONMENT",
      previos.IS_REACT_ACT_ENVIRONMENT
    );
  };
}

function instalarWorkerFake() {
  const instancias = [];
  const anterior = globalThis.Worker;

  class WorkerFake {
    constructor(url, opciones) {
      this.url = url;
      this.opciones = opciones;
      this.oyentes = { message: [], error: [] };
      this.enviado = null;
      this.terminado = false;
      instancias.push(this);
    }

    addEventListener(tipo, oyente) {
      this.oyentes[tipo].push(oyente);
    }

    postMessage(datos) {
      this.enviado = datos;
    }

    terminate() {
      this.terminado = true;
    }

    emitirMensaje(data) {
      for (const oyente of this.oyentes.message) oyente({ data });
    }

    emitirError(message) {
      for (const oyente of this.oyentes.error) oyente({ message });
    }
  }

  globalThis.Worker = WorkerFake;

  return {
    instancias,
    restaurar() {
      restaurarGlobal("Worker", anterior);
    },
  };
}

function montarHook() {
  const resultado = { current: null };
  const contenedor = document.createElement("div");
  document.body.appendChild(contenedor);

  function Sonda() {
    resultado.current = useSudoku();
    return null;
  }

  const raiz = createRoot(contenedor);
  act(() => raiz.render(createElement(Sonda)));

  return {
    resultado,
    desmontar() {
      act(() => raiz.unmount());
      contenedor.remove();
    },
  };
}

function preparar(t) {
  const limpiarDom = instalarDom();
  const workers = instalarWorkerFake();
  let desmontar = () => {};

  t.after(() => {
    desmontar();
    workers.restaurar();
    limpiarDom();
  });

  return {
    workers,
    montar() {
      const hook = montarHook();
      desmontar = hook.desmontar;
      return hook;
    },
  };
}

function ejecutar(accion) {
  act(() => accion());
}

function completarGeneracion(trabajador, partida) {
  act(() => {
    trabajador.emitirMensaje({ id: trabajador.enviado.id, partida });
  });
}

function fallarGeneracion(trabajador, mensaje = "fallo simulado") {
  act(() => {
    trabajador.emitirError(mensaje);
  });
}

test("inicia una partida en dificultad media y aplica la generación", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  assert.equal(resultado.current.dificultad, "medio");
  assert.equal(resultado.current.generando, true);
  assert.equal(resultado.current.listo, false);
  assert.equal(workers.instancias.length, 1);
  assert.deepEqual(workers.instancias[0].enviado, { id: 1, nivel: "medio" });

  completarGeneracion(workers.instancias[0], partida);

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);
  assert.deepEqual(resultado.current.tableroJuego, partida.tableroJuego);
  assert.deepEqual(resultado.current.tableroSolucion, partida.tableroSolucion);
  assert.equal(
    resultado.current.estado,
    "Selecciona una casilla y coloca un número."
  );
  assert.equal(resultado.current.errores, 0);
  assert.equal(resultado.current.seleccion, null);
  assert.equal(resultado.current.deshacerDisponible, false);
});

test("cambiar de dificultad reinicia el progreso y descarta respuestas obsoletas", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const primera = crearPartida([[0, 0], [0, 1]]);

  completarGeneracion(workers.instancias[0], primera);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(9));
  ejecutar(() => resultado.current.alternarNotas());
  const tableroConProgreso = resultado.current.tableroJuego.map((fila) => [
    ...fila,
  ]);
  assert.equal(resultado.current.errores, 1);
  assert.equal(resultado.current.modoNotas, true);
  assert.equal(resultado.current.deshacerDisponible, true);

  ejecutar(() => resultado.current.cambiarDificultad("dificil"));

  assert.equal(resultado.current.dificultad, "dificil");
  assert.equal(resultado.current.generando, true);
  assert.equal(resultado.current.pausado, false);
  assert.equal(workers.instancias.length, 2);
  assert.equal(workers.instancias[0].terminado, true);
  assert.deepEqual(workers.instancias[1].enviado, { id: 2, nivel: "dificil" });

  const obsoleta = crearPartida([[1, 1]]);
  completarGeneracion(workers.instancias[0], obsoleta);
  assert.equal(resultado.current.generando, true);
  assert.deepEqual(resultado.current.tableroJuego, tableroConProgreso);

  const nueva = crearPartida([[2, 2]]);
  completarGeneracion(workers.instancias[1], nueva);

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.dificultad, "dificil");
  assert.deepEqual(resultado.current.tableroJuego, nueva.tableroJuego);
  assert.equal(resultado.current.errores, 0);
  assert.equal(resultado.current.seleccion, null);
  assert.equal(resultado.current.modoNotas, false);
  assert.equal(resultado.current.deshacerDisponible, false);
});

test("coloca números, cuenta errores y respeta las celdas fijas", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);
  const solucion = partida.tableroSolucion;

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  assert.equal(resultado.current.seleccion, null);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  const incorrecto = solucion[0][0] === 9 ? 1 : solucion[0][0] + 1;
  ejecutar(() => resultado.current.colocarNumero(incorrecto));

  assert.equal(resultado.current.tableroJuego[0][0], incorrecto);
  assert.equal(resultado.current.errores, 1);
  assert.equal(resultado.current.deshacerDisponible, true);

  ejecutar(() => resultado.current.colocarNumero(solucion[0][0]));
  assert.equal(resultado.current.tableroJuego[0][0], solucion[0][0]);
  assert.equal(resultado.current.errores, 1);

  ejecutar(() => resultado.current.seleccionarCelda(1, 1));
  ejecutar(() => resultado.current.colocarNumero(9));

  assert.equal(
    resultado.current.tableroJuego[1][1],
    partida.tableroJuego[1][1]
  );
  assert.equal(resultado.current.errores, 1);
});

test("los apuntes alternan candidatos y se limpian al colocar un número", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.alternarNotas());
  assert.equal(resultado.current.modoNotas, true);
  assert.match(resultado.current.estado, /Modo apuntes activado/);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(3));
  ejecutar(() => resultado.current.colocarNumero(5));
  assert.deepEqual([...resultado.current.notas[0][0]].sort(), [3, 5]);

  ejecutar(() => resultado.current.colocarNumero(3));
  assert.deepEqual([...resultado.current.notas[0][0]], [5]);

  ejecutar(() => resultado.current.alternarNotas());
  assert.equal(resultado.current.modoNotas, false);
  assert.match(resultado.current.estado, /Modo apuntes desactivado/);

  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[0][0]));
  assert.equal(
    resultado.current.tableroJuego[0][0],
    partida.tableroSolucion[0][0]
  );
  assert.equal(resultado.current.notas[0][0].size, 0);

  ejecutar(() => resultado.current.alternarNotas());
  ejecutar(() => resultado.current.colocarNumero(7));
  assert.equal(resultado.current.notas[0][0].size, 0);
});

test("deshacer restaura tablero, apuntes y errores", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(9));
  assert.equal(resultado.current.errores, 1);

  ejecutar(() => resultado.current.deshacer());
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.errores, 0);
  assert.equal(resultado.current.deshacerDisponible, false);

  ejecutar(() => resultado.current.alternarNotas());
  ejecutar(() => resultado.current.colocarNumero(4));
  ejecutar(() => resultado.current.colocarNumero(6));
  assert.deepEqual([...resultado.current.notas[0][0]].sort(), [4, 6]);

  ejecutar(() => resultado.current.deshacer());
  assert.deepEqual([...resultado.current.notas[0][0]], [4]);

  ejecutar(() => resultado.current.deshacer());
  assert.equal(resultado.current.notas[0][0].size, 0);
  assert.equal(resultado.current.deshacerDisponible, false);
});

test("darPista revela la solución en una casilla vacía", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);
  const solucion = partida.tableroSolucion;

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.seleccionarCelda(1, 1));
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.tableroJuego[0][0], solucion[0][0]);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
  assert.equal(resultado.current.deshacerDisponible, true);

  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.tableroJuego[0][1], solucion[0][1]);
  assert.equal(resultado.current.deshacerDisponible, true);
  assert.equal(resultado.current.victoria, true);
});

test("darPista avisa cuando no quedan casillas vacías", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida();
  const incorrecto = partida.tableroSolucion[0][0] === 9 ? 1 : partida.tableroSolucion[0][0] + 1;
  partida.tableroJuego[0][0] = incorrecto;

  completarGeneracion(workers.instancias[0], partida);

  const tableroAntes = resultado.current.tableroJuego.map((fila) => [...fila]);
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.victoria, false);
  assert.match(resultado.current.estado, /No quedan casillas vacías/);
  assert.deepEqual(resultado.current.tableroJuego, tableroAntes);
});

test("la pausa bloquea acciones y la reanudación las habilita", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.pausar());
  assert.equal(resultado.current.pausado, true);

  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[0][0]));
  ejecutar(() => resultado.current.seleccionarCelda(0, 1));
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
  assert.equal(resultado.current.errores, 0);
  assert.equal(resultado.current.deshacerDisponible, false);

  ejecutar(() => resultado.current.reanudar());
  assert.equal(resultado.current.pausado, false);

  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[0][0]));
  assert.equal(
    resultado.current.tableroJuego[0][0],
    partida.tableroSolucion[0][0]
  );
});

test("el cronómetro avanza solo con la partida activa y sin pausa", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  t.after(() => t.mock.timers.reset());

  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  act(() => t.mock.timers.tick(3000));
  assert.equal(resultado.current.segundos, 0);

  completarGeneracion(workers.instancias[0], partida);
  act(() => t.mock.timers.tick(3000));
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.pausar());
  act(() => t.mock.timers.tick(5000));
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.reanudar());
  act(() => t.mock.timers.tick(2000));
  assert.equal(resultado.current.segundos, 5);
});

test("detecta la victoria al completar la última casilla y detiene el cronómetro", (t) => {
  t.mock.timers.enable({ apis: ["setInterval"] });
  t.after(() => t.mock.timers.reset());

  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[8, 8]]);

  completarGeneracion(workers.instancias[0], partida);

  act(() => t.mock.timers.tick(1000));
  assert.equal(resultado.current.segundos, 1);
  assert.equal(resultado.current.victoria, false);

  ejecutar(() => resultado.current.seleccionarCelda(8, 8));
  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[8][8]));

  assert.equal(resultado.current.victoria, true);
  assert.equal(resultado.current.estado, "¡Sudoku completado!");

  act(() => t.mock.timers.tick(5000));
  assert.equal(resultado.current.segundos, 1);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  assert.deepEqual(resultado.current.seleccion, { fila: 8, columna: 8 });
});

test("una generación fallida conserva la partida anterior y permite reintentar", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.cambiarDificultad("experto"));
  fallarGeneracion(workers.instancias[1], "boom");

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);
  assert.deepEqual(resultado.current.tableroJuego, partida.tableroJuego);
  assert.match(resultado.current.estado, /No se pudo generar el puzzle: boom/);

  ejecutar(() => resultado.current.cambiarDificultad("facil"));
  const nueva = crearPartida([[1, 1]]);
  completarGeneracion(workers.instancias[2], nueva);

  assert.equal(resultado.current.dificultad, "facil");
  assert.equal(resultado.current.generando, false);
  assert.deepEqual(resultado.current.tableroJuego, nueva.tableroJuego);
  assert.equal(
    resultado.current.estado,
    "Selecciona una casilla y coloca un número."
  );
});

test("una generación inicial fallida deja el juego sin partida pero listo para reintentar", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  fallarGeneracion(workers.instancias[0]);

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, false);
  assert.equal(resultado.current.tableroJuego, undefined);
  assert.match(resultado.current.estado, /No se pudo generar el puzzle/);

  ejecutar(() => resultado.current.nuevoJuego());
  assert.equal(workers.instancias.length, 2);
  assert.equal(resultado.current.generando, true);

  const partida = crearPartida([[0, 0]]);
  completarGeneracion(workers.instancias[1], partida);

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);
  assert.deepEqual(resultado.current.tableroJuego, partida.tableroJuego);
});
