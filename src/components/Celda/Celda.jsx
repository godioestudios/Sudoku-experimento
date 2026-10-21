import { TAMAÑO_CAJA } from "../../utils/sudoku.js";
import { etiquetaCelda } from "../../utils/accesibilidad.js";
import "./Celda.css";

/**
 * Una casilla del tablero. Calcula sus clases de resaltado a partir
 * de la selección y de la solución.
 */
export default function Celda({
  fila,
  columna,
  valor,
  esFija,
  candidatos,
  seleccionada,
  seleccion,
  valorSeleccionado,
  solucion,
  pausado,
  onSeleccionar,
}) {
  const clases = ["celda"];
  const incorrecta = !esFija && valor !== 0 && valor !== solucion;

  if (columna === 2 || columna === 5) clases.push("borde-derecha");
  if (fila === 2 || fila === 5) clases.push("borde-abajo");

  if (pausado) {
    clases.push("pausado");
  } else {
    clases.push(esFija ? "fija" : "jugador");

    if (seleccionada) clases.push("seleccionada");

    const enArea = (() => {
      if (!seleccion) return false;
      const mismaFila = fila === seleccion.fila;
      const mismaColumna = columna === seleccion.columna;
      const mismaCaja =
        Math.floor(fila / TAMAÑO_CAJA) === Math.floor(seleccion.fila / TAMAÑO_CAJA) &&
        Math.floor(columna / TAMAÑO_CAJA) === Math.floor(seleccion.columna / TAMAÑO_CAJA);
      return mismaFila || mismaColumna || mismaCaja;
    })();
    if (enArea) clases.push("en-area");

    if (valorSeleccionado !== 0 && valor === valorSeleccionado) clases.push("mismo-numero");

    if (incorrecta) clases.push("error");
  }

  const mostrarNotas = !pausado && valor === 0 && candidatos.size > 0;

  return (
    <button
      type="button"
      className={clases.join(" ")}
      role="gridcell"
      aria-label={etiquetaCelda({
        fila,
        columna,
        valor,
        esFija,
        candidatos,
        incorrecta,
        pausado,
      })}
      aria-selected={seleccionada}
      aria-readonly={esFija}
      onClick={() => onSeleccionar(fila, columna)}
    >
      {pausado ? null : valor !== 0 ? (
        valor
      ) : mostrarNotas ? (
        <div className="notas">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <span key={n} className={candidatos.has(n) ? "" : "nota-oculta"}>
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
