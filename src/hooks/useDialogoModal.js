import { useEffect, useRef } from "react";

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function enfocablesDe(dialogo) {
  return [...dialogo.querySelectorAll(SELECTOR_ENFOCABLES)].filter(
    (elemento) =>
      !elemento.hasAttribute("hidden") &&
      elemento.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Foco inicial, trampa de Tab, Escape opcional y restauración del foco
 * al cerrar un diálogo modal.
 */
export function useDialogoModal({ visible, onEscape }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!visible) return;

    const dialogo = ref.current;
    if (!dialogo) return;

    const anterior = document.activeElement;

    const listar = () => enfocablesDe(dialogo);
    (listar()[0] ?? dialogo).focus();

    function manejarTeclado(evento) {
      if (evento.key === "Escape") {
        if (!onEscape) return;
        evento.preventDefault();
        evento.stopPropagation();
        onEscape();
        return;
      }

      if (evento.key !== "Tab") return;

      const enfocables = listar();
      if (enfocables.length === 0) {
        evento.preventDefault();
        dialogo.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;

      if (evento.shiftKey) {
        if (activo === primero || !dialogo.contains(activo)) {
          evento.preventDefault();
          ultimo.focus();
        }
      } else if (activo === ultimo || !dialogo.contains(activo)) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", manejarTeclado, true);

    return () => {
      document.removeEventListener("keydown", manejarTeclado, true);
      if (anterior?.isConnected && typeof anterior.focus === "function") {
        anterior.focus();
      }
    };
  }, [visible, onEscape]);

  return ref;
}
