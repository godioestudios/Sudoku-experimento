import { NOMBRES_DIFICULTAD } from "../../utils/sudoku.js";
import { IconoLuna, IconoSol } from "../Iconos/Iconos.jsx";
import "./Cabecera.css";

const NIVELES = ["facil", "medio", "dificil", "experto"];

export default function Cabecera({
  dificultad,
  onCambiarDificultad,
  deshabilitado = false,
  tema,
  onAlternarTema,
}) {
  const oscuro = tema === "oscuro";

  return (
    <header className="cabecera">
      <div className="cabecera-contenido">
        <div className="logo">
          <span className="logo-icono">S</span>
          <span className="logo-texto">
            Sudoku <span className="logo-badge">Pro</span>
          </span>
        </div>

        <div className="cabecera-acciones">
          <nav className="dificultades" aria-label="Nivel de dificultad">
            {NIVELES.map((nivel) => (
              <button
                key={nivel}
                type="button"
                className={nivel === dificultad ? "activo" : ""}
                disabled={deshabilitado}
                onClick={() => onCambiarDificultad(nivel)}
              >
                {NOMBRES_DIFICULTAD[nivel]}
              </button>
            ))}
          </nav>

          <button
            type="button"
            className="btn-tema"
            onClick={onAlternarTema}
            aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            title={oscuro ? "Tema claro" : "Tema oscuro"}
          >
            {oscuro ? <IconoSol /> : <IconoLuna />}
          </button>
        </div>
      </div>
    </header>
  );
}
