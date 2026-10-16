import { TAMAÑO } from "../../utils/sudoku.js";
import Celda from "../Celda/Celda.jsx";
import OverlayPausa from "../OverlayPausa/OverlayPausa.jsx";
import "./Tablero.css";

export default function Tablero({
  tableroJuego,
  tableroSolucion,
  celdasFijas,
  notas,
  seleccion,
  pausado,
  onSeleccionarCelda,
  onReanudar,
}) {
  const valorSeleccionado = seleccion ? tableroJuego[seleccion.fila][seleccion.columna] : 0;

  const celdas = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      celdas.push(
        <Celda
          key={`${fila}-${columna}`}
          fila={fila}
          columna={columna}
          valor={tableroJuego[fila][columna]}
          solucion={tableroSolucion[fila][columna]}
          esFija={celdasFijas[fila][columna]}
          candidatos={notas[fila][columna]}
          seleccion={seleccion}
          seleccionada={
            !!seleccion && seleccion.fila === fila && seleccion.columna === columna
          }
          valorSeleccionado={valorSeleccionado}
          pausado={pausado}
          onSeleccionar={onSeleccionarCelda}
        />
      );
    }
  }

  return (
    <div className="tablero-envoltorio">
      <div className="tablero" role="grid" aria-label="Tablero de sudoku">
        {celdas}
      </div>
      <OverlayPausa visible={pausado} onReanudar={onReanudar} />
    </div>
  );
}
