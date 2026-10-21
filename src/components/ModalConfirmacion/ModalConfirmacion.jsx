import { useId } from "react";
import { useDialogoModal } from "../../hooks/useDialogoModal.js";
import "../ModalVictoria/ModalVictoria.css";
import "./ModalConfirmacion.css";

export default function ModalConfirmacion({ visible, onConfirmar, onCancelar }) {
  const idTitulo = useId();
  const idTexto = useId();
  const dialogoRef = useDialogoModal({ visible, onEscape: onCancelar });

  if (!visible) return null;

  return (
    <div className="modal">
      <div
        ref={dialogoRef}
        className="modal-tarjeta"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idTexto}
        tabIndex={-1}
      >
        <h2 className="modal-titulo" id={idTitulo}>
          ¿Descartar la partida?
        </h2>
        <p className="modal-texto" id={idTexto}>
          Vas a perder el progreso de la partida actual. ¿Querés empezar una nueva?
        </p>
        <div className="modal-acciones">
          <button type="button" className="boton-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="boton-principal" onClick={onConfirmar}>
            Sí, nueva partida
          </button>
        </div>
      </div>
    </div>
  );
}
