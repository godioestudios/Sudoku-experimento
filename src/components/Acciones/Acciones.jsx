import {
  IconoApuntes,
  IconoBorrar,
  IconoDeshacer,
  IconoNuevo,
  IconoPista,
} from "../Iconos/Iconos.jsx";
import "./Acciones.css";

export default function Acciones({
  modoNotas,
  deshacerDisponible,
  deshabilitado,
  onDeshacer,
  onBorrar,
  onAlternarNotas,
  onPista,
  onNuevo,
  pistasRestantes,
}) {
  return (
    <div className="acciones">
      <button
        type="button"
        className="accion"
        disabled={deshabilitado || !deshacerDisponible}
        onClick={onDeshacer}
      >
        <IconoDeshacer />
        <span className="accion-texto">Deshacer</span>
      </button>

      <button type="button" className="accion" disabled={deshabilitado} onClick={onBorrar}>
        <IconoBorrar />
        <span className="accion-texto">Borrar</span>
      </button>

      <button
        type="button"
        className={`accion${modoNotas ? " activa" : ""}`}
        disabled={deshabilitado}
        onClick={onAlternarNotas}
      >
        <IconoApuntes />
        <span className="accion-texto">Apuntes</span>
      </button>

      <button
        type="button"
        className="accion"
        title={
          pistasRestantes > 0
            ? `Pistas restantes: ${pistasRestantes}`
            : "No quedan pistas disponibles"
        }
        disabled={deshabilitado || pistasRestantes <= 0}
        onClick={onPista}
      >
        <IconoPista />
        <span className="accion-texto">Pista ({pistasRestantes})</span>
      </button>

      <button
        type="button"
        className="accion accion-nueva"
        disabled={deshabilitado}
        onClick={onNuevo}
      >
        <IconoNuevo />
        <span className="accion-texto">Nuevo</span>
      </button>
    </div>
  );
}
