// Busca fixtures válidos para hidden pairs usando el solucionador real.
import {
  detectarHiddenPares,
  detectarHiddenSingles,
  detectarNakedPares,
  detectarNakedSingles,
  obtenerCandidatos,
  resolverLogico,
  tableroEsValido,
  TECNICAS,
} from "../src/utils/solucionador.js";

const SOLUCION = [
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

function clone(b) {
  return b.map((r) => [...r]);
}

function clearCells(board, cells) {
  const b = clone(board);
  for (const [f, c] of cells) b[f][c] = 0;
  return b;
}

// Determinista: limpiar distintos subconjuntos y evaluar
const candidatosClears = [];
// Caja 0 completa
candidatosClears.push({
  nombre: "caja0",
  cells: [
    [0, 0], [0, 1], [0, 2],
    [1, 0], [1, 1], [1, 2],
    [2, 0], [2, 1], [2, 2],
  ],
});
// Fila 0 completa
candidatosClears.push({
  nombre: "fila0",
  cells: Array.from({ length: 9 }, (_, c) => [0, c]),
});
// Fila 0 + fila 1
candidatosClears.push({
  nombre: "fila0+1",
  cells: [
    ...Array.from({ length: 9 }, (_, c) => [0, c]),
    ...Array.from({ length: 9 }, (_, c) => [1, c]),
  ],
});
// Filas 0,1,2 columnas 0-4
candidatosClears.push({
  nombre: "3filas5col",
  cells: [
    ...[0, 1, 2].flatMap((f) => [0, 1, 2, 3, 4].map((c) => [f, c])),
  ],
});
// 4x4 esquina superior izquierda
candidatosClears.push({
  nombre: "4x4",
  cells: [
    ...[0, 1, 2, 3].flatMap((f) => [0, 1, 2, 3].map((c) => [f, c])),
  ],
});
// 5x5 esquina
candidatosClears.push({
  nombre: "5x5",
  cells: [
    ...[0, 1, 2, 3, 4].flatMap((f) => [0, 1, 2, 3, 4].map((c) => [f, c])),
  ],
});
// Filas 0-2 + cols 0-5 (2 cajas)
candidatosClears.push({
  nombre: "2cajas",
  cells: [
    ...[0, 1, 2].flatMap((f) => [0, 1, 2, 3, 4, 5].map((c) => [f, c])),
  ],
});
// Todo tablero menos fila 8
candidatosClears.push({
  nombre: "8filas",
  cells: [
    ...[0, 1, 2, 3, 4, 5, 6, 7].flatMap((f) =>
      [0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => [f, c])
    ),
  ],
});

for (const { nombre, cells } of candidatosClears) {
  const board = clearCells(SOLUCION, cells);
  if (!tableroEsValido(board)) {
    console.log(nombre, "INVALIDO");
    continue;
  }
  const ns = detectarNakedSingles(board).length;
  const hs = detectarHiddenSingles(board).length;
  const np = detectarNakedPares(board).filter((p) => p.eliminados.length > 0).length;
  const hp = detectarHiddenPares(board);
  const hpCon = hp.filter((p) => p.eliminados.length > 0);
  console.log(
    `${nombre}: ns=${ns} hs=${hs} npElim=${np} hpTotal=${hp.length} hpElim=${hpCon.length}`
  );
  for (const p of hpCon.slice(0, 5)) {
    console.log(
      `  ${p.unidad} [${p.candidatos}] celdas=${JSON.stringify(p.celdas)} elim=${JSON.stringify(p.eliminados)}`
    );
  }
}
