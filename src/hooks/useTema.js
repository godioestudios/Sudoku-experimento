import { useCallback, useEffect, useState } from "react";

const CLAVE = "sudoku-tema";
const OSCURO = "oscuro";
const CLARO = "claro";

/** Tema inicial: lo que ya fijó el script del HTML, el guardado o el sistema. */
function temaInicial() {
  if (typeof document === "undefined") return CLARO;

  const actual = document.documentElement.getAttribute("data-theme");
  if (actual === OSCURO || actual === CLARO) return actual;

  const prefiereOscuro =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefiereOscuro ? OSCURO : CLARO;
}

/**
 * Gestiona el tema claro/oscuro: aplica el atributo data-theme al documento
 * y recuerda la preferencia en localStorage.
 */
export function useTema() {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Almacenamiento no disponible (modo privado, etc.)
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((previo) => (previo === OSCURO ? CLARO : OSCURO));
  }, []);

  return { tema, oscuro: tema === OSCURO, alternarTema };
}
