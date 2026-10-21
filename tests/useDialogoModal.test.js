import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";

import { useDialogoModal } from "../src/hooks/useDialogoModal.js";

function Dialogo({ visible, onEscape }) {
  const ref = useDialogoModal({ visible, onEscape });
  if (!visible) return null;

  return h(
    "div",
    { ref, role: "dialog", tabIndex: -1 },
    h("h2", { id: "titulo" }, "Confirmación"),
    h("button", { id: "cancelar" }, "Cancelar"),
    h("button", { id: "confirmar" }, "Confirmar")
  );
}

function Arnes({ visible, onEscape }) {
  return h(
    "div",
    null,
    h("button", { id: "abridor" }, "Abrir"),
    h(Dialogo, { visible, onEscape })
  );
}

function preparar(t) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const previos = {
    window: globalThis.window,
    document: globalThis.document,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const contenedor = document.createElement("div");
  document.body.appendChild(contenedor);
  const raiz = createRoot(contenedor);

  t.after(() => {
    act(() => raiz.unmount());
    dom.window.close();
    for (const [nombre, valor] of Object.entries(previos)) {
      if (valor === undefined) delete globalThis[nombre];
      else globalThis[nombre] = valor;
    }
  });

  return {
    renderizar(props) {
      act(() => raiz.render(h(Arnes, props)));
    },
    tecla(objetivo, key, opciones = {}) {
      const evento = new window.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...opciones,
      });
      act(() => objetivo.dispatchEvent(evento));
      return evento;
    },
  };
}

test("al abrir enfoca el primer control y al cerrar devuelve el foco al abridor", (t) => {
  const { renderizar } = preparar(t);

  renderizar({ visible: false });
  const abridor = document.getElementById("abridor");
  act(() => abridor.focus());

  renderizar({ visible: true });
  assert.equal(document.activeElement.id, "cancelar");

  renderizar({ visible: false });
  assert.equal(document.activeElement, abridor);
});

test("Tab y Shift+Tab quedan atrapados dentro del diálogo", (t) => {
  const { renderizar, tecla } = preparar(t);

  renderizar({ visible: false });
  act(() => document.getElementById("abridor").focus());
  renderizar({ visible: true });

  const confirmar = document.getElementById("confirmar");
  act(() => confirmar.focus());
  tecla(confirmar, "Tab");
  assert.equal(document.activeElement.id, "cancelar");

  tecla(document.activeElement, "Tab", { shiftKey: true });
  assert.equal(document.activeElement.id, "confirmar");
});

test("Escape ejecuta el cierre del diálogo y no se propaga al resto de la página", (t) => {
  const { renderizar, tecla } = preparar(t);

  let escapes = 0;
  let burbujeos = 0;
  const espia = () => {
    burbujeos += 1;
  };
  document.addEventListener("keydown", espia);

  renderizar({ visible: false });
  renderizar({ visible: true, onEscape: () => (escapes += 1) });

  tecla(document.activeElement, "Escape");

  document.removeEventListener("keydown", espia);

  assert.equal(escapes, 1);
  assert.equal(burbujeos, 0);
});

test("sin manejador de Escape el diálogo sigue siendo modal", (t) => {
  const { renderizar, tecla } = preparar(t);

  renderizar({ visible: false });
  renderizar({ visible: true });

  const evento = tecla(document.activeElement, "Escape");

  assert.equal(evento.defaultPrevented, false);
  assert.equal(document.getElementById("cancelar").isConnected, true);
});
