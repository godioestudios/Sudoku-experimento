import { formatearTiempo } from "../../utils/sudoku.js";
import "./ModalVictoria.css";

export default function ModalVictoria({ visible, segundos, errores, onNuevoJuego }) {
  if (!visible) return null;

  return (
    <div className="modal">
      <div className="modal-tarjeta">
        <h2 className="modal-titulo">¡Excelente!</h2>
        <p className="modal-texto">Has completado el Sudoku correctamente.</p>
        <div className="modal-datos">
          <div>
            <span className="info-etiqueta">Tiempo</span>
            <span className="info-valor">{formatearTiempo(segundos)}</span>
          </div>
          <div>
            <span className="info-etiqueta">Errores</span>
            <span className="info-valor">{errores}</span>
          </div>
        </div>
        <button type="button" className="boton-principal" onClick={onNuevoJuego}>
          Jugar de nuevo
        </button>
      </div>
    </div>
  );
}
