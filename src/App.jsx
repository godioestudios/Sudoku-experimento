import { useSudoku } from "./hooks/useSudoku.js";
import Cabecera from "./components/Cabecera/Cabecera.jsx";
import BarraInfo from "./components/BarraInfo/BarraInfo.jsx";
import Tablero from "./components/Tablero/Tablero.jsx";
import Teclado from "./components/Teclado/Teclado.jsx";
import Acciones from "./components/Acciones/Acciones.jsx";
import ModalVictoria from "./components/ModalVictoria/ModalVictoria.jsx";
import "./App.css";

const App = () => {
  const juego = useSudoku();

  return (
    <>
      <Cabecera
        dificultad={juego.dificultad}
        onCambiarDificultad={juego.cambiarDificultad}
      />

      <main className="juego">
        <BarraInfo
          dificultad={juego.dificultad}
          errores={juego.errores}
          segundos={juego.segundos}
          pausado={juego.pausado}
          deshabilitado={juego.generando || juego.victoria}
          onAlternarPausa={juego.alternarPausa}
        />

        {juego.listo ? (
          <Tablero
            tableroJuego={juego.tableroJuego}
            tableroSolucion={juego.tableroSolucion}
            celdasFijas={juego.celdasFijas}
            notas={juego.notas}
            seleccion={juego.seleccion}
            pausado={juego.pausado}
            onSeleccionarCelda={juego.seleccionarCelda}
            onReanudar={juego.reanudar}
          />
        ) : (
          <div className="tablero-cargando">Generando puzzle...</div>
        )}

        <Teclado
          conteoDigitos={juego.conteoDigitos}
          deshabilitado={juego.generando}
          onColocarNumero={juego.colocarNumero}
        />

        <Acciones
          modoNotas={juego.modoNotas}
          deshacerDisponible={juego.deshacerDisponible}
          deshabilitado={juego.generando}
          onDeshacer={juego.deshacer}
          onBorrar={juego.borrarCelda}
          onAlternarNotas={juego.alternarNotas}
          onPista={juego.darPista}
          onNuevo={() => juego.nuevoJuego()}
        />

        <p className={`estado${juego.victoria ? " victoria" : ""}`}>{juego.estado}</p>
      </main>

      <ModalVictoria
        visible={juego.victoria}
        segundos={juego.segundos}
        errores={juego.errores}
        onNuevoJuego={() => juego.nuevoJuego()}
      />
    </>
  );
};

export default App;
