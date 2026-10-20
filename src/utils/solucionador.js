/**
 * ============================================================
 *  SUDOKU — Solucionador lógico (técnicas básicas)
 * ============================================================
 *  Evalúa un puzzle con deducción pura (naked y hidden singles),
 *  sin backtracking. Ninguna función de este módulo modifica el
 *  tablero recibido: resolverLogico trabaja siempre sobre una
 *  copia.
 * ============================================================
 */

import {
  TAMAÑO,
  TAMAÑO_CAJA,
  VALORES,
  buscarCasillaVacia,
  copiarTablero,
  esValido,
} from "./sudoku.js";

// Nombre de cada técnica registrada en los pasos
export const TECNICAS = {
  NAKED_SINGLE: "naked-single",
  HIDDEN_SINGLE: "hidden-single",
  NAKED_PAIR: "naked-pair",
  HIDDEN_PAIR: "hidden-pair",
  NAKED_TRIPLE: "naked-triple",
  HIDDEN_TRIPLE: "hidden-triple",
  NAKED_QUAD: "naked-quad",
  HIDDEN_QUAD: "hidden-quad",
};

// Estados posibles de un tablero según las técnicas disponibles
export const ESTADOS = {
  RESUELTO: "resuelto",
  RESOLUBLE: "resoluble",
  BLOQUEADO: "bloqueado",
  // Sin solución posible: números repetidos, valores fuera de rango,
  // estructura incorrecta o una casilla vacía sin candidatos.
  INVALIDO: "invalido",
};

/**
 * Números del 1 al 9 que pueden ocupar una casilla vacía,
 * según fila, columna y caja 3x3.
 * Devuelve [] si la casilla no está vacía.
 */
export function obtenerCandidatos(tablero, fila, columna) {
  if (tablero[fila][columna] !== 0) return [];
  return VALORES.filter((numero) => esValido(tablero, fila, columna, numero));
}

/**
 * Candidatos de una casilla descontando las eliminaciones registradas
 * por técnicas que NO colocan números (naked pairs). `eliminados` es un
 * Set de claves "fila,columna,numero"; si es null no se descuenta nada.
 */
function candidatosDe(tablero, fila, columna, eliminados) {
  const base = obtenerCandidatos(tablero, fila, columna);
  if (!eliminados || eliminados.size === 0 || base.length === 0) return base;
  return base.filter((numero) => !eliminados.has(`${fila},${columna},${numero}`));
}

/**
 * Casillas vacías con un único candidato (naked single).
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{fila: number, columna: number, numero: number, tecnica: string}[]}
 */
export function detectarNakedSingles(tablero, eliminados = null) {
  const singles = [];
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] !== 0) continue;
      const candidatos = candidatosDe(tablero, fila, columna, eliminados);
      if (candidatos.length === 1) {
        singles.push({
          fila,
          columna,
          numero: candidatos[0],
          tecnica: TECNICAS.NAKED_SINGLE,
        });
      }
    }
  }
  return singles;
}

/** Celdas [fila, columna] de cada fila, columna y caja. */
function construirUnidades() {
  const unidades = [];

  for (let fila = 0; fila < TAMAÑO; fila++) {
    unidades.push({
      tipo: "fila",
      celdas: Array.from({ length: TAMAÑO }, (_, columna) => [fila, columna]),
    });
  }

  for (let columna = 0; columna < TAMAÑO; columna++) {
    unidades.push({
      tipo: "columna",
      celdas: Array.from({ length: TAMAÑO }, (_, fila) => [fila, columna]),
    });
  }

  for (let inicioFila = 0; inicioFila < TAMAÑO; inicioFila += TAMAÑO_CAJA) {
    for (
      let inicioColumna = 0;
      inicioColumna < TAMAÑO;
      inicioColumna += TAMAÑO_CAJA
    ) {
      const celdas = [];
      for (let i = 0; i < TAMAÑO_CAJA; i++) {
        for (let j = 0; j < TAMAÑO_CAJA; j++) {
          celdas.push([inicioFila + i, inicioColumna + j]);
        }
      }
      unidades.push({ tipo: "caja", celdas });
    }
  }

  return unidades;
}

const UNIDADES = construirUnidades();

/**
 * Comprueba que el tablero tenga forma 9x9, valores enteros entre
 * 0 y 9 y ningún número repetido en fila, columna ni caja.
 * No valida que el tablero tenga solución, solo que cumple las
 * reglas básicas del Sudoku.
 */
export function tableroEsValido(tablero) {
  if (!Array.isArray(tablero) || tablero.length !== TAMAÑO) return false;

  for (const fila of tablero) {
    if (!Array.isArray(fila) || fila.length !== TAMAÑO) return false;
    for (const valor of fila) {
      if (!Number.isInteger(valor) || valor < 0 || valor > 9) return false;
    }
  }

  for (const { celdas } of UNIDADES) {
    const vistos = new Set();
    for (const [fila, columna] of celdas) {
      const valor = tablero[fila][columna];
      if (valor === 0) continue;
      if (vistos.has(valor)) return false;
      vistos.add(valor);
    }
  }

  return true;
}

/**
 * Detecta casillas vacías sin ningún candidato: el tablero no
 * tiene solución aunque no haya números repetidos.
 */
function hayCasillaSinCandidatos(tablero, eliminados = null) {
  for (let fila = 0; fila < TAMAÑO; fila++) {
    for (let columna = 0; columna < TAMAÑO; columna++) {
      if (tablero[fila][columna] !== 0) continue;
      if (candidatosDe(tablero, fila, columna, eliminados).length === 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Números que solo pueden ocupar UNA casilla vacía dentro de una
 * fila, columna o caja (hidden single). Se contemplan todas las
 * casillas vacías, incluidas las que son naked singles: una celda
 * naked sigue siendo destino posible de otros números y excluiría
 * colocaciones reales. Si la misma casilla es hidden single en más
 * de una unidad se registra una sola vez.
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{fila: number, columna: number, numero: number, tecnica: string, unidad: string}[]}
 */
export function detectarHiddenSingles(tablero, eliminados = null) {
  const singles = [];
  const registrados = new Set();

  for (const { tipo, celdas } of UNIDADES) {
    for (const numero of VALORES) {
      const posibles = celdas.filter(
        ([fila, columna]) =>
          tablero[fila][columna] === 0 &&
          candidatosDe(tablero, fila, columna, eliminados).includes(numero)
      );
      if (posibles.length !== 1) continue;

      const [fila, columna] = posibles[0];
      const clave = `${fila},${columna},${numero}`;
      if (registrados.has(clave)) continue;
      registrados.add(clave);

      singles.push({
        fila,
        columna,
        numero,
        tecnica: TECNICAS.HIDDEN_SINGLE,
        unidad: tipo,
      });
    }
  }

  return singles;
}

/**
 * Pares desnudos: dos casillas vacías de una misma fila, columna o
 * caja cuyos candidatos son exactamente los mismos dos números. Esos
 * dos números quedan "reservados" a esas dos casillas, por lo que se
 * eliminan del resto de casillas de la unidad.
 *
 * No coloca ningún número: solo elimina candidatos.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]} Cada par detectado. `eliminados` puede quedar vacío si el par
 *   no descarta ningún candidato de la unidad.
 */
export function detectarNakedPares(tablero, eliminados = null) {
  const pares = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    // Solo pueden formar par las casillas con exactamente dos candidatos
    const bicelda = vacias.filter((celda) => celda.candidatos.length === 2);

    for (let i = 0; i < bicelda.length; i++) {
      for (let j = i + 1; j < bicelda.length; j++) {
        const a = bicelda[i];
        const b = bicelda[j];
        if (
          a.candidatos[0] !== b.candidatos[0] ||
          a.candidatos[1] !== b.candidatos[1]
        ) {
          continue;
        }

        const candidatos = a.candidatos;
        const descartes = [];
        for (const otra of vacias) {
          if (otra === a || otra === b) continue;
          for (const numero of candidatos) {
            if (otra.candidatos.includes(numero)) {
              descartes.push([otra.fila, otra.columna, numero]);
            }
          }
        }

        pares.push({
          tecnica: TECNICAS.NAKED_PAIR,
          unidad: tipo,
          celdas: [
            [a.fila, a.columna],
            [b.fila, b.columna],
          ],
          candidatos: [...candidatos],
          eliminados: descartes,
        });
      }
    }
  }

  return pares;
}

/**
 * Tríos desnudos: tres casillas vacías de una misma fila, columna o
 * caja 3×3 cuyo conjunto combinado de candidatos son exactamente tres
 * números distintos (por ejemplo {1,2}, {2,3} y {1,3}). Esos tres
 * números quedan "reservados" a esas tres casillas, por lo que se
 * eliminan del resto de casillas de la unidad.
 *
 * Solo participan casillas con dos o tres candidatos: una casilla con
 * un único candidato es un naked single y no forma parte de un trío.
 *
 * No coloca ningún número: solo elimina candidatos.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]} Cada trío detectado. `eliminados` puede quedar vacío si el trío
 *   no descarta ningún candidato de la unidad.
 */
export function detectarNakedTriples(tablero, eliminados = null) {
  const triples = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    // Solo pueden formar trío las casillas con dos o tres candidatos
    const multicelda = vacias.filter(
      (celda) => celda.candidatos.length >= 2 && celda.candidatos.length <= 3
    );

    for (let i = 0; i < multicelda.length; i++) {
      for (let j = i + 1; j < multicelda.length; j++) {
        for (let k = j + 1; k < multicelda.length; k++) {
          const grupo = [multicelda[i], multicelda[j], multicelda[k]];
          const candidatos = [
            ...new Set(grupo.flatMap((celda) => celda.candidatos)),
          ].sort((a, b) => a - b);

          // El conjunto combinado debe tener exactamente tres números
          if (candidatos.length !== 3) continue;

          const descartes = [];
          for (const otra of vacias) {
            if (grupo.includes(otra)) continue;
            for (const numero of candidatos) {
              if (otra.candidatos.includes(numero)) {
                descartes.push([otra.fila, otra.columna, numero]);
              }
            }
          }

          triples.push({
            tecnica: TECNICAS.NAKED_TRIPLE,
            unidad: tipo,
            celdas: grupo.map((celda) => [celda.fila, celda.columna]),
            candidatos,
            eliminados: descartes,
          });
        }
      }
    }
  }

  return triples;
}

/**
 * Cuartetos desnudos: cuatro casillas vacías de una misma fila, columna
 * o caja 3×3 cuyo conjunto combinado de candidatos son exactamente
 * cuatro números distintos. Cada casilla puede contener un subconjunto
 * de esos cuatro números (por ejemplo {1,2}, {2,3}, {1,4} y {3,4}).
 * Esos cuatro números quedan "reservados" a esas cuatro casillas, por
 * lo que se eliminan del resto de casillas de la unidad.
 *
 * Solo participan casillas con dos, tres o cuatro candidatos: una
 * casilla con un único candidato es un naked single y no forma parte
 * de un cuarteto.
 *
 * No coloca ningún número: solo elimina candidatos. Tampoco devuelve
 * cuartetos que no produzcan ninguna eliminación efectiva.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]} Cada cuarteto detectado con al menos una eliminación real.
 */
export function detectarNakedQuads(tablero, eliminados = null) {
  const quads = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    // Solo pueden formar cuarteto las casillas con dos a cuatro candidatos
    const multicelda = vacias.filter(
      (celda) => celda.candidatos.length >= 2 && celda.candidatos.length <= 4
    );

    for (let i = 0; i < multicelda.length; i++) {
      for (let j = i + 1; j < multicelda.length; j++) {
        for (let k = j + 1; k < multicelda.length; k++) {
          for (let l = k + 1; l < multicelda.length; l++) {
            const grupo = [
              multicelda[i],
              multicelda[j],
              multicelda[k],
              multicelda[l],
            ];
            const candidatos = [
              ...new Set(grupo.flatMap((celda) => celda.candidatos)),
            ].sort((a, b) => a - b);

            // El conjunto combinado debe tener exactamente cuatro números
            if (candidatos.length !== 4) continue;

            const descartes = [];
            for (const otra of vacias) {
              if (grupo.includes(otra)) continue;
              for (const numero of candidatos) {
                if (otra.candidatos.includes(numero)) {
                  descartes.push([otra.fila, otra.columna, numero]);
                }
              }
            }

            // Sin eliminaciones reales no hay deducción que registrar
            if (descartes.length === 0) continue;

            quads.push({
              tecnica: TECNICAS.NAKED_QUAD,
              unidad: tipo,
              celdas: grupo.map((celda) => [celda.fila, celda.columna]),
              candidatos,
              eliminados: descartes,
            });
          }
        }
      }
    }
  }

  return quads;
}

/**
 * Pares ocultos: dos números distintos que, dentro de una misma fila,
 * columna o caja 3×3, pueden colocarse únicamente en las mismas dos
 * casillas vacías. En esas dos casillas, se eliminan todos los candidatos
 * distintos de los dos números del par.
 *
 * No coloca ningún número: solo elimina candidatos.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras técnicas
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]}
 */
export function detectarHiddenPares(tablero, eliminados = null) {
  const pares = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    if (vacias.length < 2) continue;

    // Para cada par de números, ¿solo pueden ir en las mismas dos casillas?
    for (let n1 = 1; n1 <= TAMAÑO; n1++) {
      const conN1 = vacias.filter((celda) => celda.candidatos.includes(n1));
      if (conN1.length !== 2) continue;

      for (let n2 = n1 + 1; n2 <= TAMAÑO; n2++) {
        const conN2 = vacias.filter((celda) => celda.candidatos.includes(n2));
        if (conN2.length !== 2) continue;

        // Deben ser exactamente las mismas dos casillas
        const [a, b] = conN1;
        const [c, d] = conN2;
        const mismas =
          (a.fila === c.fila &&
            a.columna === c.columna &&
            b.fila === d.fila &&
            b.columna === d.columna) ||
          (a.fila === d.fila &&
            a.columna === d.columna &&
            b.fila === c.fila &&
            b.columna === c.columna);
        if (!mismas) continue;

        // En esas dos casillas, descartar todo candidato que no sea
        // uno de los dos números del par
        const descartes = [];
        for (const celda of [a, b]) {
          for (const numero of celda.candidatos) {
            if (numero !== n1 && numero !== n2) {
              descartes.push([celda.fila, celda.columna, numero]);
            }
          }
        }

        pares.push({
          tecnica: TECNICAS.HIDDEN_PAIR,
          unidad: tipo,
          celdas: [
            [a.fila, a.columna],
            [b.fila, b.columna],
          ],
          candidatos: [n1, n2],
          eliminados: descartes,
        });
      }
    }
  }

  return pares;
}

/**
 * Tríos ocultos: tres números distintos que, dentro de una misma fila,
 * columna o caja 3×3, pueden colocarse únicamente en las mismas tres
 * casillas vacías. Esas casillas pueden admitir candidatos adicionales,
 * pero los tres números del trío quedan restringidos a ellas, por lo que
 * se eliminan de las tres casillas todos los candidatos que no sean uno
 * de los tres números del trío.
 *
 * No coloca ningún número: solo elimina candidatos.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]} Cada trío detectado. `eliminados` puede quedar vacío si el trío
 *   no descarta ningún candidato.
 */
export function detectarHiddenTriples(tablero, eliminados = null) {
  const triples = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    if (vacias.length < 3) continue;

    for (let n1 = 1; n1 <= TAMAÑO; n1++) {
      const conN1 = vacias.filter((celda) => celda.candidatos.includes(n1));
      if (conN1.length === 0) continue;

      for (let n2 = n1 + 1; n2 <= TAMAÑO; n2++) {
        const conN2 = vacias.filter((celda) => celda.candidatos.includes(n2));
        if (conN2.length === 0) continue;

        for (let n3 = n2 + 1; n3 <= TAMAÑO; n3++) {
          const conN3 = vacias.filter((celda) => celda.candidatos.includes(n3));
          if (conN3.length === 0) continue;

          // Unión de las casillas donde cabe alguno de los tres números
          const unicas = new Map();
          for (const celda of [...conN1, ...conN2, ...conN3]) {
            unicas.set(`${celda.fila},${celda.columna}`, celda);
          }
          // Los tres números deben quedar restringidos a tres casillas
          if (unicas.size !== 3) continue;

          // Esas tres casillas solo pueden alojar el trío: se descartan
          // de ellas los candidatos ajenos a los tres números.
          const grupo = [...unicas.values()].sort(
            (a, b) => a.fila - b.fila || a.columna - b.columna
          );
          const descartes = [];
          for (const celda of grupo) {
            for (const numero of celda.candidatos) {
              if (numero !== n1 && numero !== n2 && numero !== n3) {
                descartes.push([celda.fila, celda.columna, numero]);
              }
            }
          }

          triples.push({
            tecnica: TECNICAS.HIDDEN_TRIPLE,
            unidad: tipo,
            celdas: grupo.map((celda) => [celda.fila, celda.columna]),
            candidatos: [n1, n2, n3],
            eliminados: descartes,
          });
        }
      }
    }
  }

  return triples;
}

/**
 * Cuartetos ocultos: cuatro números distintos que, dentro de una misma
 * fila, columna o caja 3×3, pueden colocarse únicamente en las mismas
 * cuatro casillas vacías. Esas casillas pueden admitir candidatos
 * adicionales, pero los cuatro números del cuarteto quedan restringidos
 * a ellas, por lo que se eliminan de las cuatro casillas todos los
 * candidatos que no sean uno de los cuatro números del cuarteto.
 *
 * No coloca ningún número: solo elimina candidatos. Tampoco devuelve
 * cuartetos que no produzcan ninguna eliminación efectiva.
 *
 * @param {Set<string>} [eliminados] - Candidatos descartados por otras
 *   técnicas; se descuentan al calcular los candidatos.
 * @returns {{
 *   tecnica: string,
 *   unidad: string,
 *   celdas: [number, number][],
 *   candidatos: number[],
 *   eliminados: [number, number, number][]
 * }[]} Cada cuarteto detectado con al menos una eliminación real.
 */
export function detectarHiddenQuads(tablero, eliminados = null) {
  const quads = [];

  for (const { tipo, celdas } of UNIDADES) {
    // Candidatos de todas las casillas vacías de la unidad
    const vacias = celdas
      .filter(([fila, columna]) => tablero[fila][columna] === 0)
      .map(([fila, columna]) => ({
        fila,
        columna,
        candidatos: candidatosDe(tablero, fila, columna, eliminados),
      }));

    if (vacias.length < 4) continue;

    for (let n1 = 1; n1 <= TAMAÑO; n1++) {
      const conN1 = vacias.filter((celda) => celda.candidatos.includes(n1));
      if (conN1.length === 0) continue;

      for (let n2 = n1 + 1; n2 <= TAMAÑO; n2++) {
        const conN2 = vacias.filter((celda) => celda.candidatos.includes(n2));
        if (conN2.length === 0) continue;

        for (let n3 = n2 + 1; n3 <= TAMAÑO; n3++) {
          const conN3 = vacias.filter((celda) => celda.candidatos.includes(n3));
          if (conN3.length === 0) continue;

          for (let n4 = n3 + 1; n4 <= TAMAÑO; n4++) {
            const conN4 = vacias.filter((celda) =>
              celda.candidatos.includes(n4)
            );
            if (conN4.length === 0) continue;

            // Unión de las casillas donde cabe alguno de los cuatro números
            const unicas = new Map();
            for (const celda of [...conN1, ...conN2, ...conN3, ...conN4]) {
              unicas.set(`${celda.fila},${celda.columna}`, celda);
            }
            // Los cuatro números deben quedar restringidos a cuatro casillas
            if (unicas.size !== 4) continue;

            // Esas cuatro casillas solo pueden alojar el cuarteto: se
            // descartan de ellas los candidatos ajenos a los cuatro números.
            const grupo = [...unicas.values()].sort(
              (a, b) => a.fila - b.fila || a.columna - b.columna
            );
            const descartes = [];
            for (const celda of grupo) {
              for (const numero of celda.candidatos) {
                if (
                  numero !== n1 &&
                  numero !== n2 &&
                  numero !== n3 &&
                  numero !== n4
                ) {
                  descartes.push([celda.fila, celda.columna, numero]);
                }
              }
            }

            // Sin eliminaciones reales no hay deducción que registrar
            if (descartes.length === 0) continue;

            quads.push({
              tecnica: TECNICAS.HIDDEN_QUAD,
              unidad: tipo,
              celdas: grupo.map((celda) => [celda.fila, celda.columna]),
              candidatos: [n1, n2, n3, n4],
              eliminados: descartes,
            });
          }
        }
      }
    }
  }

  return quads;
}

/**
 * Clasificación interna que, a diferencia de clasificarTablero,
 * descuenta los candidatos ya eliminados (por naked/hidden pairs,
 * naked/hidden triples y naked quads) y tiene en cuenta si queda alguna
 * técnica de eliminación aplicable. Es la que usa resolverLogico para
 * decidir si aún puede avanzar.
 */
function clasificarConEliminaciones(tablero, eliminados) {
  if (!tableroEsValido(tablero)) return ESTADOS.INVALIDO;
  if (buscarCasillaVacia(tablero) === null) return ESTADOS.RESUELTO;
  if (hayCasillaSinCandidatos(tablero, eliminados)) return ESTADOS.INVALIDO;
  if (detectarNakedSingles(tablero, eliminados).length > 0) {
    return ESTADOS.RESOLUBLE;
  }
  if (detectarHiddenSingles(tablero, eliminados).length > 0) {
    return ESTADOS.RESOLUBLE;
  }
  const pares = detectarNakedPares(tablero, eliminados);
  if (pares.some((par) => par.eliminados.length > 0)) {
    return ESTADOS.RESOLUBLE;
  }
  const paresOcultos = detectarHiddenPares(tablero, eliminados);
  if (paresOcultos.some((par) => par.eliminados.length > 0)) {
    return ESTADOS.RESOLUBLE;
  }
  const triples = detectarNakedTriples(tablero, eliminados);
  if (triples.some((triple) => triple.eliminados.length > 0)) {
    return ESTADOS.RESOLUBLE;
  }
  const triplesOcultos = detectarHiddenTriples(tablero, eliminados);
  if (triplesOcultos.some((triple) => triple.eliminados.length > 0)) {
    return ESTADOS.RESOLUBLE;
  }
  if (detectarNakedQuads(tablero, eliminados).length > 0) {
    return ESTADOS.RESOLUBLE;
  }
  if (detectarHiddenQuads(tablero, eliminados).length > 0) {
    return ESTADOS.RESOLUBLE;
  }
  return ESTADOS.BLOQUEADO;
}

/**
 * Estado del tablero según las técnicas de single disponibles:
 * - "invalido":   incumple las reglas (repetidos, valores fuera de
 *                 rango, estructura) o tiene una casilla vacía sin
 *                 candidatos, así que no tiene solución posible.
 * - "resuelto":   completo y sin números repetidos.
 * - "resoluble":  al menos un single (naked u hidden) se puede aplicar.
 * - "bloqueado":  quedan vacías pero ningún single aplica.
 *
 * Es una clasificación basada solo en el tablero (sin estado de
 * candidatos eliminados), por lo que las técnicas de pares (desnudos
 * u ocultos) no la alteran: esas técnicas se aplican en resolverLogico,
 * que sí conserva las eliminaciones entre iteraciones.
 */
export function clasificarTablero(tablero) {
  if (!tableroEsValido(tablero)) return ESTADOS.INVALIDO;
  if (buscarCasillaVacia(tablero) === null) return ESTADOS.RESUELTO;
  if (hayCasillaSinCandidatos(tablero)) return ESTADOS.INVALIDO;
  if (detectarNakedSingles(tablero).length > 0) return ESTADOS.RESOLUBLE;
  if (detectarHiddenSingles(tablero).length > 0) return ESTADOS.RESOLUBLE;
  return ESTADOS.BLOQUEADO;
}

/**
 * Aplica técnicas hasta que no quede ninguna disponible. Prioridad:
 * naked singles, hidden singles y, si no hay singles, naked pairs,
 * luego hidden pairs, luego naked triples, luego hidden triples, luego
 * naked quads y por último hidden quads (las técnicas de eliminación
 * quitan candidatos y pueden habilitar nuevos singles).
 * Recalcula los candidatos tras cada deducción, de modo que cada paso
 * se valida contra el tablero actual: nunca coloca un número que rompa
 * las reglas. Si el tablero de entrada es inválido o contradictorio no
 * aplica ningún paso.
 *
 * Se aplica UNA sola deducción por iteración. Las técnicas de
 * eliminación no colocan números: solo registran candidatos
 * eliminados, que se conservan entre iteraciones para que los singles
 * habilitados por una eliminación se detecten en una iteración
 * posterior. Nunca se registra una técnica cuyas eliminaciones no
 * cambien nada.
 *
 * El tablero recibido NUNCA se modifica: se trabaja sobre una copia.
 *
 * @param {number[][]} tablero
 * @returns {{estado: string, pasos: object[], tablero: number[][]}}
 *   estado: "resuelto" | "bloqueado" | "invalido"; pasos: técnica
 *   aplicada en cada iteración, en orden (los singles colocan un
 *   número; los pares y tríos registran candidatos eliminados).
 */
export function resolverLogico(tablero) {
  const copia = copiarTablero(tablero);
  const pasos = [];
  const eliminados = new Set();

  let estado = clasificarConEliminaciones(copia, eliminados);
  while (estado === ESTADOS.RESOLUBLE) {
    const naked = detectarNakedSingles(copia, eliminados);

    if (naked.length > 0) {
      const paso = naked[0];
      copia[paso.fila][paso.columna] = paso.numero;
      pasos.push(paso);
    } else {
      const hidden = detectarHiddenSingles(copia, eliminados);

      if (hidden.length > 0) {
        const paso = hidden[0];
        copia[paso.fila][paso.columna] = paso.numero;
        pasos.push(paso);
      } else {
        // Sin singles: aplicar la técnica de eliminación efectiva de
        // mayor prioridad (naked pair → hidden pair → naked triple →
        // hidden triple → naked quad → hidden quad). Si ninguna elimina
        // candidatos, la clasificación no habría devuelto "resoluble" y
        // el bucle ya habría terminado.
        let deduccion = detectarNakedPares(copia, eliminados).find(
          (p) => p.eliminados.length > 0
        );
        if (!deduccion) {
          deduccion = detectarHiddenPares(copia, eliminados).find(
            (p) => p.eliminados.length > 0
          );
        }
        if (!deduccion) {
          deduccion = detectarNakedTriples(copia, eliminados).find(
            (t) => t.eliminados.length > 0
          );
        }
        if (!deduccion) {
          deduccion = detectarHiddenTriples(copia, eliminados).find(
            (t) => t.eliminados.length > 0
          );
        }
        if (!deduccion) {
          deduccion = detectarNakedQuads(copia, eliminados).find(
            (q) => q.eliminados.length > 0
          );
        }
        if (!deduccion) {
          deduccion = detectarHiddenQuads(copia, eliminados).find(
            (q) => q.eliminados.length > 0
          );
        }
        if (!deduccion) break;

        for (const [fila, columna, numero] of deduccion.eliminados) {
          eliminados.add(`${fila},${columna},${numero}`);
        }
        pasos.push(deduccion);
      }
    }

    estado = clasificarConEliminaciones(copia, eliminados);
  }

  return { estado, pasos, tablero: copia };
}
