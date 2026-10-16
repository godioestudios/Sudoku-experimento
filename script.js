/**
 * ============================================================
 *  SUDOKU — algoritmo + interfaz de juego
 * ============================================================
 *  Tablero = array 9x9. Cada celda guarda un número del 1 al 9,
 *  o 0 si está vacía.
 * ============================================================
 */

// ------------------------------------------------------------
// CONSTANTES
// ------------------------------------------------------------

const TAMAÑO = 9;
const TAMAÑO_CAJA = 3;
const VALORES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Casillas que se dejan vacías según la dificultad
const DIFICULTADES = {
  facil: 36,
  medio: 45,
  dificil: 52,
  experto: 56,
};

// Nombre visible de cada dificultad
const NOMBRES_DIFICULTAD = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
  experto: "Experto",
};

// ------------------------------------------------------------
// ESTADO DE LA PARTIDA
// ------------------------------------------------------------

let tableroSolucion = null; // Solución completa del puzzle
let tableroJuego = null; // Lo que ve actualmente el jugador
let celdasFijas = null; // true si la casilla es inicial (no editable)
let notas = null; // Apuntes: notas[fila][columna] = Set de candidatos
let seleccion = null; // { fila, columna } seleccionada, o null
let historial = []; // Pila de estados para "Deshacer"
let modoNotas = false; // ¿Está activado el modo apuntes?
let errores = 0; // Contador de números incorrectos colocados
let segundos = 0; // Cronómetro en segundos
let intervalo = null; // setInterval del cronómetro
let partidaActiva = false; // Evita jugar mientras se genera el puzzle
let dificultadActual = "medio";

// Referencias al DOM
let tableroDOM = null;
let tecladoDOM = null;
let estadoDOM = null;
let infoErroresDOM = null;
let infoTiempoDOM = null;
let infoDificultadDOM = null;
let btnDeshacerDOM = null;
let btnNotasDOM = null;
let btnPausaDOM = null;
let overlayPausaDOM = null;
let modalVictoriaDOM = null;
let partidaPausada = false;

// ============================================================
// 1. ALGORITMO — VALIDEZ Y RESOLUCIÓN
// ============================================================

/**
 * Comprueba si es válido colocar un número en una posición.
 * Reglas: no repetir en fila, columna ni caja 3x3.
 */
function esValido(tablero, fila, columna, numero) {
  // Regla 1: no repetir en la fila
  for (let i = 0; i < TAMAÑO; i++) {
    if (tablero[fila][i] === numero) return false;
  }

  // Regla 2: no repetir en la columna
  for (let i = 0; i < TAMAÑO; i++) {
    if (tablero[i][columna] === numero) return false;
  }

  // Regla 3: no repetir en la caja 3x3
  const inicioFila = Math.floor(fila / TAMAÑO_CAJA) * TAMAÑO_CAJA;
  const inicioColumna = Math.floor(columna / TAMAÑO_CAJA) * TAMAÑO_CAJA;
  for (let i = 0; i < TAMAÑO_CAJA; i++) {
    for (let j = 0; j < TAMAÑO_CAJA; j++) {
      if (tablero[inicioFila + i][inicioColumna + j] === numero) return false;
    }
  }

  return true; // Respeta todas las reglas
}

/**
 * Busca la primera casilla vacía (0), fila por fila.
 * @returns [fila, columna] o null si el tablero está completo.
 */
function buscarCasillaVacia(tablero) {
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] === 0) return [fila, columna];
    }
  }
  return null;
}

/**
 * Resuelve el Sudoku con backtracking (recursión + vuelta atrás).
 */
function resolverSudoku(tablero) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true; // Sin huecos: resuelto

  const [fila, columna] = casilla;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;

      if (resolverSudoku(tablero)) return true; // Seguir por este camino

      tablero[fila][columna] = 0; // Backtrack: deshacer y probar otro
    }
  }

  return false; // Ningún número sirve: retroceder
}

/**
 * Cuenta soluciones del tablero (se detiene al llegar al límite).
 * Sirve para verificar que un puzzle tiene solución única.
 */
function contarSoluciones(tablero, limite = 2) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return 1; // Encontré una solución completa

  const [fila, columna] = casilla;
  let total = 0;

  for (const numero of VALORES) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      total += contarSoluciones(tablero, limite - total);
      tablero[fila][columna] = 0; // Restaurar
      if (total >= limite) return total;
    }
  }

  return total;
}

// ============================================================
// 2. ALGORITMO — GENERACIÓN
// ============================================================

/** Copia profunda de un tablero 9x9. */
function copiarTablero(tablero) {
  return tablero.map((fila) => [...fila]);
}

/** Mezcla aleatoria de un array (algoritmo Fisher-Yates). */
function mezclar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Rellena un tablero vacío por completo usando backtracking,
 * probando los números en orden aleatorio.
 */
function rellenarTablero(tablero) {
  const casilla = buscarCasillaVacia(tablero);
  if (casilla === null) return true;

  const [fila, columna] = casilla;

  for (const numero of mezclar([...VALORES])) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      if (rellenarTablero(tablero)) return true;
      tablero[fila][columna] = 0; // Backtrack
    }
  }
  return false;
}

/** Crea un tablero 9x9 válido y completo. */
function generarTableroResuelto() {
  const tablero = Array.from({ length: TAMAÑO }, () => Array(TAMAÑO).fill(0));
  rellenarTablero(tablero);
  return tablero;
}

/**
 * Vacía casillas del tablero resuelto para crear el puzzle,
 * cuidando que siga teniendo UNA ÚNICA solución.
 */
function crearPuzzle(tableroResuelto, objetivoVacias) {
  const puzzle = copiarTablero(tableroResuelto);

  const posiciones = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      posiciones.push([fila, columna]);
    }
  }
  mezclar(posiciones);

  let vacias = 0;
  for (const [fila, columna] of posiciones) {
    if (vacias >= objetivoVacias) break;

    const guardado = puzzle[fila][columna];
    puzzle[fila][columna] = 0;

    if (contarSoluciones(puzzle, 2) === 1) {
      vacias++; // Solución sigue siendo única: la dejamos vacía
    } else {
      puzzle[fila][columna] = guardado; // Varias soluciones: la restauramos
    }
  }

  return puzzle;
}

// ============================================================
// 3. UTILIDADES DE ESTADO
// ============================================================

/** Crea la matriz de apuntes vacía (9x9 de Sets). */
function crearNotasVacias() {
  return Array.from({ length: TAMAÑO }, () =>
    Array.from({ length: TAMAÑO }, () => new Set())
  );
}

/** Copia profunda de la matriz de apuntes. */
function copiarNotas(origen) {
  return origen.map((fila) => fila.map((set) => new Set(set)));
}

/** Formatea segundos como MM:SS (o H:MM:SS si pasa de una hora). */
function formatearTiempo(total) {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segs = total % 60;
  const dos = (n) => String(n).padStart(2, "0");
  return horas > 0
    ? `${horas}:${dos(minutos)}:${dos(segs)}`
    : `${dos(minutos)}:${dos(segs)}`;
}

// ============================================================
// 4. CRONÓMETRO
// ============================================================

function iniciarCronometro() {
  detenerCronometro();
  if (segundos === 0 && !partidaPausada) {
    infoTiempoDOM.textContent = formatearTiempo(segundos);
  }
  intervalo = setInterval(() => {
    if (partidaPausada) return;
    segundos++;
    infoTiempoDOM.textContent = formatearTiempo(segundos);
  }, 1000);
}

function detenerCronometro() {
  if (intervalo !== null) {
    clearInterval(intervalo);
    intervalo = null;
  }
}

function actualizarBotonPausa() {
  if (!btnPausaDOM) return;
  btnPausaDOM.classList.toggle("en-pausa", partidaPausada);
  btnPausaDOM.querySelector(".icono-pausa").classList.toggle("oculto", partidaPausada);
  btnPausaDOM.querySelector(".icono-play").classList.toggle("oculto", !partidaPausada);
  btnPausaDOM.title = partidaPausada ? "Reanudar juego" : "Pausar juego";
}

function pausarJuego() {
  if (!partidaActiva) return;
  partidaPausada = true;
  detenerCronometro();
  if (overlayPausaDOM) overlayPausaDOM.classList.remove("oculto");
  actualizarBotonPausa();
  pintarTablero();
}

function reanudarJuego() {
  if (!partidaActiva) return;
  partidaPausada = false;
  if (overlayPausaDOM) overlayPausaDOM.classList.add("oculto");
  actualizarBotonPausa();
  iniciarCronometro();
  pintarTablero();
}

// ============================================================
// 5. CONSTRUCCIÓN DE LA INTERFAZ
// ============================================================

/** Crea las 81 celdas del tablero dentro del contenedor. */
function crearTableroDOM() {
  tableroDOM.innerHTML = "";

  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      const celda = document.createElement("button");
      celda.type = "button";
      celda.className = "celda";
      celda.dataset.fila = fila;
      celda.dataset.columna = columna;
      celda.setAttribute("role", "gridcell");

      // Líneas gruesas en los límites de las cajas 3x3
      if (columna === 2 || columna === 5) celda.classList.add("borde-derecha");
      if (fila === 2 || fila === 5) celda.classList.add("borde-abajo");

      celda.addEventListener("click", () => seleccionarCelda(fila, columna));
      tableroDOM.appendChild(celda);
    }
  }
}

/** Crea los 9 botones del teclado numérico, con su contador. */
function crearTecladoDOM() {
  tecladoDOM.innerHTML = "";

  for (const numero of VALORES) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "tecla";
    boton.dataset.numero = numero;
    boton.innerHTML = `
      <span class="tecla-numero">${numero}</span>
      <span class="tecla-restante">9</span>
    `;
    boton.addEventListener("click", () => colocarNumero(numero));
    tecladoDOM.appendChild(boton);
  }
}

// ============================================================
// 6. CONTROL DE CAMBIOS (con historial para "Deshacer")
// ============================================================

/** Guarda una foto del estado actual antes de modificarlo. */
function guardarHistorial() {
  historial.push({
    tablero: copiarTablero(tableroJuego),
    notas: copiarNotas(notas),
    errores: errores,
  });

  // Limitamos el historial para no crecer sin control
  if (historial.length > 200) historial.shift();
  btnDeshacerDOM.disabled = false;
}

/** Deshace el último movimiento guardado. */
function deshacer() {
  if (!partidaActiva || partidaPausada || historial.length === 0) return;

  const estado = historial.pop();
  tableroJuego = estado.tablero;
  notas = estado.notas;
  errores = estado.errores;

  btnDeshacerDOM.disabled = historial.length === 0;
  pintarTablero();
}

// ============================================================
// 7. ACCIONES DEL JUGADOR
// ============================================================

/** Selecciona (o deselecciona) una casilla al hacer clic. */
function seleccionarCelda(fila, columna) {
  if (!partidaActiva || partidaPausada) return;

  if (seleccion && seleccion.fila === fila && seleccion.columna === columna) {
    seleccion = null; // Clic repetido: deseleccionar
  } else {
    seleccion = { fila, columna };
  }

  pintarTablero();
}

/**
 * Coloca un número en la casilla seleccionada.
 * Si el modo apuntes está activo, añade/quita el número como nota.
 */
function colocarNumero(numero) {
  if (!partidaActiva || partidaPausada || seleccion === null) return;

  const { fila, columna } = seleccion;
  if (celdasFijas[fila][columna]) return; // Las casillas iniciales no se tocan

  guardarHistorial();

  if (modoNotas) {
    // En modo apuntes solo trabajamos sobre casillas vacías
    if (tableroJuego[fila][columna] !== 0) {
      historial.pop(); // No hubo cambio real: deshacemos la foto
      btnDeshacerDOM.disabled = historial.length === 0;
      return;
    }

    // Añadir o quitar el candidato de la casilla
    if (notas[fila][columna].has(numero)) {
      notas[fila][columna].delete(numero);
    } else {
      notas[fila][columna].add(numero);
    }
  } else {
    // Modo normal: escribir el número y borrar los apuntes de esa casilla
    tableroJuego[fila][columna] = numero;
    notas[fila][columna].clear();

    // Contamos un error si el número no coincide con la solución
    if (numero !== 0 && numero !== tableroSolucion[fila][columna]) {
      errores++;
    }
  }

  pintarTablero();
  comprobarVictoria();
}

/** Borra el número (y los apuntes) de la casilla seleccionada. */
function borrarCelda() {
  if (!partidaActiva || partidaPausada || seleccion === null) return;

  const { fila, columna } = seleccion;
  if (celdasFijas[fila][columna]) return;

  // Nada que borrar
  if (tableroJuego[fila][columna] === 0 && notas[fila][columna].size === 0) return;

  guardarHistorial();
  tableroJuego[fila][columna] = 0;
  notas[fila][columna].clear();
  pintarTablero();
}

/** Rellena una casilla con su número correcto (pista inteligente). */
function darPista() {
  if (!partidaActiva || partidaPausada) return;

  // Si no hay casilla seleccionada, elegimos una vacía al azar
  if (seleccion === null) {
    const vacias = [];
    for (let f = 0; f < TAMAÑO; f++) {
      for (let c = 0; c < TAMAÑO; c++) {
        if (tableroJuego[f][c] === 0) vacias.push([f, c]);
      }
    }
    if (vacias.length === 0) return;
    const [f, c] = vacias[Math.floor(Math.random() * vacias.length)];
    seleccion = { fila: f, columna: c };
  }

  const { fila, columna } = seleccion;

  // La casilla ya estaba resuelta: buscamos otra
  if (tableroJuego[fila][columna] === tableroSolucion[fila][columna]) {
    seleccion = null;
    return darPista();
  }

  guardarHistorial();
  tableroJuego[fila][columna] = tableroSolucion[fila][columna];
  notas[fila][columna].clear();
  pintarTablero();
  comprobarVictoria();
}

// ============================================================
// 8. PINTAR EL TABLERO Y LOS RESALTADOS
// ============================================================

/** Construye el HTML de la cuadrícula de apuntes de una casilla. */
function construirNotas(fila, columna) {
  let html = '<div class="notas">';
  for (let n = 1; n <= 9; n++) {
    const visible = notas[fila][columna].has(n) ? "" : " oculto";
    html += `<span class="${visible.trim()}">${n}</span>`;
  }
  html += "</div>";
  return html;
}

/**
 * Repinta todo el tablero:
 *  - Escribe números o apuntes.
 *  - Resalta fila/columna/caja, mismo número y errores.
 *  - Actualiza los contadores del teclado.
 */
function pintarTablero() {
  // Valor de la casilla seleccionada (para resaltar el mismo número)
  const valorSeleccionado =
    seleccion ? tableroJuego[seleccion.fila][seleccion.columna] : 0;

  // ¿Pertenece esta casilla a la zona de la seleccionada?
  const estaEnArea = (fila, columna) => {
    if (!seleccion) return false;
    const mismaFila = fila === seleccion.fila;
    const mismaColumna = columna === seleccion.columna;
    const mismaCaja =
      Math.floor(fila / TAMAÑO_CAJA) === Math.floor(seleccion.fila / TAMAÑO_CAJA) &&
      Math.floor(columna / TAMAÑO_CAJA) === Math.floor(seleccion.columna / TAMAÑO_CAJA);
    return mismaFila || mismaColumna || mismaCaja;
  };

  for (const celda of tableroDOM.children) {
    const fila = Number(celda.dataset.fila);
    const columna = Number(celda.dataset.columna);
    const valor = tableroJuego[fila][columna];
    const esFija = celdasFijas[fila][columna];

    if (partidaPausada) {
      celda.innerHTML = "";
      celda.textContent = "";
      celda.classList.remove(
        "fija",
        "jugador",
        "seleccionada",
        "en-area",
        "mismo-numero",
        "error"
      );
      celda.classList.add("pausado");
      continue;
    }

    celda.classList.remove("pausado");

    // --- Contenido (número, apuntes o nada) ---
    if (valor !== 0) {
      celda.textContent = valor;
    } else if (notas[fila][columna].size > 0) {
      celda.innerHTML = construirNotas(fila, columna);
    } else {
      celda.textContent = "";
    }

    // --- Clases de estado (limpiamos y volvemos a aplicar) ---
    celda.classList.remove(
      "fija",
      "jugador",
      "seleccionada",
      "en-area",
      "mismo-numero",
      "error"
    );

    celda.classList.add(esFija ? "fija" : "jugador");

    if (seleccion && fila === seleccion.fila && columna === seleccion.columna) {
      celda.classList.add("seleccionada");
    }

    if (estaEnArea(fila, columna)) celda.classList.add("en-area");

    if (valorSeleccionado !== 0 && valor === valorSeleccionado) {
      celda.classList.add("mismo-numero");
    }

    // Error: casilla del jugador con un número distinto al de la solución
    if (!esFija && valor !== 0 && valor !== tableroSolucion[fila][columna]) {
      celda.classList.add("error");
    }
  }

  // Actualizamos contadores y el marcador de errores
  actualizarTeclado();
  infoErroresDOM.textContent = errores;
}

/** Actualiza cuántas veces falta cada número y apaga los completos. */
function actualizarTeclado() {
  // Contamos cuántas veces aparece cada dígito en el tablero
  const conteo = Array(10).fill(0);
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      const valor = tableroJuego[fila][columna];
      if (valor !== 0) conteo[valor]++;
    }
  }

  for (const boton of tecladoDOM.children) {
    const numero = Number(boton.dataset.numero);
    const restantes = 9 - conteo[numero];
    boton.querySelector(".tecla-restante").textContent = restantes === 0 ? "" : restantes;
    boton.classList.toggle("completa", restantes === 0);
  }
}

// ============================================================
// 9. FIN DE PARTIDA
// ============================================================

/** Comprueba si el jugador completó bien el tablero. */
function comprobarVictoria() {
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tableroJuego[fila][columna] !== tableroSolucion[fila][columna]) return;
    }
  }

  // ¡Resuelto!
  partidaActiva = false;
  seleccion = null;
  detenerCronometro();
  if (btnPausaDOM) btnPausaDOM.disabled = true;
  estadoDOM.textContent = "¡Sudoku completado!";
  estadoDOM.classList.add("victoria");

  document.getElementById("modal-tiempo").textContent = formatearTiempo(segundos);
  document.getElementById("modal-errores").textContent = errores;
  modalVictoriaDOM.classList.remove("oculto");
}

// ============================================================
// 10. NUEVA PARTIDA
// ============================================================

/** Genera e inicia una partida nueva con la dificultad elegida. */
function nuevoJuego() {
  const objetivoVacias = DIFICULTADES[dificultadActual];

  // Cerramos el modal y preparamos la interfaz
  modalVictoriaDOM.classList.add("oculto");
  if (overlayPausaDOM) overlayPausaDOM.classList.add("oculto");
  partidaPausada = false;
  actualizarBotonPausa();
  segundos = 0;
  infoTiempoDOM.textContent = formatearTiempo(segundos);
  estadoDOM.textContent = "Generando puzzle...";
  estadoDOM.classList.remove("victoria");
  partidaActiva = false;
  detenerCronometro();

  // Desactivamos todos los controles mientras se calcula
  document
    .querySelectorAll(".acciones button, .teclado button")
    .forEach((b) => (b.disabled = true));
  if (btnPausaDOM) btnPausaDOM.disabled = true;

  // Retardo mínimo para que el navegador pinte el mensaje antes de calcular
  setTimeout(() => {
    tableroSolucion = generarTableroResuelto();
    const puzzle = crearPuzzle(tableroSolucion, objetivoVacias);

    tableroJuego = copiarTablero(puzzle);
    celdasFijas = puzzle.map((fila) => fila.map((v) => v !== 0));
    notas = crearNotasVacias();
    historial = [];
    seleccion = null;
    errores = 0;
    modoNotas = false;
    btnNotasDOM.classList.remove("activa");
    btnDeshacerDOM.disabled = true;

    // Reactivamos controles y pintamos
    document
      .querySelectorAll(".acciones button, .teclado button")
      .forEach((b) => (b.disabled = false));
    if (btnPausaDOM) btnPausaDOM.disabled = false;

    pintarTablero();
    estadoDOM.textContent = "Selecciona una casilla y coloca un número.";
    partidaActiva = true;
    iniciarCronometro();
  }, 40);
}

// ============================================================
// 11. TECLADO FÍSICO
// ============================================================

function manejarTeclado(evento) {
  if (!partidaActiva) return;

  // Con la partida en pausa, la tecla P reanuda y nada más se procesa
  if (partidaPausada) {
    if (evento.key.toLowerCase() === "p") reanudarJuego();
    return;
  }

  if (evento.key.toLowerCase() === "p") {
    pausarJuego();
    return;
  }

  // Flechas: mover la selección
  if (evento.key.startsWith("Arrow")) {
    evento.preventDefault();
    if (seleccion === null) seleccion = { fila: 0, columna: 0 };
    const { fila, columna } = seleccion;
    if (evento.key === "ArrowUp") seleccion = { fila: Math.max(0, fila - 1), columna };
    if (evento.key === "ArrowDown") seleccion = { fila: Math.min(8, fila + 1), columna };
    if (evento.key === "ArrowLeft") seleccion = { fila, columna: Math.max(0, columna - 1) };
    if (evento.key === "ArrowRight") seleccion = { fila, columna: Math.min(8, columna + 1) };
    pintarTablero();
    return;
  }

  if (/^[1-9]$/.test(evento.key)) return colocarNumero(Number(evento.key));

  if (evento.key === "Backspace" || evento.key === "Delete") {
    evento.preventDefault();
    return borrarCelda();
  }

  if (evento.key === "Escape") {
    seleccion = null;
    pintarTablero();
  }

  // Atajos: N apuntes, H pista, Z deshacer
  if (evento.key.toLowerCase() === "n") alternarNotas();
  if (evento.key.toLowerCase() === "h") darPista();
  if (evento.key.toLowerCase() === "z") deshacer();
}

/** Activa o desactiva el modo apuntes. */
function alternarNotas() {
  modoNotas = !modoNotas;
  btnNotasDOM.classList.toggle("activa", modoNotas);
  estadoDOM.textContent = modoNotas
    ? "Modo apuntes activado: los números se añaden como candidatos."
    : "Modo apuntes desactivado.";
}

// ============================================================
// 12. ARRANQUE
// ============================================================

function iniciarApp() {
  // Referencias al DOM
  tableroDOM = document.getElementById("tablero");
  tecladoDOM = document.getElementById("teclado");
  estadoDOM = document.getElementById("estado");
  infoErroresDOM = document.getElementById("info-errores");
  infoTiempoDOM = document.getElementById("info-tiempo");
  infoDificultadDOM = document.getElementById("info-dificultad");
  btnDeshacerDOM = document.getElementById("btn-deshacer");
  btnNotasDOM = document.getElementById("btn-notas");
  modalVictoriaDOM = document.getElementById("modal-victoria");

  // Construimos tablero y teclado
  crearTableroDOM();
  crearTecladoDOM();

  // Pestañas de dificultad: cambian el nivel y empiezan partida nueva
  document.querySelectorAll("#dificultades button").forEach((boton) => {
    boton.addEventListener("click", () => {
      document
        .querySelectorAll("#dificultades button")
        .forEach((b) => b.classList.remove("activo"));
      boton.classList.add("activo");

      dificultadActual = boton.dataset.dificultad;
      infoDificultadDOM.textContent = NOMBRES_DIFICULTAD[dificultadActual];
      nuevoJuego();
    });
  });

  // Botones de acción
  document.getElementById("btn-deshacer").addEventListener("click", deshacer);
  document.getElementById("btn-borrar").addEventListener("click", borrarCelda);
  document.getElementById("btn-notas").addEventListener("click", alternarNotas);
  document.getElementById("btn-pista").addEventListener("click", darPista);
  document.getElementById("btn-nuevo").addEventListener("click", nuevoJuego);
  document.getElementById("btn-modal-nuevo").addEventListener("click", nuevoJuego);
  btnPausaDOM = document.getElementById("btn-pausa");
  btnPausaDOM.addEventListener("click", () => (partidaPausada ? reanudarJuego() : pausarJuego()));

  // Capa de pausa sobre el tablero
  overlayPausaDOM = document.getElementById("overlay-pausa");
  document.getElementById("btn-reanudar").addEventListener("click", reanudarJuego);

  // Teclado físico
  document.addEventListener("keydown", manejarTeclado);

  // Primera partida
  nuevoJuego();
}

document.addEventListener("DOMContentLoaded", iniciarApp);
