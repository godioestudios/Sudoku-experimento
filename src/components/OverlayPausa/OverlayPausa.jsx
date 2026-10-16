import { IconoPausa, IconoPlay } from "../Iconos/Iconos.jsx";
import "./OverlayPausa.css";

export default function OverlayPausa({ visible, onReanudar }) {
  if (!visible) return null;

  return (
    <div className="overlay-pausa">
      <div className="overlay-icono">
        <IconoPausa />
      </div>
      <h2 className="overlay-titulo">Juego en Pausa</h2>
      <p className="overlay-texto">Tómate un respiro. Tu tablero y tiempo están a salvo.</p>
      <button type="button" className="btn-reanudar" onClick={onReanudar}>
        <IconoPlay />
        Reanudar partida
      </button>
    </div>
  );
}
