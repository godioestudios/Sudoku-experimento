# Sudoku IA

Juego de Sudoku moderno construido con **React 19 + Vite**. Genera puzzles con
solución única, cronómetro, apuntes, pistas y pausa.

## Características

- Generación aleatoria de tableros con **solución única** (backtracking + verificación).
- 4 niveles de dificultad: Fácil, Medio, Difícil y Experto.
- Cronómetro, contador de errores y pausa.
- Modo **apuntes** (candidatos) y pistas.
- Deshacer movimientos, borrar celdas y resaltado de fila/columna/caja.
- Atajos de teclado.
- Diseño responsive.

## Tecnologías

- [React 19](https://react.dev/)
- [Vite](https://vite.dev/)
- [ESLint](https://eslint.org/) (flat config)

## Empezar

Requiere Node.js 18+.

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Scripts disponibles

| Comando           | Descripción                                  |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | Servidor de desarrollo con recarga en vivo   |
| `npm run build`   | Compila la versión de producción en `dist/`  |
| `npm run preview` | Sirve localmente la build de producción      |
| `npm run lint`    | Analiza el código con ESLint                 |

## Estructura del proyecto

```
src/
├── main.jsx                 # Punto de entrada
├── App.jsx / App.css        # Composición de la interfaz
├── index.css                # Variables y estilos globales
├── utils/
│   └── sudoku.js            # Algoritmo puro (generación, resolución, validación)
├── hooks/
│   └── useSudoku.js         # Estado y lógica de la partida
└── components/
    ├── Acciones/            # Deshacer, borrar, apuntes, pista, nuevo
    ├── BarraInfo/           # Dificultad, errores, tiempo y pausa
    ├── Cabecera/            # Logo y selector de dificultad
    ├── Celda/               # Casilla del tablero con apuntes
    ├── Iconos/              # Iconos SVG compartidos
    ├── ModalVictoria/       # Modal de fin de partida
    ├── OverlayPausa/        # Capa de pausa
    ├── Tablero/             # Cuadrícula 9x9
    └── Teclado/             # Teclado numérico
```

Cada componente vive en su propia carpeta junto a su archivo `.css`.

## Atajos de teclado

| Tecla             | Acción                       |
| ----------------- | ---------------------------- |
| `1`–`9`           | Colocar un número            |
| Flechas           | Mover la selección           |
| `Backspace` / `Del` | Borrar la casilla          |
| `Esc`             | Deseleccionar                |
| `P`               | Pausar / reanudar            |
| `N`               | Activar / desactivar apuntes |
| `H`               | Pedir una pista              |
| `Z`               | Deshacer                     |

## Licencia

Pendiente de definir.
