import { NOMBRES_DIFICULTAD } from "../../utils/sudoku.js";
import "./Cabecera.css";

const NIVELES = ["facil", "medio", "dificil", "experto"];

export default function Cabecera({ dificultad, onCambiarDificultad }) {
  return (
    <header className="cabecera">
      <div className="cabecera-contenido">
        <div className="logo">
          <span className="logo-icono">S</span>
          <span className="logo-texto">
            Sudoku <span className="logo-badge">Pro</span>
          </span>
        </div>

        <nav className="dificultades" aria-label="Nivel de dificultad">
          {NIVELES.map((nivel) => (
            <button
              key={nivel}
              type="button"
              className={nivel === dificultad ? "activo" : ""}
              onClick={() => onCambiarDificultad(nivel)}
            >
              {NOMBRES_DIFICULTAD[nivel]}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
