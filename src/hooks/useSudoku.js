import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TAMAÑO, copiarNotas, copiarTablero } from "../utils/sudoku.js";

const HISTORIAL_MAX = 200;

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
    estado: "Selecciona una casilla y coloca un número.",
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
export function useSudoku() {
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

  const trabajadorRef = useRef(null);
  const solicitudRef = useRef(0);
  const montadoRef = useRef(true);
  const partidaRef = useRef(partida);

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
  }, []);

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

  // ----------------------------------------------------------
  // CRONÓMETRO
  // ----------------------------------------------------------
  useEffect(() => {
    if (!activa || bloqueado) return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [activa, bloqueado]);

  // ----------------------------------------------------------
  // HISTORIAL
  // ----------------------------------------------------------
  const guardarHistorial = useCallback(() => {
    setHistorial((previo) => {
      const siguiente = [
        ...previo,
        { tablero: copiarTablero(tableroJuego), notas: copiarNotas(notas), errores },
      ];
      if (siguiente.length > HISTORIAL_MAX) siguiente.shift();
      return siguiente;
    });
  }, [tableroJuego, notas, errores]);

  // ----------------------------------------------------------
  // NUEVA PARTIDA
  // ----------------------------------------------------------
  const nuevoJuego = useCallback(
    (nivel = dificultad) => iniciarGeneracion(nivel),
    [dificultad, iniciarGeneracion]
  );

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

    let destino = seleccion;

    // Si la casilla seleccionada ya está resuelta, buscamos otra
    if (
      destino &&
      tableroJuego[destino.fila][destino.columna] === tableroSolucion[destino.fila][destino.columna]
    ) {
      destino = null;
    }

    // Si no hay destino válido, elegimos una casilla vacía al azar
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
    setSeleccion(destino);
    setPartida((previo) => {
      const nuevoTablero = copiarTablero(previo.tableroJuego);
      nuevoTablero[fila][columna] = tableroSolucion[fila][columna];
      const nuevasNotas = copiarNotas(previo.notas);
      nuevasNotas[fila][columna].clear();
      return { ...previo, tableroJuego: nuevoTablero, notas: nuevasNotas };
    });
  }, [bloqueado, seleccion, tableroJuego, tableroSolucion, guardarHistorial]);

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
  const cambiarDificultad = useCallback(
    (nivel) => {
      setDificultad(nivel);
      nuevoJuego(nivel);
    },
    [nuevoJuego]
  );

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
    deshacerDisponible: historial.length > 0,
    listo: partida !== null && !generando,
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
  };
}
