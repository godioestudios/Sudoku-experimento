// Benchmark reproducible de generación por dificultad lógica.
// Uso: node scripts/benchmark-dificultad-logica.mjs [intentos=15] [semillaBase=benchmark-v1] [archivoJson]
// El archivo JSON es opcional y no se sobrescribe si ya existe.
import { existsSync, writeFileSync } from "node:fs";

import { generarPartida } from "../src/utils/generador.js";
import { copiarTablero, contarSoluciones } from "../src/utils/sudoku.js";

const intentos = Number(process.argv[2] ?? 15);
const semillaBase = process.argv[3] ?? "benchmark-v1";
const archivoSalida = process.argv[4] ?? null;
const niveles = ["facil", "medio", "dificil", "experto"];

if (!Number.isSafeInteger(intentos) || intentos < 1) {
  throw new TypeError("intentos debe ser un entero positivo");
}
if (archivoSalida && existsSync(archivoSalida)) {
  throw new Error(`No se sobrescribe el resultado existente: ${archivoSalida}`);
}

const media = (valores) =>
  valores.reduce((total, valor) => total + valor, 0) / valores.length;
const mediana = (valores) => {
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  return orden.length % 2 === 0
    ? (orden[medio - 1] + orden[medio]) / 2
    : orden[medio];
};
const percentil = (valores, p) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor(orden.length * p))];
};

const semillas = Array.from(
  { length: intentos },
  (_, indice) => `${semillaBase}:${indice}`
);

function diagnosticoDeterminista(diagnostico) {
  const {
    semillas: cantidadSemillas,
    semillasInterrumpidas,
    intercambios,
    evaluaciones,
    rechazosUnicidad,
    verificacionesUnicidad,
    nodosUnicidad,
    interrupcionesUnicidad,
    motivoAgotamiento,
  } = diagnostico;
  return {
    semillas: cantidadSemillas,
    semillasInterrumpidas,
    intercambios,
    evaluaciones,
    rechazosUnicidad,
    verificacionesUnicidad,
    nodosUnicidad,
    interrupcionesUnicidad,
    motivoAgotamiento,
  };
}

function resumirNivel(nivel) {
  const ejecuciones = semillas.map((semilla) => {
    const inicio = performance.now();
    const partida = generarPartida(nivel, { semilla });
    const tiempoMs = performance.now() - inicio;
    const dificultad = partida.dificultadLogica;

    return {
      semilla,
      tiempoMs,
      tableroSolucion: partida.tableroSolucion.flat().join(""),
      puzzle: partida.tableroJuego.flat().join(""),
      etiqueta: dificultad.etiqueta,
      estado: dificultad.estado,
      alcanzada: dificultad.alcanzada,
      evaluada: dificultad.estado !== "sin-evaluar",
      unica: contarSoluciones(copiarTablero(partida.tableroJuego), 2) === 1,
      diagnostico: diagnosticoDeterminista(dificultad.diagnostico),
    };
  });

  const tiempos = ejecuciones.map((ejecucion) => ejecucion.tiempoMs);
  const agotamientos = new Map();
  const etiquetas = new Map();
  for (const ejecucion of ejecuciones) {
    const motivo = ejecucion.diagnostico.motivoAgotamiento ?? null;
    agotamientos.set(motivo, (agotamientos.get(motivo) ?? 0) + 1);
    etiquetas.set(
      ejecucion.etiqueta,
      (etiquetas.get(ejecucion.etiqueta) ?? 0) + 1
    );
  }

  const suma = (campo) =>
    ejecuciones.reduce((total, ejecucion) => total + ejecucion.diagnostico[campo], 0);
  const exactos = ejecuciones.filter((ejecucion) => ejecucion.alcanzada).length;
  const sinEvaluar = ejecuciones.filter((ejecucion) => !ejecucion.evaluada).length;
  const unicos = ejecuciones.filter((ejecucion) => ejecucion.unica).length;

  return {
    nivel,
    ejecuciones,
    resumen: {
      intentos,
      exactos,
      porcentajeExactos: (exactos / intentos) * 100,
      unicos,
      sinEvaluar,
      tiemposMs: {
        media: media(tiempos),
        mediana: mediana(tiempos),
        p95: percentil(tiempos, 0.95),
        maximo: Math.max(...tiempos),
      },
      evaluacionesLogicas: suma("evaluaciones"),
      verificacionesUnicidad: suma("verificacionesUnicidad"),
      nodosUnicidad: suma("nodosUnicidad"),
      interrupcionesUnicidad: suma("interrupcionesUnicidad"),
      agotamientos: {
        tiempo: agotamientos.get("tiempo") ?? 0,
        nodos: agotamientos.get("nodos") ?? 0,
        evaluaciones: agotamientos.get("evaluaciones") ?? 0,
        sinAgotar: agotamientos.get(null) ?? 0,
      },
      etiquetas: Object.fromEntries(etiquetas),
    },
  };
}

const resultados = niveles.map(resumirNivel);
for (const { nivel, resumen } of resultados) {
  console.log(`--- ${nivel} (${resumen.intentos} intentos) ---`);
  console.log(
    `Aciertos exactos: ${resumen.exactos}/${resumen.intentos} ` +
      `(${resumen.porcentajeExactos.toFixed(1)}%) · únicos verificados ${resumen.unicos}`
  );
  console.log(
    `Tiempo: media ${resumen.tiemposMs.media.toFixed(0)} ms · ` +
      `mediana ${resumen.tiemposMs.mediana.toFixed(0)} ms · ` +
      `p95 ${resumen.tiemposMs.p95.toFixed(0)} ms · ` +
      `máx ${resumen.tiemposMs.maximo.toFixed(0)} ms`
  );
  console.log(
    `Lógica: ${resumen.evaluacionesLogicas} evaluaciones · ` +
      `${resumen.sinEvaluar} sin evaluación`
  );
  console.log(
    `Unicidad: ${resumen.verificacionesUnicidad} comprobaciones · ` +
      `${resumen.nodosUnicidad} nodos · ` +
      `${resumen.interrupcionesUnicidad} interrupciones de unicidad`
  );
  console.log(
    `Presupuesto: tiempo ${resumen.agotamientos.tiempo} · ` +
      `nodos ${resumen.agotamientos.nodos} · ` +
      `evaluaciones ${resumen.agotamientos.evaluaciones} · ` +
      `sin agotar ${resumen.agotamientos.sinAgotar}`
  );
  console.log(
    "Etiquetas: " +
      Object.entries(resumen.etiquetas)
        .map(([etiqueta, cantidad]) => `${etiqueta} ${cantidad}`)
        .join(" · ")
  );
}

const reporte = { semillaBase, semillas, resultados };
if (archivoSalida) {
  writeFileSync(archivoSalida, `${JSON.stringify(reporte, null, 2)}\n`, "utf8");
  console.log(`Resultado guardado en ${archivoSalida}`);
}

console.log(
  "Las semillas, tableros, etiquetas y motivos son comparables; los tiempos " +
    "no forman parte de la igualdad. Si se agota el presupuesto temporal real, " +
    "nodos y evaluaciones pueden variar antes de la interrupción."
);
