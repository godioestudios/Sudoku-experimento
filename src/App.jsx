import { useSudoku } from "./hooks/useSudoku.js";
import { useTema } from "./hooks/useTema.js";
import Cabecera from "./components/Cabecera/Cabecera.jsx";
import BarraInfo from "./components/BarraInfo/BarraInfo.jsx";
import Tablero from "./components/Tablero/Tablero.jsx";
import Teclado from "./components/Teclado/Teclado.jsx";
import Acciones from "./components/Acciones/Acciones.jsx";
import ModalVictoria from "./components/ModalVictoria/ModalVictoria.jsx";
import ModalConfirmacion from "./components/ModalConfirmacion/ModalConfirmacion.jsx";
import "./App.css";

const App = () => {
  const juego = useSudoku();
  const { tema, alternarTema } = useTema();

  return (
    <>
      <Cabecera
        dificultad={juego.dificultad}
        onCambiarDificultad={juego.cambiarDificultad}
        deshabilitado={juego.generando}
        tema={tema}
        onAlternarTema={alternarTema}
      />

      <main className="juego">
        <BarraInfo
          dificultad={juego.dificultad}
          etiquetaDificultad={juego.etiquetaDificultad}
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
          <div className="tablero-cargando">
            {juego.generando ? "Generando puzzle..." : juego.estado}
          </div>
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
          pistasRestantes={juego.pistasRestantes}
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

      <ModalConfirmacion
        visible={juego.confirmacionPendiente !== null}
        onConfirmar={juego.confirmarNuevoJuego}
        onCancelar={juego.cancelarNuevoJuego}
      />
    </>
  );
};

export default App;
