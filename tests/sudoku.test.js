import test from "node:test";
import assert from "node:assert/strict";

import {
  DIFICULTADES,
  contarSoluciones,
  crearPuzzle,
  crearPuzzleConResultado,
  generarTableroResuelto,
} from "../src/utils/sudoku.js";
import {
  cumpleDificultadLogica,
  evaluarDificultadLogica,
} from "../src/utils/solucionador.js";

// ------------------------------------------------------------
// Comprobaciones independientes del generador
// ------------------------------------------------------------

const TAM = 9;
const DIGITOS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EJECUCIONES_POR_NIVEL = 2;

function copiar(tablero) {
  return tablero.map((fila) => [...fila]);
}

function contarVacias(tablero) {
  return tablero.flat().filter((valor) => valor === 0).length;
}

/** Celdas de cada fila, columna y caja 3x3. */
function unidadesDe(tablero) {
  const unidades = [];

  for (let fila = 0; fila < TAM; fila++) {
    unidades.push(tablero[fila]);
  }
  for (let columna = 0; columna < TAM; columna++) {
    unidades.push(tablero.map((fila) => fila[columna]));
  }
  for (let inicioFila = 0; inicioFila < TAM; inicioFila += 3) {
    for (let inicioColumna = 0; inicioColumna < TAM; inicioColumna += 3) {
      const caja = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          caja.push(tablero[inicioFila + i][inicioColumna + j]);
        }
      }
      unidades.push(caja);
    }
  }

  return unidades;
}

function estructuraCorrecta(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAM) return false;
  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAM) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 0 || valor > TAM) return false;
    }
  }
  return true;
}

/**
 * Reglas reales del Sudoku, sin usar tableroEsValido().
 * Con `completa` exige además que no queden ceros y que cada unidad
 * contenga exactamente los dígitos 1..9.
 */
function esSudokuValido(tablero, { completa = false } = {}) {
  if (!estructuraCorrecta(tablero)) return false;

  for (const unidad of unidadesDe(tablero)) {
    const vistos = new Set();
    for (const valor of unidad) {
      if (valor === 0) {
        if (completa) return false;
        continue;
      }
      if (vistos.has(valor)) return false;
      vistos.add(valor);
    }
    if (completa && vistos.size !== TAM) return false;
  }

  return true;
}

function puedeColocar(tablero, fila, columna, numero) {
  for (let i = 0; i < TAM; i++) {
    if (tablero[fila][i] === numero || tablero[i][columna] === numero) {
      return false;
    }
  }

  const inicioFila = Math.floor(fila / 3) * 3;
  const inicioColumna = Math.floor(columna / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (tablero[inicioFila + i][inicioColumna + j] === numero) return false;
    }
  }

  return true;
}

/**
 * Contador de soluciones propio, limitado a `limite` (2 por defecto).
 * Se implementa aparte para no validar el generador con su misma
 * función de conteo. Un puzzle con más de una solución devuelve 2.
 */
function contarSolucionesIndependiente(tablero, limite = 2) {
  if (!esSudokuValido(tablero)) return 0;

  const copia = copiar(tablero);
  let total = 0;

  const resolver = () => {
    if (total >= limite) return;

    let filaVacia = -1;
    let columnaVacia = -1;
    for (let fila = 0; fila < TAM && filaVacia === -1; fila++) {
      for (let columna = 0; columna < TAM; columna++) {
        if (copia[fila][columna] === 0) {
          filaVacia = fila;
          columnaVacia = columna;
          break;
        }
      }
    }

    if (filaVacia === -1) {
      total++;
      return;
    }

    for (let numero = 1; numero <= TAM; numero++) {
      if (!puedeColocar(copia, filaVacia, columnaVacia, numero)) continue;
      copia[filaVacia][columnaVacia] = numero;
      resolver();
      copia[filaVacia][columnaVacia] = 0;
      if (total >= limite) return;
    }
  };

  resolver();
  return total;
}

// Solución fija para que las pruebas de búsqueda no dependan de
// generarTableroResuelto.
const SOLUCION_FIJA = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

/** RNG determinista para las pruebas de búsqueda. */
function crearAleatorio(semilla) {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function evaluacionLogica(nivel, extra = {}) {
  return {
    estado: "resuelto",
    resuelto: true,
    nivel,
    nombre: "prueba",
    etiqueta: "Prueba",
    verificado: true,
    tecnicas: [],
    pasos: 0,
    vaciasRestantes: 0,
    ultimaTecnica: null,
    ...extra,
  };
}

// ------------------------------------------------------------
// Solución completa
// ------------------------------------------------------------

test("generarTableroResuelto devuelve una solución 9x9 completa y válida", () => {
  for (let ejecucion = 0; ejecucion < 3; ejecucion++) {
    const tablero = generarTableroResuelto();

    assert.equal(tablero.length, TAM);
    for (const fila of tablero) assert.equal(fila.length, TAM);
    assert.equal(contarVacias(tablero), 0);

    // Cada fila, columna y caja es una permutación exacta de 1..9.
    for (const unidad of unidadesDe(tablero)) {
      assert.deepEqual(
        [...unidad].sort((a, b) => a - b),
        DIGITOS,
        "cada unidad debe contener 1..9 sin repetir"
      );
    }

    assert.equal(esSudokuValido(tablero, { completa: true }), true);
  }
});

// ------------------------------------------------------------
// Puzzles generados por nivel
// ------------------------------------------------------------

for (const [nivel, objetivo] of Object.entries(DIFICULTADES)) {
  test(`crearPuzzle genera puzzles válidos y de solución única (${nivel})`, () => {
    const solucion = generarTableroResuelto();
    const copiaSolucion = copiar(solucion);

    for (let ejecucion = 0; ejecucion < EJECUCIONES_POR_NIVEL; ejecucion++) {
      const puzzle = crearPuzzle(solucion, objetivo);

      assert.ok(puzzle, `el generador debe devolver un puzzle (${nivel})`);
      assert.equal(puzzle.length, TAM);
      for (const fila of puzzle) assert.equal(fila.length, TAM);
      assert.equal(
        esSudokuValido(puzzle),
        true,
        `el puzzle ${nivel} debe respetar las reglas del Sudoku`
      );

      // El generador puede quedarse corto (reintentos/presupuesto), pero
      // nunca debe vaciar más casillas que el objetivo.
      const vacias = contarVacias(puzzle);
      assert.ok(
        vacias <= objetivo,
        `${nivel}: se esperaban como máximo ${objetivo} vacías y hay ${vacias}`
      );

      // Toda pista debe coincidir con la solución completa de origen.
      for (let fila = 0; fila < TAM; fila++) {
        for (let columna = 0; columna < TAM; columna++) {
          if (puzzle[fila][columna] !== 0) {
            assert.equal(puzzle[fila][columna], solucion[fila][columna]);
          }
        }
      }

      // Unicidad comprobada con un contador ajeno al de producción.
      assert.equal(
        contarSolucionesIndependiente(puzzle, 2),
        1,
        `el puzzle ${nivel} debe tener exactamente una solución`
      );
    }

    assert.deepEqual(solucion, copiaSolucion, "la solución no debe modificarse");
  });
}

// ------------------------------------------------------------
// Contratos y límites
// ------------------------------------------------------------

test("crearPuzzle(solucion, 0) conserva una solución completa y válida", () => {
  const solucion = generarTableroResuelto();
  const copiaSolucion = copiar(solucion);

  const puzzle = crearPuzzle(solucion, 0);

  assert.ok(puzzle);
  assert.deepEqual(puzzle, solucion);
  assert.notEqual(puzzle, solucion);
  assert.equal(esSudokuValido(puzzle, { completa: true }), true);
  assert.deepEqual(solucion, copiaSolucion);
});

test("crearPuzzle acepta objetivoVacias en los límites 0 y 81", () => {
  const solucion = generarTableroResuelto();

  assert.ok(crearPuzzle(solucion, 0));
  assert.ok(
    crearPuzzle(solucion, 81, { maxIntentos: 1, presupuestoMs: 1 })
  );
});

test("crearPuzzle rechaza objetivoVacias fuera de rango o no entero", () => {
  const solucion = generarTableroResuelto();
  const invalidos = [-1, -81, 82, 1.5, NaN, Infinity, -Infinity, "36", null, undefined];

  for (const objetivo of invalidos) {
    assert.throws(() => crearPuzzle(solucion, objetivo), TypeError);
  }

  assert.throws(() => crearPuzzle(solucion), TypeError);
});

test("crearPuzzle devuelve el mejor puzzle válido si no alcanza el objetivo", () => {
  const solucion = generarTableroResuelto();

  // 81 vacías es inalcanzable con solución única. Un solo intento acota
  // el costo y documenta que, al quedarse corto, se devuelve un puzzle
  // válido en lugar de null o un tablero roto.
  const puzzle = crearPuzzle(solucion, 81, {
    maxIntentos: 1,
    presupuestoMs: 10000,
  });

  assert.ok(puzzle);
  assert.equal(esSudokuValido(puzzle), true);
  assert.ok(contarVacias(puzzle) > 0);
  assert.ok(contarVacias(puzzle) < 81);
  assert.equal(contarSolucionesIndependiente(puzzle, 2), 1);

  for (let fila = 0; fila < TAM; fila++) {
    for (let columna = 0; columna < TAM; columna++) {
      if (puzzle[fila][columna] !== 0) {
        assert.equal(puzzle[fila][columna], solucion[fila][columna]);
      }
    }
  }
});

test("crearPuzzle rechaza con TypeError una solución completa con duplicados", () => {
  const solucion = generarTableroResuelto();
  const invalida = copiar(solucion);
  // Duplicado en la fila 0 y en la caja 0-2/0-2.
  invalida[0][0] = invalida[0][1];

  assert.throws(() => crearPuzzle(invalida, 0), TypeError);
});

test("crearPuzzle rechaza entradas que no son matrices 9x9", () => {
  const invalidas = [
    null,
    undefined,
    "texto",
    [[0]],
    Array.from({ length: 8 }, () => Array(TAM).fill(0)),
  ];

  for (const entrada of invalidas) {
    assert.throws(() => crearPuzzle(entrada, 36), TypeError);
  }
});

// ------------------------------------------------------------
// Dificultad lógica y resultado de generación
// ------------------------------------------------------------

test("crearPuzzleConResultado informa cuando cumple vacías y dificultad lógica", () => {
  const solucion = generarTableroResuelto();

  const resultado = crearPuzzleConResultado(solucion, 30, {
    evaluar: evaluarDificultadLogica,
    aceptar: (evaluacion) => cumpleDificultadLogica(evaluacion, "facil"),
    maxIntentos: 1,
  });

  assert.equal(resultado.alcanzado, true);
  assert.equal(resultado.motivo, "objetivo");
  assert.equal(resultado.vacias, 30);
  assert.equal(resultado.evaluacion.nivel, 0);
  assert.equal(resultado.evaluacion.etiqueta, "Fácil");
  assert.equal(esSudokuValido(resultado.puzzle), true);
  assert.equal(contarSolucionesIndependiente(resultado.puzzle, 2), 1);
});

test("crearPuzzleConResultado no presenta un puzzle fácil como experto", () => {
  const solucion = generarTableroResuelto();

  // Una solución completa es un puzzle válido de dificultad lógica fácil.
  // Pedirle nivel experto no debe aceptarse aunque el objetivo de vacías
  // (0) se cumpla.
  const resultado = crearPuzzleConResultado(solucion, 0, {
    evaluar: evaluarDificultadLogica,
    aceptar: (evaluacion) => cumpleDificultadLogica(evaluacion, "experto"),
    maxIntentos: 1,
  });

  assert.equal(resultado.alcanzado, false);
  assert.equal(resultado.motivo, "dificultad");
  assert.equal(resultado.vacias, 0);
  assert.equal(resultado.evaluacion.etiqueta, "Fácil");
  assert.equal(contarSolucionesIndependiente(resultado.puzzle, 2), 1);
});

test("crearPuzzleConResultado informa el agotamiento del presupuesto", () => {
  const solucion = generarTableroResuelto();

  const resultado = crearPuzzleConResultado(solucion, 81, {
    evaluar: evaluarDificultadLogica,
    aceptar: () => false,
    maxIntentos: 5,
    presupuestoMs: 0,
  });

  assert.equal(resultado.alcanzado, false);
  assert.equal(resultado.motivo, "presupuesto");
  assert.equal(esSudokuValido(resultado.puzzle), true);
  assert.ok(contarVacias(resultado.puzzle) < 81);
  assert.equal(contarSolucionesIndependiente(resultado.puzzle, 2), 1);
});

test("contarSoluciones importado por el generador coincide con el contador independiente", () => {
  const solucion = generarTableroResuelto();
  const puzzle = crearPuzzle(solucion, DIFICULTADES.facil);

  assert.equal(contarSoluciones(copiar(puzzle), 2), 1);
  assert.equal(contarSolucionesIndependiente(puzzle, 2), 1);
});

// ------------------------------------------------------------
// Búsqueda local de dificultad
// ------------------------------------------------------------

test("la búsqueda acepta de inmediato un candidato de nivel exacto", () => {
  let llamadas = 0;
  const diagnostico = {};

  const resultado = crearPuzzleConResultado(SOLUCION_FIJA, 30, {
    evaluar: () => {
      llamadas++;
      return evaluacionLogica(1);
    },
    aceptar: (evaluacion) => evaluacion.nivel === 1,
    puntuar: (evaluacion) => Math.abs(evaluacion.nivel - 1),
    aleatorio: crearAleatorio(1),
    maxEvaluaciones: 10,
    maxIntercambiosPorSemilla: 10,
    diagnostico,
  });

  assert.equal(resultado.alcanzado, true);
  assert.equal(resultado.motivo, "objetivo");
  assert.equal(resultado.vacias, 30);
  assert.equal(llamadas, 1);
  assert.equal(diagnostico.semillas, 1);
  assert.equal(diagnostico.intercambios, 0);
  assert.equal(diagnostico.evaluaciones, 1);
  assert.equal(contarSolucionesIndependiente(resultado.puzzle, 2), 1);
});

test("la puntuación prefiere un candidato verificado antes que uno bloqueado", () => {
  let llamadas = 0;

  const resultado = crearPuzzleConResultado(SOLUCION_FIJA, 30, {
    evaluar: () => {
      llamadas++;
      if (llamadas === 1) {
        return evaluacionLogica(4, {
          estado: "bloqueado",
          resuelto: false,
          verificado: false,
          vaciasRestantes: 20,
        });
      }
      return evaluacionLogica(0);
    },
    aceptar: () => false,
    puntuar: (evaluacion) =>
      evaluacion.resuelto && evaluacion.verificado
        ? 1
        : Number.POSITIVE_INFINITY,
    aleatorio: crearAleatorio(2),
    maxEvaluaciones: 5,
    maxIntercambiosPorSemilla: 50,
  });

  assert.equal(resultado.alcanzado, false);
  assert.equal(resultado.evaluacion.resuelto, true);
  assert.equal(resultado.evaluacion.verificado, true);
  assert.equal(resultado.evaluacion.nivel, 0);
  assert.notEqual(resultado.evaluacion.nivel, 4);
});

test("cada vecino evaluado conserva vacías, pistas y unicidad sin repetirse", () => {
  const evaluados = [];
  const claves = new Set();

  const resultado = crearPuzzleConResultado(SOLUCION_FIJA, 45, {
    evaluar: (puzzle) => {
      const clave = puzzle.flat().join("");
      assert.equal(claves.has(clave), false, "no debe reevaluar un tablero");
      claves.add(clave);
      evaluados.push(copiar(puzzle));
      return evaluacionLogica(0);
    },
    aceptar: () => false,
    puntuar: () => 1,
    aleatorio: crearAleatorio(3),
    maxEvaluaciones: 5,
    maxIntercambiosPorSemilla: 50,
  });

  assert.ok(evaluados.length >= 2);

  for (const puzzle of evaluados) {
    assert.equal(contarVacias(puzzle), 45);
    assert.equal(contarSolucionesIndependiente(puzzle, 2), 1);

    for (let fila = 0; fila < TAM; fila++) {
      for (let columna = 0; columna < TAM; columna++) {
        if (puzzle[fila][columna] !== 0) {
          assert.equal(puzzle[fila][columna], SOLUCION_FIJA[fila][columna]);
        }
      }
    }
  }

  assert.equal(resultado.alcanzado, false);
  assert.equal(resultado.vacias, 45);
});

test("la búsqueda respeta el máximo de evaluaciones", () => {
  let llamadas = 0;
  const diagnostico = {};

  const resultado = crearPuzzleConResultado(SOLUCION_FIJA, 30, {
    evaluar: () => {
      llamadas++;
      return evaluacionLogica(0);
    },
    aceptar: () => false,
    puntuar: () => 1,
    aleatorio: crearAleatorio(4),
    maxEvaluaciones: 4,
    maxIntercambiosPorSemilla: 100,
    diagnostico,
  });

  assert.equal(llamadas, 4);
  assert.equal(diagnostico.evaluaciones, 4);
  assert.equal(resultado.alcanzado, false);
});

test("un vecino no único se descarta antes de evaluar la dificultad", () => {
  const diagnostico = {};
  let evaluaciones = 0;

  const resultado = crearPuzzleConResultado(SOLUCION_FIJA, 52, {
    evaluar: (puzzle) => {
      evaluaciones++;
      assert.equal(contarSolucionesIndependiente(puzzle, 2), 1);
      return evaluacionLogica(0);
    },
    aceptar: () => false,
    puntuar: () => 1,
    aleatorio: crearAleatorio(5),
    maxEvaluaciones: 8,
    maxIntercambiosPorSemilla: 200,
    presupuestoMs: 5000,
    diagnostico,
  });

  assert.ok(evaluaciones >= 2);
  assert.ok(diagnostico.rechazosUnicidad > 0);
  assert.equal(resultado.alcanzado, false);
});
