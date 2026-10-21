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

  let desmontado = false;

  return {
    resultado,
    desmontar() {
      if (desmontado) return;
      desmontado = true;
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

// Reloj monotónico controlado: mueve performance.now() y dispara los intervalos.
function instalarRelojSimulado(t) {
  t.mock.timers.enable({ apis: ["setInterval"] });
  t.after(() => t.mock.timers.reset());

  let ahoraMs = 0;
  t.mock.method(performance, "now", () => ahoraMs);

  return {
    avanzar(ms) {
      ahoraMs += ms;
      act(() => t.mock.timers.tick(ms));
    },
    // Solo mueve el reloj, como una pestaña en segundo plano sin timers.
    avanzarReloj(ms) {
      ahoraMs += ms;
    },
  };
}

function presionar(key, opciones = {}, objetivo = document) {
  const evento = new window.KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...opciones,
  });
  act(() => objetivo.dispatchEvent(evento));
  return evento;
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

test("la etiqueta de dificultad refleja el resultado lógico del motor", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = {
    ...crearPartida([[0, 0]]),
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

  completarGeneracion(workers.instancias[0], partida);

  assert.equal(resultado.current.etiquetaDificultad, "Fácil");
  assert.equal(resultado.current.dificultad, "medio");
  assert.match(resultado.current.estado, /no garantizada/);
});

test("listo se apaga durante una nueva generación y se recupera al terminar o fallar", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const primera = crearPartida([[0, 0]]);

  assert.equal(resultado.current.generando, true);
  assert.equal(resultado.current.listo, false);

  completarGeneracion(workers.instancias[0], primera);
  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);

  ejecutar(() => resultado.current.nuevoJuego("dificil"));
  assert.equal(resultado.current.generando, true);
  assert.equal(resultado.current.listo, false);
  assert.deepEqual(resultado.current.tableroJuego, primera.tableroJuego);

  const segunda = crearPartida([[1, 1]]);
  completarGeneracion(workers.instancias[1], segunda);
  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);
  assert.deepEqual(resultado.current.tableroJuego, segunda.tableroJuego);

  ejecutar(() => resultado.current.nuevoJuego("facil"));
  assert.equal(resultado.current.listo, false);

  fallarGeneracion(workers.instancias[2], "boom");
  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, true);
  assert.match(resultado.current.estado, /No se pudo generar el puzzle: boom/);
  assert.deepEqual(resultado.current.tableroJuego, segunda.tableroJuego);
});

test("una generación inicial fallida no deja el indicador de carga activo", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  fallarGeneracion(workers.instancias[0], "boom");

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.listo, false);
  assert.match(resultado.current.estado, /No se pudo generar el puzzle: boom/);
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

  assert.deepEqual(resultado.current.confirmacionPendiente, { nivel: "dificil" });
  assert.equal(resultado.current.dificultad, "medio");
  assert.equal(resultado.current.generando, false);
  assert.equal(workers.instancias.length, 1);
  assert.deepEqual(resultado.current.tableroJuego, tableroConProgreso);

  ejecutar(() => resultado.current.confirmarNuevoJuego());

  assert.equal(resultado.current.confirmacionPendiente, null);
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

test("una partida sin progreso se reemplaza sin pedir confirmación", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.nuevoJuego());

  assert.equal(resultado.current.confirmacionPendiente, null);
  assert.equal(resultado.current.generando, true);
  assert.equal(workers.instancias.length, 2);
  assert.equal(workers.instancias[0].terminado, true);
  assert.deepEqual(workers.instancias[1].enviado, { id: 2, nivel: "medio" });
});

test("una partida con progreso pide confirmación y la aceptación inicia una sola generación", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(9));
  const tableroConProgreso = resultado.current.tableroJuego.map((fila) => [...fila]);

  ejecutar(() => resultado.current.nuevoJuego());

  assert.deepEqual(resultado.current.confirmacionPendiente, { nivel: "medio" });
  assert.equal(resultado.current.generando, false);
  assert.equal(workers.instancias.length, 1);
  assert.deepEqual(resultado.current.tableroJuego, tableroConProgreso);

  ejecutar(() => resultado.current.confirmarNuevoJuego());
  ejecutar(() => resultado.current.confirmarNuevoJuego());

  assert.equal(resultado.current.confirmacionPendiente, null);
  assert.equal(resultado.current.generando, true);
  assert.equal(workers.instancias.length, 2);
  assert.equal(workers.instancias[0].terminado, true);

  const nueva = crearPartida([[1, 1]]);
  completarGeneracion(workers.instancias[1], nueva);

  assert.deepEqual(resultado.current.tableroJuego, nueva.tableroJuego);
  assert.equal(resultado.current.errores, 0);
  assert.equal(resultado.current.deshacerDisponible, false);
});

test("cancelar la confirmación conserva tablero, apuntes, errores, cronómetro y pausa", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  completarGeneracion(workers.instancias[0], partida);
  reloj.avanzar(2000);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(9));
  ejecutar(() => resultado.current.alternarNotas());
  ejecutar(() => resultado.current.seleccionarCelda(0, 1));
  ejecutar(() => resultado.current.colocarNumero(3));
  ejecutar(() => resultado.current.pausar());

  const tableroAntes = resultado.current.tableroJuego.map((fila) => [...fila]);
  const apuntesAntes = [...resultado.current.notas[0][1]];
  assert.equal(resultado.current.errores, 1);
  assert.equal(resultado.current.segundos, 2);
  assert.equal(resultado.current.pausado, true);

  ejecutar(() => resultado.current.cambiarDificultad("dificil"));

  assert.deepEqual(resultado.current.confirmacionPendiente, { nivel: "dificil" });
  assert.equal(resultado.current.dificultad, "medio");
  assert.equal(resultado.current.generando, false);
  assert.equal(workers.instancias.length, 1);

  ejecutar(() => resultado.current.cancelarNuevoJuego());

  assert.equal(resultado.current.confirmacionPendiente, null);
  assert.equal(resultado.current.dificultad, "medio");
  assert.deepEqual(resultado.current.tableroJuego, tableroAntes);
  assert.deepEqual([...resultado.current.notas[0][1]], apuntesAntes);
  assert.equal(resultado.current.errores, 1);
  assert.equal(resultado.current.segundos, 2);
  assert.equal(resultado.current.pausado, true);
  assert.equal(resultado.current.generando, false);
  assert.equal(workers.instancias.length, 1);
});

test("volver a elegir la dificultad actual sin progreso no pide confirmación", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.cambiarDificultad("medio"));

  assert.equal(resultado.current.confirmacionPendiente, null);
  assert.equal(resultado.current.dificultad, "medio");
  assert.equal(resultado.current.generando, true);
  assert.equal(workers.instancias.length, 2);
  assert.deepEqual(workers.instancias[1].enviado, { id: 2, nivel: "medio" });
});

test("una nueva partida durante una generación cancela la anterior sin confirmar", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  assert.equal(resultado.current.generando, true);
  assert.equal(workers.instancias.length, 1);

  ejecutar(() => resultado.current.nuevoJuego("facil"));

  assert.equal(resultado.current.confirmacionPendiente, null);
  assert.equal(resultado.current.generando, true);
  assert.equal(workers.instancias.length, 2);
  assert.equal(workers.instancias[0].terminado, true);
  assert.deepEqual(workers.instancias[1].enviado, { id: 2, nivel: "facil" });

  completarGeneracion(workers.instancias[0], crearPartida([[1, 1]]));
  assert.equal(resultado.current.generando, true);

  const nueva = crearPartida([[2, 2]]);
  completarGeneracion(workers.instancias[1], nueva);

  assert.equal(resultado.current.generando, false);
  assert.deepEqual(resultado.current.tableroJuego, nueva.tableroJuego);
});

test("dos llamadas rápidas a nuevoJuego solo aplican la última", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.nuevoJuego("facil"));
  ejecutar(() => resultado.current.nuevoJuego("experto"));

  assert.equal(workers.instancias.length, 3);
  assert.equal(workers.instancias[1].terminado, true);
  assert.deepEqual(workers.instancias[2].enviado, { id: 3, nivel: "experto" });
  assert.equal(resultado.current.generando, true);

  completarGeneracion(workers.instancias[1], crearPartida([[1, 1]]));
  assert.equal(resultado.current.generando, true);
  assert.deepEqual(resultado.current.tableroJuego, partida.tableroJuego);

  const ultima = crearPartida([[2, 2]]);
  completarGeneracion(workers.instancias[2], ultima);

  assert.equal(resultado.current.generando, false);
  assert.deepEqual(resultado.current.tableroJuego, ultima.tableroJuego);
});

test("varias dificultades rápidas descartan las generaciones intermedias", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.cambiarDificultad("facil"));
  ejecutar(() => resultado.current.cambiarDificultad("experto"));

  assert.equal(resultado.current.dificultad, "experto");
  assert.equal(workers.instancias.length, 3);
  assert.equal(workers.instancias[1].terminado, true);
  assert.deepEqual(workers.instancias[2].enviado, { id: 3, nivel: "experto" });

  completarGeneracion(workers.instancias[1], crearPartida([[1, 1]]));
  assert.equal(resultado.current.generando, true);
  assert.deepEqual(resultado.current.tableroJuego, partida.tableroJuego);

  const nueva = crearPartida([[2, 2]]);
  completarGeneracion(workers.instancias[2], nueva);

  assert.equal(resultado.current.generando, false);
  assert.equal(resultado.current.dificultad, "experto");
  assert.deepEqual(resultado.current.tableroJuego, nueva.tableroJuego);
});

test("desmontar durante una generación termina el trabajador y no inicia otros", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado, desmontar } = montar();
  const trabajador = workers.instancias[0];

  assert.equal(trabajador.terminado, false);
  desmontar();

  assert.equal(trabajador.terminado, true);

  const generandoAntes = resultado.current.generando;
  const listoAntes = resultado.current.listo;

  trabajador.emitirMensaje({
    id: trabajador.enviado.id,
    partida: crearPartida([[0, 0]]),
  });
  resultado.current.nuevoJuego("facil");

  assert.equal(workers.instancias.length, 1);
  assert.equal(resultado.current.generando, generandoAntes);
  assert.equal(resultado.current.listo, listoAntes);
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

const TODOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function apuntesDe(resultado, fila, columna) {
  return [...resultado.current.notas[fila][columna]].sort((a, b) => a - b);
}

function prepararColocacionConApuntes(t, celdas) {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida(celdas);

  for (let fila = 0; fila < TAM; fila++) {
    for (let columna = 0; columna < TAM; columna++) {
      partida.notas[fila][columna] = new Set(TODOS);
    }
  }

  completarGeneracion(workers.instancias[0], partida);
  const numero = partida.tableroSolucion[0][0];
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(numero));

  return { resultado, partida, numero };
}

test("colocar un número limpia el candidato de la misma fila", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [[0, 0], [0, 1], [0, 8]]);

  assert.equal(resultado.current.notas[0][1].has(numero), false);
  assert.equal(resultado.current.notas[0][8].has(numero), false);
});

test("colocar un número limpia el candidato de la misma columna", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [[0, 0], [8, 0]]);

  assert.equal(resultado.current.notas[8][0].has(numero), false);
});

test("colocar un número limpia el candidato de la misma caja", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [[0, 0], [1, 1]]);

  assert.equal(resultado.current.notas[1][1].has(numero), false);
});

test("la limpieza conserva los demás candidatos de las celdas afectadas", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [[0, 0], [0, 1]]);

  assert.deepEqual(
    apuntesDe(resultado, 0, 1),
    TODOS.filter((candidato) => candidato !== numero)
  );
});

test("la limpieza no toca apuntes fuera de fila, columna y caja ni celdas fijas", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [[0, 0], [4, 4]]);

  assert.deepEqual(apuntesDe(resultado, 4, 4), TODOS);
  assert.deepEqual(apuntesDe(resultado, 0, 1), TODOS);
  assert.equal(resultado.current.notas[0][1].has(numero), true);
});

test("deshacer una colocación restaura los apuntes eliminados", (t) => {
  const { resultado, numero } = prepararColocacionConApuntes(t, [
    [0, 0],
    [0, 1],
    [8, 0],
    [1, 1],
    [4, 4],
  ]);

  assert.equal(resultado.current.notas[0][1].has(numero), false);

  ejecutar(() => resultado.current.deshacer());

  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.deepEqual(apuntesDe(resultado, 0, 1), TODOS);
  assert.deepEqual(apuntesDe(resultado, 8, 0), TODOS);
  assert.deepEqual(apuntesDe(resultado, 1, 1), TODOS);
  assert.deepEqual(apuntesDe(resultado, 4, 4), TODOS);
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

  assert.equal(resultado.current.pistasRestantes, 3);

  ejecutar(() => resultado.current.seleccionarCelda(1, 1));
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.tableroJuego[0][0], solucion[0][0]);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
  assert.equal(resultado.current.deshacerDisponible, true);
  assert.equal(resultado.current.pistasRestantes, 2);

  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.tableroJuego[0][1], solucion[0][1]);
  assert.equal(resultado.current.deshacerDisponible, true);
  assert.equal(resultado.current.pistasRestantes, 1);
  assert.equal(resultado.current.victoria, true);
});

test("darPista sobre una casilla vacía seleccionada consume una pista", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.tableroJuego[0][0], partida.tableroSolucion[0][0]);
  assert.equal(resultado.current.tableroJuego[0][1], 0);
  assert.equal(resultado.current.pistasRestantes, 2);
});

test("darPista no sobrescribe un valor incorrecto del usuario ni consume pista", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);
  const solucion = partida.tableroSolucion[0][0];
  const incorrecto = solucion === 9 ? 1 : solucion + 1;

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(incorrecto));

  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.tableroJuego[0][0], incorrecto);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
  assert.match(resultado.current.estado, /incorrecto/i);
  assert.equal(resultado.current.pistasRestantes, 3);
});

test("darPista no modifica las casillas originales", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(1, 1));
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.tableroJuego[1][1], partida.tableroSolucion[1][1]);
  assert.equal(resultado.current.tableroJuego[0][0], partida.tableroSolucion[0][0]);
  assert.equal(resultado.current.pistasRestantes, 2);
});

test("al agotarse las pistas la acción no modifica el tablero", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1], [0, 2], [0, 3]]);

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.darPista());
  ejecutar(() => resultado.current.darPista());
  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.pistasRestantes, 0);

  const tableroAntes = resultado.current.tableroJuego.map((fila) => [...fila]);
  ejecutar(() => resultado.current.darPista());

  assert.equal(resultado.current.pistasRestantes, 0);
  assert.deepEqual(resultado.current.tableroJuego, tableroAntes);
  assert.equal(resultado.current.tableroJuego[0][3], 0);
  assert.match(resultado.current.estado, /No quedan pistas disponibles/);
});

test("una pista no consumida se conserva si la acción no puede ejecutarse", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida();
  const incorrecto = partida.tableroSolucion[0][0] === 9 ? 1 : partida.tableroSolucion[0][0] + 1;
  partida.tableroJuego[0][0] = incorrecto;

  completarGeneracion(workers.instancias[0], partida);

  const tableroAntes = resultado.current.tableroJuego.map((fila) => [...fila]);
  ejecutar(() => resultado.current.darPista());

  assert.deepEqual(resultado.current.tableroJuego, tableroAntes);
  assert.equal(resultado.current.pistasRestantes, 3);
  assert.match(resultado.current.estado, /No quedan casillas vacías/);
});

test("reiniciar la partida recarga el límite de pistas", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.pistasRestantes, 2);

  ejecutar(() => resultado.current.nuevoJuego());
  ejecutar(() => resultado.current.confirmarNuevoJuego());

  const nueva = crearPartida([[1, 1]]);
  completarGeneracion(workers.instancias[1], nueva);

  assert.equal(resultado.current.pistasRestantes, 3);
});

test("deshacer una pista restaura el tablero pero no devuelve la pista", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.pistasRestantes, 2);

  ejecutar(() => resultado.current.deshacer());

  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.pistasRestantes, 2);
  assert.equal(resultado.current.deshacerDisponible, false);

  ejecutar(() => resultado.current.darPista());
  assert.equal(resultado.current.pistasRestantes, 1);
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
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  reloj.avanzar(3000);
  assert.equal(resultado.current.segundos, 0);

  completarGeneracion(workers.instancias[0], partida);
  reloj.avanzar(3000);
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.pausar());
  reloj.avanzar(5000);
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.reanudar());
  reloj.avanzar(2000);
  assert.equal(resultado.current.segundos, 5);
});

test("el cronómetro mide tiempo real aunque el intervalo se atrase", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  completarGeneracion(workers.instancias[0], crearPartida([[0, 0]]));

  // Simula una pestaña en segundo plano: el reloj avanza 4 s pero el intervalo
  // no se ejecuta. Al dispararse una sola vez debe reflejar los 5 s reales.
  reloj.avanzarReloj(4000);
  reloj.avanzar(1000);

  assert.equal(resultado.current.segundos, 5);
});

test("pausar y reanudar varias veces no duplica intervalos ni cuenta la pausa", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  completarGeneracion(workers.instancias[0], crearPartida([[0, 0]]));

  reloj.avanzar(1000);
  assert.equal(resultado.current.segundos, 1);

  ejecutar(() => resultado.current.pausar());
  reloj.avanzar(5000);
  assert.equal(resultado.current.segundos, 1);

  ejecutar(() => resultado.current.reanudar());
  reloj.avanzar(2000);
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.pausar());
  reloj.avanzar(5000);
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.reanudar());
  reloj.avanzar(1000);
  assert.equal(resultado.current.segundos, 4);
});

test("iniciar una partida nueva reinicia el cronómetro", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  completarGeneracion(workers.instancias[0], crearPartida([[0, 0]]));
  reloj.avanzar(3000);
  assert.equal(resultado.current.segundos, 3);

  ejecutar(() => resultado.current.nuevoJuego());
  assert.equal(resultado.current.segundos, 0);
  assert.equal(resultado.current.generando, true);

  completarGeneracion(workers.instancias[1], crearPartida([[1, 1]]));
  reloj.avanzar(2000);
  assert.equal(resultado.current.segundos, 2);
});

test("un cambio del reloj del sistema no altera el cronómetro", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();

  completarGeneracion(workers.instancias[0], crearPartida([[0, 0]]));
  reloj.avanzar(1000);
  assert.equal(resultado.current.segundos, 1);

  // El reloj de pared salta una hora; performance.now() sigue siendo monotónico.
  const relojDePared = Date.now;
  t.mock.method(Date, "now", () => relojDePared() + 60 * 60 * 1000);
  reloj.avanzar(1000);

  assert.equal(resultado.current.segundos, 2);
});

test("detecta la victoria al completar la última casilla y detiene el cronómetro", (t) => {
  const reloj = instalarRelojSimulado(t);

  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[8, 8]]);

  completarGeneracion(workers.instancias[0], partida);

  reloj.avanzar(1000);
  assert.equal(resultado.current.segundos, 1);
  assert.equal(resultado.current.victoria, false);

  ejecutar(() => resultado.current.seleccionarCelda(8, 8));
  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[8][8]));

  assert.equal(resultado.current.victoria, true);
  assert.equal(resultado.current.estado, "¡Sudoku completado!");

  reloj.avanzar(5000);
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

test("los atajos normales N, H y Z siguen funcionando", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);

  presionar("n");
  assert.equal(resultado.current.modoNotas, true);
  presionar("N");
  assert.equal(resultado.current.modoNotas, false);

  presionar("h");
  assert.equal(
    resultado.current.tableroJuego[0][0],
    partida.tableroSolucion[0][0]
  );
  assert.equal(resultado.current.deshacerDisponible, true);

  presionar("z");
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.deshacerDisponible, false);
});

function abrirModal() {
  const modal = document.createElement("div");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  document.body.appendChild(modal);
  return () => modal.remove();
}

test("los atajos del tablero no se ejecutan mientras un modal está abierto", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);

  ejecutar(() => resultado.current.seleccionarCelda(0, 0));
  ejecutar(() => resultado.current.colocarNumero(partida.tableroSolucion[0][0]));
  const tableroAntes = resultado.current.tableroJuego.map((fila) => [...fila]);

  const cerrarModal = abrirModal();

  presionar("n");
  presionar("h");
  presionar("z");
  presionar(String(partida.tableroSolucion[0][1]));

  assert.equal(resultado.current.modoNotas, false);
  assert.equal(resultado.current.pistasRestantes, 3);
  assert.deepEqual(resultado.current.tableroJuego, tableroAntes);
  assert.equal(resultado.current.deshacerDisponible, true);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });

  cerrarModal();
});

test("al cerrar el modal vuelven a funcionar los atajos", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0], [0, 1]]);

  t.mock.method(Math, "random", () => 0);
  completarGeneracion(workers.instancias[0], partida);

  const cerrarModal = abrirModal();
  presionar("n");
  assert.equal(resultado.current.modoNotas, false);

  cerrarModal();
  presionar("n");
  assert.equal(resultado.current.modoNotas, true);

  presionar("h");
  assert.equal(resultado.current.pistasRestantes, 2);
  assert.equal(resultado.current.tableroJuego[0][0], partida.tableroSolucion[0][0]);
});

test("con varios modales los atajos recién vuelven al cerrar el último", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  const cerrarPrimero = abrirModal();
  const cerrarSegundo = abrirModal();

  presionar("n");
  assert.equal(resultado.current.modoNotas, false);

  cerrarPrimero();
  presionar("n");
  assert.equal(resultado.current.modoNotas, false);

  cerrarSegundo();
  presionar("n");
  assert.equal(resultado.current.modoNotas, true);
});

test("abrir y cerrar modales varias veces no duplica el listener de teclado", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);

  for (let i = 0; i < 3; i++) {
    const cerrarModal = abrirModal();
    presionar("n");
    cerrarModal();
  }

  presionar("n");
  assert.equal(resultado.current.modoNotas, true);
});

test("Escape dentro de un modal no dispara el atajo del tablero", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));

  const cerrarModal = abrirModal();
  presionar("Escape");
  cerrarModal();

  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
});

test("los atajos se ignoran con Ctrl, Meta o Alt y no bloquean al navegador", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));

  for (const modificador of ["ctrlKey", "metaKey", "altKey"]) {
    for (const key of ["n", "h", "z", "p"]) {
      const evento = presionar(key, { [modificador]: true });
      assert.equal(evento.defaultPrevented, false);
    }
  }

  assert.equal(resultado.current.modoNotas, false);
  assert.equal(resultado.current.pausado, false);
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.deshacerDisponible, false);

  const flecha = presionar("ArrowDown", { ctrlKey: true });
  assert.equal(flecha.defaultPrevented, false);
  assert.deepEqual(resultado.current.seleccion, { fila: 0, columna: 0 });
});

test("los atajos se ignoran en controles editables", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));

  for (const etiqueta of ["input", "textarea"]) {
    const control = document.createElement(etiqueta);
    document.body.appendChild(control);

    presionar("n", {}, control);
    presionar("h", {}, control);
    presionar("z", {}, control);
    presionar("p", {}, control);

    control.remove();
  }

  assert.equal(resultado.current.modoNotas, false);
  assert.equal(resultado.current.pausado, false);
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.deshacerDisponible, false);
});

test("al desmontar se elimina el listener de teclado", (t) => {
  const { workers, montar } = preparar(t);
  const { resultado, desmontar } = montar();
  const partida = crearPartida([[0, 0]]);

  completarGeneracion(workers.instancias[0], partida);
  ejecutar(() => resultado.current.seleccionarCelda(0, 0));

  desmontar();

  presionar("n");
  presionar("h");
  presionar("z");
  presionar("p");

  assert.equal(resultado.current.modoNotas, false);
  assert.equal(resultado.current.pausado, false);
  assert.equal(resultado.current.tableroJuego[0][0], 0);
  assert.equal(resultado.current.deshacerDisponible, false);
});
