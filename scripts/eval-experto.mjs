// Script de evaluación (no forma parte de la producción).
// Uso: node scripts/eval-experto.mjs [cantidad] [objetivo]
import {
  DIFICULTADES,
  copiarTablero,
  contarSoluciones,
  crearPuzzle,
  generarTableroResuelto,
} from "../src/utils/sudoku.js";

const cantidad = Number(process.argv[2] ?? 100);
const objetivo = Number(process.argv[3] ?? DIFICULTADES.experto);

const vaciasDe = (tablero) =>
  tablero.flat().filter((v) => v === 0).length;

const histograma = new Map();
const vaciasLista = [];
const tiempos = [];
let alcanzaron = 0;
let unicas = 0;

for (let i = 0; i < cantidad; i++) {
  const resuelto = generarTableroResuelto();

  const t0 = performance.now();
  const puzzle = crearPuzzle(resuelto, objetivo);
  tiempos.push(performance.now() - t0);

  const vacias = vaciasDe(puzzle);
  vaciasLista.push(vacias);
  if (vacias >= objetivo) alcanzaron++;

  histograma.set(vacias, (histograma.get(vacias) ?? 0) + 1);

  const verificacion = contarSoluciones(copiarTablero(puzzle), 2);
  if (verificacion === 1) unicas++;
  else console.error(`¡Puzzle ${i} con ${verificacion} soluciones!`);
}

const media = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const orden = [...histograma.entries()].sort((a, b) => a[0] - b[0]);

console.log(`--- Evaluación de ${cantidad} puzzles (objetivo ${objetivo} vacías) ---`);
console.log(`Vacías: media ${media(vaciasLista).toFixed(2)}, min ${Math.min(...vaciasLista)}, max ${Math.max(...vaciasLista)}`);
console.log(`Alcanzaron el objetivo: ${alcanzaron} (${((alcanzaron / cantidad) * 100).toFixed(1)}%)`);
console.log(`Quedaron por debajo:    ${cantidad - alcanzaron} (${(((cantidad - alcanzaron) / cantidad) * 100).toFixed(1)}%)`);
console.log(`Solución única:         ${unicas}/${cantidad}`);
console.log(`Tiempo: media ${media(tiempos).toFixed(1)} ms, max ${Math.max(...tiempos).toFixed(1)} ms, total ${tiempos.reduce((s, v) => s + v, 0).toFixed(0)} ms`);
console.log("Histograma (vacías → cantidad):");
for (const [v, n] of orden) console.log(`  ${String(v).padStart(2)}: ${"#".repeat(Math.min(n, 60))} (${n})`);
