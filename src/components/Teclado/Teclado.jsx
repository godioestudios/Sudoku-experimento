import { VALORES } from "../../utils/sudoku.js";
import "./Teclado.css";

export default function Teclado({ conteoDigitos, deshabilitado, onColocarNumero }) {
  return (
    <div className="teclado">
      {VALORES.map((numero) => {
        const restantes = 9 - conteoDigitos[numero];
        const completa = restantes === 0;
        return (
          <button
            key={numero}
            type="button"
            className={`tecla${completa ? " completa" : ""}`}
            disabled={deshabilitado}
            onClick={() => onColocarNumero(numero)}
          >
            <span className="tecla-numero">{numero}</span>
            <span className="tecla-restante">{completa ? "" : restantes}</span>
          </button>
        );
      })}
    </div>
  );
}
