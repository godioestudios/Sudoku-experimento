// Benchmark reproducible del solucionador lógico.
// Uso: node scripts/benchmark-solucionador.mjs [cantidad] [seed]
// No modifica la lógica de producción: solo importa sus funciones.

import {
  ESTADOS,
  TECNICAS,
  clasificarTablero,
  detectarHiddenPares,
  detectarHiddenQuads,
  detectarHiddenSingles,
  detectarHiddenTriples,
  detectarNakedPares,
  detectarNakedQuads,
  detectarNakedSingles,
  detectarNakedTriples,
  obtenerCandidatos,
  resolverLogico,
  tableroEsValido,
} from "../src/utils/solucionador.js";
import { contarSoluciones, esValido } from "../src/utils/sudoku.js";

const CANTIDAD = Number(process.argv[2] ?? 100);
const SEED = Number(process.argv[3] ?? 20261019);
const OBJETIVO_VACIAS = 52;
const MAX_INTENTOS_VACIADO = 4;

const copiar = (tablero) => tablero.map((fila) => [...fila]);
const clave = (fila, columna, numero) => `${fila},${columna},${numero}`;
const vaciasDe = (tablero) => tablero.flat().filter((v) => v === 0).length;

function crearRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function construirUnidades() {
  const unidades = [];
  for (let fila = 0; fila < 9; fila++) {
    unidades.push({
      tipo: "fila",
      celdas: Array.from({ length: 9 }, (_, columna) => [fila, columna]),
    });
  }
  for (let columna = 0; columna < 9; columna++) {
    unidades.push({
      tipo: "columna",
      celdas: Array.from({ length: 9 }, (_, fila) => [fila, columna]),
    });
  }
  for (let inicioFila = 0; inicioFila < 9; inicioFila += 3) {
    for (let inicioColumna = 0; inicioColumna < 9; inicioColumna += 3) {
      const celdas = [];
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          celdas.push([inicioFila + i, inicioColumna + j]);
        }
      }
      unidades.push({ tipo: "caja", celdas });
    }
  }
  return unidades;
}

const UNIDADES = construirUnidades();

function unidadDe(tipo, celdas) {
  return UNIDADES.find(
    (unidad) =>
      unidad.tipo === tipo &&
      celdas.every(([fila, columna]) =>
        unidad.celdas.some(([f, c]) => f === fila && c === columna)
      )
  );
}

function tableroResuelto(rng) {
  const tablero = Array.from({ length: 9 }, () => Array(9).fill(0));

  function rellenar() {
    for (let fila = 0; fila < 9; fila++) {
      for (let columna = 0; columna < 9; columna++) {
        if (tablero[fila][columna] !== 0) continue;
        for (const numero of barajar([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
          if (esValido(tablero, fila, columna, numero)) {
            tablero[fila][columna] = numero;
            if (rellenar()) return true;
            tablero[fila][columna] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  rellenar();
  return tablero;
}

function crearPuzzleDeterminista(solucion, rng) {
  const posiciones = [];
  for (let fila = 0; fila < 9; fila++) {
    for (let columna = 0; columna < 9; columna++) posiciones.push([fila, columna]);
  }

  let mejor = null;
  let mejorVacias = -1;
  for (let intento = 0; intento < MAX_INTENTOS_VACIADO; intento++) {
    barajar(posiciones, rng);
    const puzzle = copiar(solucion);
    let vacias = 0;

    for (const [fila, columna] of posiciones) {
      if (vacias >= OBJETIVO_VACIAS) break;
      const guardado = puzzle[fila][columna];
      puzzle[fila][columna] = 0;
      if (contarSoluciones(copiar(puzzle), 2) === 1) vacias++;
      else puzzle[fila][columna] = guardado;
    }

    if (vacias > mejorVacias) {
      mejor = puzzle;
      mejorVacias = vacias;
    }
    if (vacias >= OBJETIVO_VACIAS) break;
  }

  return { puzzle: mejor, vacias: mejorVacias };
}

// ------------------------------------------------------------
// Fixtures deterministas adicionales (ya usados por los tests)
// ------------------------------------------------------------

const HIDDEN_PAIR_DESBLOQUEA = [
  [8, 0, 6, 0, 0, 0, 0, 2, 5],
  [0, 0, 3, 0, 0, 4, 0, 9, 1],
  [5, 4, 9, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 8, 2, 0, 0, 4, 9],
  [0, 8, 0, 0, 0, 0, 7, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 8, 0],
  [0, 0, 7, 0, 0, 0, 0, 0, 4],
  [0, 0, 0, 1, 7, 0, 0, 6, 0],
  [2, 6, 0, 5, 4, 0, 9, 0, 0],
];

const NAKED_TRIPLE_DESBLOQUEA = [
  [3, 8, 0, 0, 9, 0, 0, 6, 0],
  [0, 0, 0, 0, 0, 7, 9, 0, 0],
  [0, 4, 0, 8, 0, 0, 0, 3, 1],
  [0, 0, 0, 7, 0, 2, 0, 0, 0],
  [0, 3, 2, 5, 1, 9, 0, 0, 0],
  [0, 0, 5, 0, 8, 6, 0, 2, 0],
  [5, 0, 0, 1, 0, 0, 0, 0, 8],
  [0, 0, 4, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 2, 0, 9],
];

const NAKED_TRIPLE_FILA_DESBLOQUEA = [
  [0, 0, 7, 0, 2, 0, 0, 0, 0],
  [0, 0, 4, 7, 0, 9, 0, 0, 0],
  [5, 0, 0, 6, 0, 0, 0, 0, 7],
  [0, 0, 5, 0, 0, 0, 0, 0, 0],
  [0, 8, 0, 5, 0, 3, 4, 7, 9],
  [0, 0, 0, 0, 0, 8, 3, 6, 5],
  [0, 9, 0, 0, 5, 6, 2, 0, 0],
  [0, 0, 0, 1, 9, 0, 0, 4, 0],
  [1, 0, 0, 3, 8, 0, 9, 0, 6],
];

const HIDDEN_TRIPLE_DESBLOQUEA = [
  [8, 0, 0, 0, 3, 6, 0, 7, 0],
  [0, 0, 0, 1, 4, 0, 0, 0, 0],
  [0, 0, 0, 0, 5, 2, 0, 0, 3],
  [0, 3, 0, 0, 0, 0, 0, 2, 6],
  [4, 0, 0, 0, 2, 8, 0, 0, 7],
  [0, 0, 8, 0, 6, 1, 0, 4, 9],
  [0, 0, 0, 0, 0, 0, 7, 0, 0],
  [0, 0, 7, 0, 8, 3, 9, 0, 0],
  [2, 0, 0, 4, 0, 0, 5, 0, 1],
];

const NAKED_QUAD_DESBLOQUEA = [
  [0, 0, 0, 6, 0, 0, 0, 8, 0],
  [0, 3, 0, 5, 0, 0, 1, 0, 0],
  [0, 0, 0, 0, 0, 1, 3, 0, 4],
  [5, 9, 0, 0, 6, 0, 0, 0, 0],
  [6, 0, 4, 0, 0, 2, 0, 0, 0],
  [0, 0, 2, 0, 9, 0, 0, 0, 0],
  [4, 0, 0, 0, 3, 0, 0, 0, 1],
  [0, 8, 0, 0, 0, 7, 0, 0, 2],
  [0, 0, 0, 8, 0, 0, 0, 6, 3],
];

const NAKED_QUAD_HABILITA_SINGLE = [
  [4, 0, 0, 0, 0, 0, 3, 0, 0],
  [0, 5, 0, 0, 1, 3, 0, 0, 0],
  [0, 9, 0, 0, 5, 0, 7, 0, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 8, 6, 9, 2, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 8],
  [0, 0, 9, 0, 0, 0, 0, 1, 0],
  [5, 0, 0, 0, 9, 0, 0, 4, 0],
  [0, 0, 0, 6, 0, 4, 0, 8, 0],
];

// Mismo puzzle que el test de Hidden Quad; mantener ambos sincronizados.
const HIDDEN_QUAD_DESBLOQUEA = [
  [0, 0, 0, 1, 2, 3, 4, 0, 0],
  [0, 0, 0, 5, 0, 9, 0, 1, 0],
  [0, 0, 0, 6, 7, 0, 0, 3, 0],
  [1, 0, 0, 3, 0, 7, 5, 2, 6],
  [2, 5, 0, 8, 0, 0, 3, 7, 0],
  [3, 0, 0, 0, 5, 0, 0, 4, 0],
  [4, 2, 0, 7, 0, 5, 0, 0, 0],
  [6, 9, 0, 4, 0, 0, 7, 8, 0],
  [0, 0, 0, 0, 6, 0, 0, 0, 4],
];

const FIXTURES = [
  ["hidden-pair-desbloquea", HIDDEN_PAIR_DESBLOQUEA],
  ["naked-triple-desbloquea", NAKED_TRIPLE_DESBLOQUEA],
  ["naked-triple-fila-desbloquea", NAKED_TRIPLE_FILA_DESBLOQUEA],
  ["hidden-triple-desbloquea", HIDDEN_TRIPLE_DESBLOQUEA],
  ["naked-quad-desbloquea", NAKED_QUAD_DESBLOQUEA],
  ["naked-quad-habilita-single", NAKED_QUAD_HABILITA_SINGLE],
  ["hidden-quad-desbloquea", HIDDEN_QUAD_DESBLOQUEA],
];

// ------------------------------------------------------------
// Verificación de pasos
// ------------------------------------------------------------

function candidatosEfectivos(tablero, fila, columna, eliminados) {
  return obtenerCandidatos(tablero, fila, columna).filter(
    (numero) => !eliminados.has(clave(fila, columna, numero))
  );
}

function mismasCeldas(a, b) {
  const normalizar = (celdas) =>
    celdas
      .map(([fila, columna]) => `${fila},${columna}`)
      .sort()
      .join("|");
  return normalizar(a) === normalizar(b);
}

const DETECTORES = [
  [TECNICAS.NAKED_SINGLE, detectarNakedSingles],
  [TECNICAS.HIDDEN_SINGLE, detectarHiddenSingles],
  [TECNICAS.NAKED_PAIR, detectarNakedPares],
  [TECNICAS.HIDDEN_PAIR, detectarHiddenPares],
  [TECNICAS.NAKED_TRIPLE, detectarNakedTriples],
  [TECNICAS.HIDDEN_TRIPLE, detectarHiddenTriples],
  [TECNICAS.NAKED_QUAD, detectarNakedQuads],
  [TECNICAS.HIDDEN_QUAD, detectarHiddenQuads],
];

const TECNICAS_OCULTAS = new Set([
  TECNICAS.HIDDEN_PAIR,
  TECNICAS.HIDDEN_TRIPLE,
  TECNICAS.HIDDEN_QUAD,
]);

function fallo(mensaje) {
  throw new Error(mensaje);
}

function verificarPasos(puzzle, solucion, resultado) {
  const tablero = copiar(puzzle);
  const eliminados = new Set();
  const pasos = resultado.pasos;

  pasos.forEach((paso, indice) => {
    const contexto = `paso ${indice} (${paso.tecnica})`;

    const prioridad = DETECTORES.find(([, detector]) => {
      const encontrados = detector(tablero, eliminados);
      return encontrados.some(
        (d) => d.eliminados === undefined || d.eliminados.length > 0
      );
    });
    if (!prioridad) fallo(`${contexto}: no quedaba ninguna técnica efectiva`);
    if (prioridad[0] !== paso.tecnica) {
      fallo(
        `${contexto}: se aplicó ${paso.tecnica} pero correspondía ${prioridad[0]}`
      );
    }

    if (paso.eliminados) {
      if (!paso.unidad) fallo(`${contexto}: falta la unidad`);
      const unidad = unidadDe(paso.unidad, paso.celdas);
      if (!unidad) fallo(`${contexto}: las celdas no comparten unidad`);

      const tamano = paso.celdas.length;
      if (paso.candidatos.length !== tamano) {
        fallo(`${contexto}: candidatos=${paso.candidatos.length}, celdas=${tamano}`);
      }
      for (const [fila, columna] of paso.celdas) {
        if (tablero[fila][columna] !== 0) {
          fallo(`${contexto}: la celda (${fila},${columna}) no está vacía`);
        }
      }

      const esOculta = TECNICAS_OCULTAS.has(paso.tecnica);
      if (esOculta) {
        const union = new Set();
        for (const numero of paso.candidatos) {
          const posibles = unidad.celdas.filter(
            ([fila, columna]) =>
              tablero[fila][columna] === 0 &&
              candidatosEfectivos(tablero, fila, columna, eliminados).includes(
                numero
              )
          );
          if (posibles.length === 0) {
            fallo(`${contexto}: el número ${numero} no tiene ninguna casilla`);
          }
          for (const [fila, columna] of posibles) {
            union.add(`${fila},${columna}`);
          }
        }
        const celdasUnion = [...union]
          .map((k) => k.split(",").map(Number))
          .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        if (!mismasCeldas(celdasUnion, paso.celdas)) {
          fallo(
            `${contexto}: la unión de posibilidades no coincide con las celdas indicadas`
          );
        }
      } else {
        const union = new Set();
        for (const [fila, columna] of paso.celdas) {
          for (const numero of candidatosEfectivos(
            tablero,
            fila,
            columna,
            eliminados
          )) {
            union.add(numero);
          }
        }
        const unionOrdenada = [...union].sort((a, b) => a - b);
        if (unionOrdenada.join(",") !== paso.candidatos.join(",")) {
          fallo(`${contexto}: la unión de candidatos no coincide`);
        }
      }

      for (const [fila, columna, numero] of paso.eliminados) {
        const k = clave(fila, columna, numero);
        if (eliminados.has(k)) fallo(`${contexto}: eliminación repetida ${k}`);
        const presentes = candidatosEfectivos(
          tablero,
          fila,
          columna,
          eliminados
        );
        if (!presentes.includes(numero)) {
          fallo(`${contexto}: eliminación inexistente ${k}`);
        }
        if (esOculta) {
          if (paso.candidatos.includes(numero)) {
            fallo(`${contexto}: un hidden elimina un número del propio conjunto`);
          }
          if (!paso.celdas.some(([f, c]) => f === fila && c === columna)) {
            fallo(`${contexto}: un hidden elimina fuera de sus celdas`);
          }
        } else {
          if (!paso.candidatos.includes(numero)) {
            fallo(`${contexto}: un naked elimina un número ajeno`);
          }
          if (paso.celdas.some(([f, c]) => f === fila && c === columna)) {
            fallo(`${contexto}: un naked elimina dentro de sus celdas`);
          }
          if (!unidad.celdas.some(([f, c]) => f === fila && c === columna)) {
            fallo(`${contexto}: un naked elimina fuera de su unidad`);
          }
        }
        if (solucion[fila][columna] === numero) {
          fallo(
            `${contexto}: eliminó el ${numero} de (${fila},${columna}), que es su valor en la solución`
          );
        }
        eliminados.add(k);
      }
      return;
    }

    const { fila, columna, numero } = paso;
    if (tablero[fila][columna] !== 0) {
      fallo(`${contexto}: la celda (${fila},${columna}) no está vacía`);
    }
    if (!esValido(tablero, fila, columna, numero)) {
      fallo(`${contexto}: colocación inválida (${fila},${columna})=${numero}`);
    }
    if (eliminados.has(clave(fila, columna, numero))) {
      fallo(`${contexto}: colocó un candidato eliminado`);
    }
    if (solucion[fila][columna] !== numero) {
      fallo(
        `${contexto}: colocó ${numero} en (${fila},${columna}) pero la solución es ${solucion[fila][columna]}`
      );
    }
    tablero[fila][columna] = numero;
  });

  if (JSON.stringify(tablero) !== JSON.stringify(resultado.tablero)) {
    fallo("la reproducción secuencial no coincide con el tablero final");
  }

  if (resultado.estado === ESTADOS.RESUELTO) {
    if (vaciasDe(resultado.tablero) !== 0) fallo("resuelto con celdas vacías");
    if (!tableroEsValido(resultado.tablero)) fallo("resuelto pero inválido");
    if (JSON.stringify(resultado.tablero) !== JSON.stringify(solucion)) {
      fallo("resuelto pero distinto de la solución única");
    }
  } else if (resultado.estado === ESTADOS.BLOQUEADO) {
    if (vaciasDe(resultado.tablero) === 0) fallo("bloqueado con tablero lleno");
    for (let fila = 0; fila < 9; fila++) {
      for (let columna = 0; columna < 9; columna++) {
        if (
          resultado.tablero[fila][columna] === 0 &&
          candidatosEfectivos(resultado.tablero, fila, columna, eliminados)
            .length === 0
        ) {
          fallo(`bloqueado con casilla muerta en (${fila},${columna})`);
        }
      }
    }
    for (const [tecnica, detector] of DETECTORES) {
      const encontrados = detector(resultado.tablero, eliminados);
      const efectivos = encontrados.filter(
        (d) => d.eliminados === undefined || d.eliminados.length > 0
      );
      if (efectivos.length > 0) {
        fallo(`bloqueado pero quedaba ${tecnica} aplicable`);
      }
    }
  } else if (resultado.estado === ESTADOS.INVALIDO) {
    fallo("un puzzle válido con solución única terminó inválido");
  } else {
    fallo(`estado desconocido: ${resultado.estado}`);
  }

  return eliminados;
}

// ------------------------------------------------------------
// Medición de detectores
// ------------------------------------------------------------

function nuevoAcumulador() {
  return Object.fromEntries(
    DETECTORES.map(([tecnica]) => [tecnica, { llamadas: 0, ms: 0 }])
  );
}

function medirDeteccionInicial(tablero, acumulador) {
  for (const [tecnica, detector] of DETECTORES) {
    const inicio = performance.now();
    detector(tablero, null);
    acumulador[tecnica].ms += performance.now() - inicio;
    acumulador[tecnica].llamadas++;
  }
}

function medirDeteccionPorPaso(puzzle, pasos, acumulador) {
  const tablero = copiar(puzzle);
  const eliminados = new Set();

  for (const paso of pasos) {
    const hasta = DETECTORES.findIndex(([tecnica]) => tecnica === paso.tecnica);
    for (let i = 0; i <= hasta; i++) {
      const [tecnica, detector] = DETECTORES[i];
      const inicio = performance.now();
      detector(tablero, eliminados);
      acumulador[tecnica].ms += performance.now() - inicio;
      acumulador[tecnica].llamadas++;
    }

    if (paso.eliminados) {
      for (const [fila, columna, numero] of paso.eliminados) {
        eliminados.add(clave(fila, columna, numero));
      }
    } else {
      tablero[paso.fila][paso.columna] = paso.numero;
    }
  }
}

// ------------------------------------------------------------
// Estadísticas
// ------------------------------------------------------------

function estadisticas(valores) {
  const orden = [...valores].sort((a, b) => a - b);
  const n = orden.length;
  if (n === 0) return { media: 0, mediana: 0, maximo: 0 };
  const media = orden.reduce((s, v) => s + v, 0) / n;
  const mediana =
    n % 2 === 1 ? orden[(n - 1) / 2] : (orden[n / 2 - 1] + orden[n / 2]) / 2;
  return { media, mediana, maximo: orden[n - 1] };
}

const fmt = (n, decimales = 2) => n.toFixed(decimales);

// ------------------------------------------------------------
// Casos inválidos / insatisfacibles
// ------------------------------------------------------------

function conValor(base, fila, columna, valor) {
  const copia = copiar(base);
  copia[fila][columna] = valor;
  return copia;
}

const BASE = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

// Estructura válida, sin repetidos ni casillas muertas, pero sin solución.
const INSATISFACIBLE = [
  [1, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
];

// Sin solución, sin repetidos y sin casillas muertas: el solver se queda
// bloqueado en vez de marcarlo inválido (limitación conocida).
const INSATISFACIBLE_BLOQUEADO = [
  [1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 3, 6, 0, 0, 0, 0, 0],
  [0, 7, 0, 0, 9, 0, 2, 0, 0],
  [0, 5, 0, 0, 0, 7, 0, 0, 0],
  [0, 0, 0, 0, 4, 5, 7, 0, 0],
  [0, 0, 0, 1, 0, 0, 0, 3, 0],
  [0, 0, 1, 0, 0, 0, 0, 6, 8],
  [0, 0, 8, 5, 0, 0, 0, 1, 0],
  [0, 9, 0, 0, 0, 0, 4, 0, 0],
];

const CASILLA_MUERTA = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8],
  [9, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const INVALIDOS = [
  ["duplicado-fila", conValor(BASE, 0, 6, 5), "invalido"],
  ["duplicado-columna", conValor(BASE, 6, 0, 6), "invalido"],
  ["duplicado-caja", conValor(BASE, 1, 2, 3), "invalido"],
  ["fuera-de-rango", conValor(BASE, 0, 2, 10), "invalido"],
  [
    "estructura-rota",
    BASE.map((fila, i) => (i === 4 ? fila.slice(0, 8) : fila)),
    "invalido",
  ],
  ["casilla-muerta", CASILLA_MUERTA, "invalido"],
  ["insatisfacible", INSATISFACIBLE, "no-resuelto"],
  ["insatisfacible-bloqueado", INSATISFACIBLE_BLOQUEADO, "no-resuelto"],
];

function verificarInvalidos() {
  const resultados = [];
  for (const [nombre, tablero, esperado] of INVALIDOS) {
    const original = copiar(tablero);
    const resultado = resolverLogico(tablero);
    if (JSON.stringify(tablero) !== JSON.stringify(original)) {
      resultados.push([nombre, "FALLO: el tablero de entrada se modificó"]);
      continue;
    }
    if (esperado === "invalido") {
      const correcto =
        resultado.estado === ESTADOS.INVALIDO && resultado.pasos.length === 0;
      resultados.push([
        nombre,
        correcto
          ? "OK: invalido sin pasos"
          : `FALLO: ${resultado.estado} con ${resultado.pasos.length} pasos`,
      ]);
    } else {
      const correcto = resultado.estado !== ESTADOS.RESUELTO;
      resultados.push([
        nombre,
        correcto
          ? `OK: no se declara resuelto (estado ${resultado.estado}, ${resultado.pasos.length} pasos)`
          : "FALLO: se declara resuelto un puzzle sin solución",
      ]);
    }
  }
  return resultados;
}

// ------------------------------------------------------------
// Ejecución
// ------------------------------------------------------------

const rng = crearRng(SEED);
const entradas = [];
const generacion = { intentos: CANTIDAD, unicos: 0, vacias: [] };

for (let i = 0; i < CANTIDAD; i++) {
  const solucion = tableroResuelto(rng);
  if (!tableroEsValido(solucion)) fallo(`solución generada inválida (${i})`);
  const { puzzle, vacias } = crearPuzzleDeterminista(solucion, rng);
  if (!puzzle || vacias <= 0) fallo(`no se pudo generar el puzzle ${i}`);

  const soluciones = contarSoluciones(copiar(puzzle), 2);
  if (soluciones !== 1) fallo(`puzzle ${i} con ${soluciones} soluciones`);
  for (let fila = 0; fila < 9; fila++) {
    for (let columna = 0; columna < 9; columna++) {
      if (puzzle[fila][columna] !== 0 && puzzle[fila][columna] !== solucion[fila][columna]) {
        fallo(`pista incoherente en el puzzle ${i}`);
      }
    }
  }
  generacion.unicos++;
  generacion.vacias.push(vacias);
  entradas.push([`generado-${i}`, puzzle, solucion, "generado"]);
}

function nuevoOrigen() {
  return {
    tiempos: [],
    deducciones: [],
    estados: {
      [ESTADOS.RESUELTO]: 0,
      [ESTADOS.BLOQUEADO]: 0,
      [ESTADOS.INVALIDO]: 0,
    },
  };
}

const porOrigen = { generado: nuevoOrigen(), fixture: nuevoOrigen() };

const FIXTURES_UNICAS = [];
const FIXTURES_DESCARTADAS = [];
for (const [nombre, puzzle] of FIXTURES) {
  if (!tableroEsValido(puzzle)) fallo(`fixture inválido: ${nombre}`);
  if (contarSoluciones(copiar(puzzle), 2) !== 1) {
    FIXTURES_DESCARTADAS.push(nombre);
    continue;
  }
  FIXTURES_UNICAS.push([nombre, puzzle]);
}

const tiemposResolucion = [];
const tiemposClasificacion = [];
const deducciones = [];
const colocaciones = [];
const eliminacionesPasos = [];
const frecuencia = Object.fromEntries(
  DETECTORES.map(([tecnica]) => [tecnica, { pasos: 0, puzzles: 0 }])
);
const costeInicial = nuevoAcumulador();
const costePorPaso = nuevoAcumulador();
const estados = {
  [ESTADOS.RESUELTO]: 0,
  [ESTADOS.BLOQUEADO]: 0,
  [ESTADOS.INVALIDO]: 0,
};
const clasesIniciales = {
  [ESTADOS.RESUELTO]: 0,
  [ESTADOS.BLOQUEADO]: 0,
  [ESTADOS.RESOLUBLE]: 0,
  [ESTADOS.INVALIDO]: 0,
};
const fallos = [];

const entradasTodas = [
  ...entradas,
  ...FIXTURES_UNICAS.map(([nombre, puzzle]) => [
    nombre,
    puzzle,
    null,
    "fixture",
  ]),
];

for (const [nombre, puzzle, solucionConocida, origen] of entradasTodas) {
  const original = copiar(puzzle);
  const solucion = solucionConocida ?? resolverReferencia(puzzle);
  const claseInicial = clasificarTablero(puzzle);
  clasesIniciales[claseInicial]++;

  const inicioClasificacion = performance.now();
  clasificarTablero(puzzle);
  tiemposClasificacion.push(performance.now() - inicioClasificacion);

  medirDeteccionInicial(puzzle, costeInicial);

  const inicio = performance.now();
  const resultado = resolverLogico(puzzle);
  const tiempoResolucion = performance.now() - inicio;
  tiemposResolucion.push(tiempoResolucion);
  porOrigen[origen].tiempos.push(tiempoResolucion);

  if (JSON.stringify(puzzle) !== JSON.stringify(original)) {
    fallos.push(`${nombre}: el tablero original fue modificado`);
  }

  if (solucion === null) {
    fallos.push(`${nombre}: no se pudo obtener solución de referencia`);
    continue;
  }

  try {
    verificarPasos(puzzle, solucion, resultado);
  } catch (error) {
    fallos.push(`${nombre}: ${error.message}`);
  }

  medirDeteccionPorPaso(puzzle, resultado.pasos, costePorPaso);

  estados[resultado.estado] = (estados[resultado.estado] ?? 0) + 1;
  porOrigen[origen].estados[resultado.estado]++;
  porOrigen[origen].deducciones.push(resultado.pasos.length);
  deducciones.push(resultado.pasos.length);
  colocaciones.push(resultado.pasos.filter((p) => !p.eliminados).length);
  eliminacionesPasos.push(resultado.pasos.filter((p) => p.eliminados).length);

  const usadas = new Set();
  for (const paso of resultado.pasos) {
    frecuencia[paso.tecnica].pasos++;
    usadas.add(paso.tecnica);
  }
  for (const tecnica of usadas) frecuencia[tecnica].puzzles++;
}

function resolverReferencia(puzzle) {
  const copia = copiar(puzzle);
  const soluciones = [];
  resolverSudokuReferencia(copia, soluciones);
  return soluciones[0] ?? null;
}

function resolverSudokuReferencia(tablero, soluciones) {
  if (soluciones.length > 0) return;
  let fila = -1;
  let columna = -1;
  for (let f = 0; f < 9 && fila === -1; f++) {
    for (let c = 0; c < 9; c++) {
      if (tablero[f][c] === 0) {
        fila = f;
        columna = c;
        break;
      }
    }
  }
  if (fila === -1) {
    soluciones.push(copiar(tablero));
    return;
  }
  for (let numero = 1; numero <= 9; numero++) {
    if (esValido(tablero, fila, columna, numero)) {
      tablero[fila][columna] = numero;
      resolverSudokuReferencia(tablero, soluciones);
      tablero[fila][columna] = 0;
      if (soluciones.length > 0) return;
    }
  }
}

// ------------------------------------------------------------
// Informe
// ------------------------------------------------------------

const total = entradasTodas.length;
const stResolucion = estadisticas(tiemposResolucion);
const stClasificacion = estadisticas(tiemposClasificacion);
const stDeducciones = estadisticas(deducciones);
const stColocaciones = estadisticas(colocaciones);
const stEliminaciones = estadisticas(eliminacionesPasos);
const stVacias = estadisticas(generacion.vacias);
const sumaInicial = Object.values(costeInicial).reduce((s, v) => s + v.ms, 0);
const sumaPorPaso = Object.values(costePorPaso).reduce((s, v) => s + v.ms, 0);
const msQuadsInicial =
  costeInicial[TECNICAS.NAKED_QUAD].ms +
  costeInicial[TECNICAS.HIDDEN_QUAD].ms;
const msQuadsPorPaso =
  costePorPaso[TECNICAS.NAKED_QUAD].ms +
  costePorPaso[TECNICAS.HIDDEN_QUAD].ms;

console.log("=== Benchmark del solucionador lógico ===");
console.log(
  `Semilla: ${SEED} · puzzles generados: ${CANTIDAD} · fixtures únicos: ${FIXTURES_UNICAS.length}`
);
if (FIXTURES_DESCARTADAS.length > 0) {
  console.log(
    `Fixtures descartados por no tener solución única: ${FIXTURES_DESCARTADAS.join(", ")}`
  );
}
console.log(
  `Generación: rejilla completa por backtracking con RNG sembrado + vaciado codicioso ` +
    `determinista hasta ${OBJETIVO_VACIAS} vacías; unicidad comprobada con contarSoluciones.`
);
console.log(
  `Verificación de entradas: ${generacion.unicos}/${CANTIDAD} generados con solución única; ` +
    `${FIXTURES_UNICAS.length}/${FIXTURES.length} fixtures con solución única.`
);
console.log(
  `Vacías de los generados: media ${fmt(stVacias.media)}, mediana ${fmt(
    stVacias.mediana
  )}, mín ${Math.min(...generacion.vacias)}, máx ${Math.max(...generacion.vacias)}`
);
console.log("");
console.log(`Puzzles evaluados: ${total}`);
console.log(`  resueltos: ${estados[ESTADOS.RESUELTO]}`);
console.log(`  bloqueados: ${estados[ESTADOS.BLOQUEADO]}`);
console.log(`  inválidos: ${estados[ESTADOS.INVALIDO]}`);
console.log(
  `  otros/error: ${total -
    estados[ESTADOS.RESUELTO] -
    estados[ESTADOS.BLOQUEADO] -
    estados[ESTADOS.INVALIDO]}`
);
for (const [origen, datos] of Object.entries(porOrigen)) {
  const stats = estadisticas(datos.tiempos);
  const ded = estadisticas(datos.deducciones);
  console.log(
    `  ${origen.padEnd(9)} n=${datos.tiempos.length} · resueltos ${
      datos.estados[ESTADOS.RESUELTO]
    } · bloqueados ${datos.estados[ESTADOS.BLOQUEADO]} · inválidos ${
      datos.estados[ESTADOS.INVALIDO]
    } · tiempo medio ${fmt(stats.media)} ms · deducciones medias ${fmt(ded.media)}`
  );
}
console.log("");
console.log(
  `Tiempo resolverLogico (ms): media ${fmt(stResolucion.media)}, mediana ${fmt(
    stResolucion.mediana
  )}, máx ${fmt(stResolucion.maximo)}`
);
console.log(
  `Tiempo clasificarTablero (ms): media ${fmt(
    stClasificacion.media
  )}, mediana ${fmt(stClasificacion.mediana)}, máx ${fmt(stClasificacion.maximo)}`
);
console.log(
  `Deducciones por puzzle: media ${fmt(
    stDeducciones.media
  )}, mediana ${fmt(stDeducciones.mediana)}, máx ${stDeducciones.maximo}`
);
console.log(
  `  colocaciones: media ${fmt(stColocaciones.media)} · pasos de eliminación: media ${fmt(
    stEliminaciones.media
  )}`
);
console.log("");
console.log("Clasificación inicial con clasificarTablero:");
for (const [estado, n] of Object.entries(clasesIniciales)) {
  if (n > 0) console.log(`  ${estado}: ${n}`);
}
console.log("");
console.log("Frecuencia de técnicas (pasos / puzzles en que aparece):");
for (const [tecnica] of DETECTORES) {
  const { pasos, puzzles } = frecuencia[tecnica];
  console.log(
    `  ${tecnica.padEnd(14)} pasos ${String(pasos).padStart(5)} · puzzles ${String(
      puzzles
    ).padStart(4)} (${fmt((puzzles / total) * 100, 1)}%)`
  );
}
console.log("");
console.log(
  "Coste de detectores sobre el estado inicial (1 llamada por detector y puzzle):"
);
for (const [tecnica] of DETECTORES) {
  const { llamadas, ms } = costeInicial[tecnica];
  console.log(
    `  ${tecnica.padEnd(14)} ${fmt(ms, 2).padStart(8)} ms total · ${fmt(
      (ms / llamadas) * 1000,
      1
    ).padStart(7)} µs/llamada`
  );
}
console.log(
  `  Cuads (naked+hidden): ${fmt(msQuadsInicial, 2)} ms = ${fmt(
    sumaInicial === 0 ? 0 : (msQuadsInicial / sumaInicial) * 100,
    1
  )}% del coste medido de detectores`
);
console.log("");
console.log(
  "Coste estimado por paso (detectores hasta la técnica aplicada, sobre los estados visitados):"
);
for (const [tecnica] of DETECTORES) {
  const { llamadas, ms } = costePorPaso[tecnica];
  if (llamadas === 0) continue;
  console.log(
    `  ${tecnica.padEnd(14)} ${String(llamadas).padStart(6)} llamadas · ${fmt(
      ms,
      2
    ).padStart(8)} ms · ${fmt((ms / llamadas) * 1000, 1).padStart(7)} µs/llamada`
  );
}
console.log(
  `  Cuads (naked+hidden): ${fmt(msQuadsPorPaso, 2)} ms = ${fmt(
    sumaPorPaso === 0 ? 0 : (msQuadsPorPaso / sumaPorPaso) * 100,
    1
  )}% del coste estimado de detección`
);
console.log("");
console.log("Casos inválidos / insatisfacibles:");
for (const [nombre, resultado] of verificarInvalidos()) {
  console.log(`  ${nombre}: ${resultado}`);
}
console.log("");
if (fallos.length === 0) {
  console.log("Comprobaciones de corrección: 0 fallos.");
} else {
  console.log(`Comprobaciones de corrección: ${fallos.length} fallo(s):`);
  for (const fallo of fallos) console.log(`  - ${fallo}`);
  process.exitCode = 1;
}
