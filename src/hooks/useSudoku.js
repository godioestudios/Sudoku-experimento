import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NOMBRES_DIFICULTAD,
  TAMAÑO,
  copiarNotas,
  copiarTablero,
} from "../utils/sudoku.js";

const HISTORIAL_MAX = 200;

// Los modales se renderizan con aria-modal; su presencia real es la fuente de
// verdad, incluso con varios abiertos o al cerrarse uno de ellos.
const SELECTOR_MODAL = '[aria-modal="true"]';

// Reloj monotónico: no lo afectan los ajustes del reloj del sistema.
// Fallback para entornos antiguos sin performance.now.
const ahora = () =>
  typeof performance !== "undefined" && typeof performance.now === "function"
    ? performance.now()
    : Date.now();

// Regla de producto: 3 pistas por partida, reiniciables al generar una nueva.
// Se puede ajustar por partida con useSudoku({ pistasMaximas }).
export const PISTAS_MAXIMAS = 3;

function notaDificultadLogica(dificultadLogica) {
  if (!dificultadLogica) return "";

  const etiquetaObjetivo = NOMBRES_DIFICULTAD[dificultadLogica.solicitada];
  if (!etiquetaObjetivo) return "";
  if (
    dificultadLogica.alcanzada &&
    dificultadLogica.etiqueta === etiquetaObjetivo
  ) {
    return "";
  }

  const presupuesto =
    dificultadLogica.motivo === "presupuesto"
      ? " Se agotó el presupuesto de generación."
      : "";

  if (dificultadLogica.etiqueta === etiquetaObjetivo) {
    return ` Objetivo de dificultad no alcanzado: ${dificultadLogica.vacias} de ${dificultadLogica.vaciasObjetivo} casillas vacías.${presupuesto}`;
  }

  return ` Dificultad ${etiquetaObjetivo} no garantizada: el puzzle generado es ${dificultadLogica.etiqueta}.${presupuesto}`;
}

/**
 * Traduce la respuesta de una generación a un estado coherente.
 * Devuelve null si la respuesta pertenece a una generación obsoleta.
 */
export function resolverGeneracion({ id, idVigente, partidaAnterior, respuesta }) {
  if (id !== idVigente) return null;

  const error = respuesta?.error
    ? String(respuesta.error)
    : respuesta?.partida
      ? null
      : "La generación no devolvió una partida válida.";

  if (error) {
    return {
      partida: partidaAnterior,
      error,
      generando: false,
      activa: true,
      estado: `No se pudo generar el puzzle: ${error}`,
    };
  }

  return {
    partida: respuesta.partida,
    error: null,
    generando: false,
    activa: true,
    estado: `Selecciona una casilla y coloca un número.${notaDificultadLogica(
      respuesta.partida.dificultadLogica
    )}`,
  };
}

/**
 * Cuenta, para cada dígito, cuántas apariciones coinciden con la solución.
 * Las celdas vacías y las colocaciones incorrectas no cuentan.
 */
export function contarDigitosCorrectos(tableroJuego, tableroSolucion) {
  const conteo = Array(10).fill(0);
  if (!tableroJuego || !tableroSolucion) return conteo;
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      const valor = tableroJuego[fila][columna];
      if (valor !== 0 && valor === tableroSolucion[fila][columna]) conteo[valor]++;
    }
  }
  return conteo;
}

/**
 * Concentra todo el estado y la lógica de una partida de Sudoku.
 */
export function useSudoku({ pistasMaximas = PISTAS_MAXIMAS } = {}) {
  const [dificultad, setDificultad] = useState("medio");
  const [partida, setPartida] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [modoNotas, setModoNotas] = useState(false);
  const [errores, setErrores] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [activa, setActiva] = useState(false);
  const [generando, setGenerando] = useState(true);
  const [estado, setEstado] = useState("Generando puzzle...");
  const [confirmacionPendiente, setConfirmacionPendiente] = useState(null);
  const [pistasRestantes, setPistasRestantes] = useState(pistasMaximas);

  const trabajadorRef = useRef(null);
  const solicitudRef = useRef(0);
  const montadoRef = useRef(true);
  const partidaRef = useRef(partida);
  const confirmacionRef = useRef(null);
  // Tiempo ya acumulado (ms) y arranque del tramo en curso (null si está detenido).
  const relojRef = useRef({ acumuladoMs: 0, inicioMs: null });

  const { tableroSolucion, tableroJuego, celdasFijas, notas } = partida ?? {};

  useEffect(() => {
    partidaRef.current = partida;
  }, [partida]);

  // ----------------------------------------------------------
  // GENERACIÓN EN SEGUNDO PLANO
  // ----------------------------------------------------------
  const finalizarGeneracion = useCallback((id, respuesta) => {
    if (!montadoRef.current || id !== solicitudRef.current) return;

    try {
      const resultado = resolverGeneracion({
        id,
        idVigente: solicitudRef.current,
        partidaAnterior: partidaRef.current,
        respuesta,
      });
      if (!resultado) return;

      setPartida(resultado.partida);
      setEstado(resultado.estado);

      if (resultado.error) {
        console.error(`Error al generar la partida: ${resultado.error}`);
        return;
      }

      setHistorial([]);
      setSeleccion(null);
      setErrores(0);
      setModoNotas(false);
      setPistasRestantes(pistasMaximas);
    } catch (error) {
      console.error("Error al generar la partida:", error);
      setPartida(partidaRef.current);
      setEstado(`No se pudo generar el puzzle: ${error.message}`);
    } finally {
      if (montadoRef.current && id === solicitudRef.current) {
        setGenerando(false);
        setActiva(true);
      }
    }
  }, [pistasMaximas]);

  const lanzarTrabajador = useCallback(
    (nivel) => {
      if (!montadoRef.current) return;

      solicitudRef.current += 1;
      const id = solicitudRef.current;

      trabajadorRef.current?.terminate();
      trabajadorRef.current = null;

      let trabajador = null;
      try {
        trabajador = new Worker(
          new URL("../utils/generador.worker.js", import.meta.url),
          { type: "module" }
        );
        trabajadorRef.current = trabajador;

        trabajador.addEventListener("message", (evento) => {
          trabajador.terminate();
          if (trabajadorRef.current === trabajador) trabajadorRef.current = null;

          finalizarGeneracion(id, evento.data);
        });

        trabajador.addEventListener("error", (evento) => {
          trabajador.terminate();
          if (trabajadorRef.current === trabajador) trabajadorRef.current = null;

          finalizarGeneracion(id, {
            error: evento.message || "El trabajador de generación falló.",
          });
        });

        trabajador.postMessage({ id, nivel });
      } catch (error) {
        trabajador?.terminate();
        if (trabajadorRef.current === trabajador) trabajadorRef.current = null;

        finalizarGeneracion(id, { error: error.message });
      }
    },
    [finalizarGeneracion]
  );

  const iniciarGeneracion = useCallback(
    (nivel) => {
      if (!montadoRef.current) return;

      setGenerando(true);
      setPausado(false);
      relojRef.current = { acumuladoMs: 0, inicioMs: null };
      setSegundos(0);
      setEstado("Generando puzzle...");
      setActiva(false);
      lanzarTrabajador(nivel);
    },
    [lanzarTrabajador]
  );

  useEffect(() => {
    montadoRef.current = true;
    lanzarTrabajador("medio");
    return () => {
      montadoRef.current = false;
      solicitudRef.current += 1;
      trabajadorRef.current?.terminate();
      trabajadorRef.current = null;
    };
  }, [lanzarTrabajador]);

  // ----------------------------------------------------------
  // VICTORIA (derivada del tablero, sin efectos)
  // ----------------------------------------------------------
  const victoria = useMemo(() => {
    if (!tableroJuego || !tableroSolucion) return false;
    for (let fila = 0; fila < TAMAÑO; fila++) {
      for (let columna = 0; columna < TAMAÑO; columna++) {
        if (tableroJuego[fila][columna] !== tableroSolucion[fila][columna]) return false;
      }
    }
    return true;
  }, [tableroJuego, tableroSolucion]);

  const bloqueado = pausado || victoria || generando;

  // Hay progreso que proteger cuando el jugador ya modificó una partida sin resolver.
  const hayProgreso = Boolean(
    partida && !victoria && (historial.length > 0 || errores > 0)
  );

  // ----------------------------------------------------------
  // CRONÓMETRO
  // ----------------------------------------------------------
  // Fuente de tiempo: performance.now(), un reloj monotónico. No lo afectan los
  // cambios del reloj del sistema y sigue avanzando cuando el navegador limita
  // los timers en segundo plano, por lo que el intervalo solo refresca la vista.
  // Limitación: según navegador y sistema operativo, el tiempo con el dispositivo
  // suspendido puede contarse o no; no hay forma confiable de distinguir la
  // suspensión de una pestaña inactiva. Cada tramo guarda su instante de arranque
  // y su cleanup acumula una sola vez, sin duplicar intervalos ni tiempos.
  useEffect(() => {
    if (!activa || bloqueado) return;

    const reloj = relojRef.current;
    if (reloj.inicioMs === null) reloj.inicioMs = ahora();

    const actualizar = () => {
      const transcurrido =
        reloj.acumuladoMs +
        (reloj.inicioMs === null ? 0 : ahora() - reloj.inicioMs);
      setSegundos(Math.floor(transcurrido / 1000));
    };

    actualizar();
    const id = setInterval(actualizar, 1000);

    return () => {
      clearInterval(id);
      if (reloj.inicioMs !== null) {
        reloj.acumuladoMs += ahora() - reloj.inicioMs;
        reloj.inicioMs = null;
      }
    };
  }, [activa, bloqueado]);

  // ----------------------------------------------------------
  // HISTORIAL
  // ----------------------------------------------------------
  const guardarHistorial = useCallback(() => {
    setHistorial((previo) => {
      const siguiente = [
        ...previo,
        {
          tablero: copiarTablero(tableroJuego),
          notas: copiarNotas(notas),
          errores,
        },
      ];
      if (siguiente.length > HISTORIAL_MAX) siguiente.shift();
      return siguiente;
    });
  }, [tableroJuego, notas, errores]);

  // ----------------------------------------------------------
  // NUEVA PARTIDA
  // ----------------------------------------------------------
  const nuevoJuego = useCallback(
    (nivel = dificultad) => {
      // Durante una generación, la política existente cancela el trabajo en curso.
      if (generando || !hayProgreso) {
        setDificultad(nivel);
        iniciarGeneracion(nivel);
        return;
      }

      confirmacionRef.current = { nivel };
      setConfirmacionPendiente({ nivel });
    },
    [dificultad, generando, hayProgreso, iniciarGeneracion]
  );

  const confirmarNuevoJuego = useCallback(() => {
    const pendiente = confirmacionRef.current;
    if (!pendiente) return;

    confirmacionRef.current = null;
    setConfirmacionPendiente(null);
    setDificultad(pendiente.nivel);
    iniciarGeneracion(pendiente.nivel);
  }, [iniciarGeneracion]);

  const cancelarNuevoJuego = useCallback(() => {
    confirmacionRef.current = null;
    setConfirmacionPendiente(null);
  }, []);

  // ----------------------------------------------------------
  // ACCIONES DEL JUGADOR
  // ----------------------------------------------------------
  const seleccionarCelda = useCallback(
    (fila, columna) => {
      if (bloqueado) return;
      setSeleccion((previa) => {
        if (previa && previa.fila === fila && previa.columna === columna) return null;
        return { fila, columna };
      });
    },
    [bloqueado]
  );

  const colocarNumero = useCallback(
    (numero) => {
      if (bloqueado || !seleccion) return;

      const { fila, columna } = seleccion;
      if (celdasFijas[fila][columna]) return; // Las casillas iniciales no se tocan

      if (modoNotas) {
        // En modo apuntes solo trabajamos sobre casillas vacías
        if (tableroJuego[fila][columna] !== 0) return;

        guardarHistorial();
        setPartida((previo) => {
          const nuevasNotas = copiarNotas(previo.notas);
          const candidatos = nuevasNotas[fila][columna];
          if (candidatos.has(numero)) candidatos.delete(numero);
          else candidatos.add(numero);
          return { ...previo, notas: nuevasNotas };
        });
      } else {
        // Si el valor no cambia realmente, evitamos guardar historial y contar errores
        if (tableroJuego[fila][columna] === numero) return;

        guardarHistorial();
        setPartida((previo) => {
          const nuevoTablero = copiarTablero(previo.tableroJuego);
          nuevoTablero[fila][columna] = numero;
          const nuevasNotas = copiarNotas(previo.notas);
          nuevasNotas[fila][columna].clear();

          if (numero !== 0) {
            const limpiar = (f, c) => {
              if (!previo.celdasFijas[f][c]) nuevasNotas[f][c].delete(numero);
            };
            for (let i = 0; i < TAMAÑO; i++) {
              limpiar(fila, i);
              limpiar(i, columna);
            }
            const cajaFila = Math.floor(fila / 3) * 3;
            const cajaColumna = Math.floor(columna / 3) * 3;
            for (let f = cajaFila; f < cajaFila + 3; f++) {
              for (let c = cajaColumna; c < cajaColumna + 3; c++) {
                limpiar(f, c);
              }
            }
          }

          return { ...previo, tableroJuego: nuevoTablero, notas: nuevasNotas };
        });

        // Contamos un error si el número no coincide con la solución
        if (numero !== 0 && numero !== tableroSolucion[fila][columna]) {
          setErrores((e) => e + 1);
        }
      }
    },
    [bloqueado, seleccion, celdasFijas, guardarHistorial, modoNotas, tableroJuego, tableroSolucion]
  );

  const borrarCelda = useCallback(() => {
    if (bloqueado || !seleccion) return;

    const { fila, columna } = seleccion;
    if (celdasFijas[fila][columna]) return;
    if (tableroJuego[fila][columna] === 0 && notas[fila][columna].size === 0) return;

    guardarHistorial();
    setPartida((previo) => {
      const nuevoTablero = copiarTablero(previo.tableroJuego);
      nuevoTablero[fila][columna] = 0;
      const nuevasNotas = copiarNotas(previo.notas);
      nuevasNotas[fila][columna].clear();
      return { ...previo, tableroJuego: nuevoTablero, notas: nuevasNotas };
    });
  }, [bloqueado, seleccion, celdasFijas, tableroJuego, notas, guardarHistorial]);

  const darPista = useCallback(() => {
    if (bloqueado) return;

    if (pistasRestantes <= 0) {
      setEstado("No quedan pistas disponibles. Iniciá una partida nueva para obtener más.");
      return;
    }

    let destino = null;

    if (seleccion) {
      const { fila, columna } = seleccion;
      const valor = tableroJuego[fila][columna];

      // No pisamos un valor del jugador: si es incorrecto, primero debe borrarlo.
      if (valor !== 0 && valor !== tableroSolucion[fila][columna]) {
        setEstado(
          "Esa casilla tiene un número incorrecto. Borralo o elegí una casilla vacía para pedir una pista."
        );
        return;
      }

      if (!celdasFijas[fila][columna] && valor === 0) destino = seleccion;
    }

    // Si la casilla seleccionada ya está resuelta, elegimos una vacía al azar.
    if (!destino) {
      const vacias = [];
      for (let f = 0; f < TAMAÑO; f++) {
        for (let c = 0; c < TAMAÑO; c++) {
          if (tableroJuego[f][c] === 0) vacias.push([f, c]);
        }
      }
      if (vacias.length === 0) {
        setEstado(
          "No quedan casillas vacías para revelar. Revisá los números incorrectos del tablero."
        );
        return;
      }
      const [f, c] = vacias[Math.floor(Math.random() * vacias.length)];
      destino = { fila: f, columna: c };
    }

    const { fila, columna } = destino;
    guardarHistorial();
    setPistasRestantes((restantes) => restantes - 1);
    setSeleccion(destino);
    setPartida((previo) => {
      const nuevoTablero = copiarTablero(previo.tableroJuego);
      nuevoTablero[fila][columna] = tableroSolucion[fila][columna];
      const nuevasNotas = copiarNotas(previo.notas);
      nuevasNotas[fila][columna].clear();
      return { ...previo, tableroJuego: nuevoTablero, notas: nuevasNotas };
    });
  }, [
    bloqueado,
    pistasRestantes,
    seleccion,
    tableroJuego,
    tableroSolucion,
    celdasFijas,
    guardarHistorial,
  ]);

  const deshacer = useCallback(() => {
    if (bloqueado || historial.length === 0) return;

    const estadoPrevio = historial[historial.length - 1];
    setPartida((previo) => ({
      ...previo,
      tableroJuego: estadoPrevio.tablero,
      notas: estadoPrevio.notas,
    }));
    setErrores(estadoPrevio.errores);
    setHistorial((previo) => previo.slice(0, -1));
  }, [bloqueado, historial]);

  const alternarNotas = useCallback(() => {
    setModoNotas((previo) => {
      const siguiente = !previo;
      setEstado(
        siguiente
          ? "Modo apuntes activado: los números se añaden como candidatos."
          : "Modo apuntes desactivado."
      );
      return siguiente;
    });
  }, []);

  // ----------------------------------------------------------
  // PAUSA
  // ----------------------------------------------------------
  const reanudar = useCallback(() => setPausado(false), []);
  const pausar = useCallback(() => setPausado(true), []);
  const alternarPausa = useCallback(() => setPausado((previo) => !previo), []);

  // ----------------------------------------------------------
  // DIFICULTAD
  // ----------------------------------------------------------
  const cambiarDificultad = useCallback((nivel) => nuevoJuego(nivel), [nuevoJuego]);

  // ----------------------------------------------------------
  // TECLADO FÍSICO
  // ----------------------------------------------------------
  useEffect(() => {
    function manejarTeclado(evento) {
      // No pisamos atajos del navegador/sistema ni la escritura en controles editables
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

      const objetivo = evento.target;
      if (
        objetivo?.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(objetivo?.tagName ?? "")
      ) {
        return;
      }

      if (!activa) return;

      // Con un diálogo modal abierto, el tablero no responde a atajos.
      // Escape y Tab los maneja useDialogoModal en fase de captura.
      if (document.querySelector(SELECTOR_MODAL)) return;

      // Con la partida en pausa, la tecla P reanuda y nada más se procesa
      if (pausado) {
        if (evento.key.toLowerCase() === "p") reanudar();
        return;
      }
      if (victoria) return;

      if (evento.key.toLowerCase() === "p") {
        pausar();
        return;
      }

      // Flechas: mover la selección
      if (evento.key.startsWith("Arrow")) {
        evento.preventDefault();
        const actual = seleccion ?? { fila: 0, columna: 0 };
        const { fila, columna } = actual;
        if (evento.key === "ArrowUp") setSeleccion({ fila: Math.max(0, fila - 1), columna });
        if (evento.key === "ArrowDown") setSeleccion({ fila: Math.min(8, fila + 1), columna });
        if (evento.key === "ArrowLeft") setSeleccion({ fila, columna: Math.max(0, columna - 1) });
        if (evento.key === "ArrowRight") setSeleccion({ fila, columna: Math.min(8, columna + 1) });
        return;
      }

      if (/^[1-9]$/.test(evento.key)) return colocarNumero(Number(evento.key));

      if (evento.key === "Backspace" || evento.key === "Delete") {
        evento.preventDefault();
        return borrarCelda();
      }

      if (evento.key === "Escape") {
        setSeleccion(null);
        return;
      }

      // Atajos: N apuntes, H pista, Z deshacer
      if (evento.key.toLowerCase() === "n") alternarNotas();
      if (evento.key.toLowerCase() === "h") darPista();
      if (evento.key.toLowerCase() === "z") deshacer();
    }

    document.addEventListener("keydown", manejarTeclado);
    return () => document.removeEventListener("keydown", manejarTeclado);
  }, [
    activa,
    pausado,
    victoria,
    seleccion,
    reanudar,
    pausar,
    colocarNumero,
    borrarCelda,
    darPista,
    deshacer,
    alternarNotas,
  ]);

  // ----------------------------------------------------------
  // CONTADORES DEL TECLADO
  // ----------------------------------------------------------
  const conteoDigitos = useMemo(
    () => contarDigitosCorrectos(tableroJuego, tableroSolucion),
    [tableroJuego, tableroSolucion]
  );

  return {
    // Datos
    dificultad,
    etiquetaDificultad:
      partida?.dificultadLogica?.etiqueta ?? NOMBRES_DIFICULTAD[dificultad],
    dificultadLogica: partida?.dificultadLogica ?? null,
    tableroSolucion,
    tableroJuego,
    celdasFijas,
    notas,
    seleccion,
    modoNotas,
    errores,
    segundos,
    pausado,
    generando,
    victoria,
    estado: victoria ? "¡Sudoku completado!" : estado,
    conteoDigitos,
    pistasRestantes,
    deshacerDisponible: historial.length > 0,
    listo: partida !== null && !generando,
    confirmacionPendiente,
    // Acciones
    seleccionarCelda,
    colocarNumero,
    borrarCelda,
    darPista,
    deshacer,
    alternarNotas,
    pausar,
    reanudar,
    alternarPausa,
    cambiarDificultad,
    nuevoJuego,
    confirmarNuevoJuego,
    cancelarNuevoJuego,
  };
}
