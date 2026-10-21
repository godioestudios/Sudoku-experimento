// Benchmark reproducible de generación por dificultad lógica.
// Uso: node scripts/benchmark-dificultad-logica.mjs [intentosPorNivel]
import { generarPartida } from "../src/utils/generador.js";

const intentos = Number(process.argv[2] ?? 15);
const niveles = ["facil", "medio", "dificil", "experto"];

const media = (valores) =>
  valores.reduce((total, valor) => total + valor, 0) / valores.length;
const percentil = (valores, p) => {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor(orden.length * p))];
};

for (const nivel of niveles) {
  const resultados = [];
  const tiempos = [];
  const verificaciones = [];
  const nodos = [];
  let interrumpidas = 0;

  for (let i = 0; i < intentos; i++) {
    const inicio = performance.now();
    const partida = generarPartida(nivel);
    tiempos.push(performance.now() - inicio);
    resultados.push(partida.dificultadLogica);
    const diagnostico = partida.dificultadLogica.diagnostico;
    verificaciones.push(diagnostico.verificacionesUnicidad);
    nodos.push(diagnostico.nodosUnicidad);
    interrumpidas += diagnostico.interrupcionesUnicidad;
  }

  const alcanzados = resultados.filter((resultado) => resultado.alcanzada);
  const etiquetas = new Map();
  for (const resultado of resultados) {
    etiquetas.set(
      resultado.etiqueta,
      (etiquetas.get(resultado.etiqueta) ?? 0) + 1
    );
  }

  console.log(`--- ${nivel} (${intentos} intentos) ---`);
  console.log(
    `Aciertos exactos: ${alcanzados.length}/${intentos} ` +
      `(${((alcanzados.length / intentos) * 100).toFixed(1)}%)`
  );
  console.log(
    `Tiempo: media ${media(tiempos).toFixed(0)} ms · ` +
      `p95 ${percentil(tiempos, 0.95).toFixed(0)} ms · ` +
      `máx ${Math.max(...tiempos).toFixed(0)} ms`
  );
  console.log(
    `Unicidad: media ${media(verificaciones).toFixed(0)} comprobaciones · ` +
      `media ${media(nodos).toFixed(0)} nodos · ` +
      `${interrumpidas} interrumpidas`
  );
  console.log(
    "Etiquetas: " +
      [...etiquetas.entries()]
        .map(([etiqueta, cantidad]) => `${etiqueta} ${cantidad}`)
        .join(" · ")
  );
}
