import { formatearTiempo, NOMBRES_DIFICULTAD } from "../../utils/sudoku.js";
import { IconoPausa, IconoPlay } from "../Iconos/Iconos.jsx";
import "./BarraInfo.css";

export default function BarraInfo({
  dificultad,
  errores,
  segundos,
  pausado,
  deshabilitado,
  onAlternarPausa,
}) {
  return (
    <section className="barra-info">
      <div className="info-bloque">
        <span className="info-etiqueta">Dificultad</span>
        <span className="info-valor">{NOMBRES_DIFICULTAD[dificultad]}</span>
      </div>

      <div className="info-bloque info-bloque-centro">
        <span className="info-etiqueta">Errores</span>
        <span className="info-valor">{errores}</span>
      </div>

      <div className="info-bloque info-bloque-derecha">
        <div className="info-tiempo-grupo">
          <span className="info-etiqueta">Tiempo</span>
          <span className="info-valor info-valor-mono">{formatearTiempo(segundos)}</span>
        </div>
        <button
          type="button"
          className={`btn-pausa${pausado ? " en-pausa" : ""}`}
          title={pausado ? "Reanudar juego" : "Pausar juego"}
          disabled={deshabilitado}
          onClick={onAlternarPausa}
        >
          {pausado ? <IconoPlay /> : <IconoPausa />}
        </button>
      </div>
    </section>
  );
}
