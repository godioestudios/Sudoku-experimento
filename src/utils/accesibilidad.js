/**
 * Texto accesible de una celda del tablero: posición, contenido y estado.
 * Las coordenadas se muestran en base 1, como las anuncia un lector de pantalla.
 */
export function etiquetaCelda({
  fila,
  columna,
  valor,
  esFija,
  candidatos,
  incorrecta = false,
  pausado = false,
}) {
  const partes = [`Fila ${fila + 1}, columna ${columna + 1}.`];

  if (pausado) {
    partes.push("Contenido oculto: juego en pausa.");
    return partes.join(" ");
  }

  if (valor !== 0) {
    partes.push(incorrecta ? `Valor ${valor}, incorrecto.` : `Valor ${valor}.`);
  } else {
    partes.push("Vacía.");
  }

  partes.push(esFija ? "Celda original, no editable." : "Celda editable.");

  const apuntes = candidatos ? [...candidatos].sort((a, b) => a - b) : [];
  if (valor === 0 && apuntes.length > 0) {
    partes.push(`Apuntes: ${apuntes.join(", ")}.`);
  }

  return partes.join(" ");
}
