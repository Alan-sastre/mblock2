// ============================================================
// levels.js — mBlock2
// Nuevos niveles con tiles especiales que REQUIEREN bloques
// de acción: saludar (5), hablar (6), sonido (7).
// El robot debe llegar al tile especial Y ejecutar el bloque
// correspondiente para "activarlo". Solo después aparece la
// meta (GOAL) o se cuenta como completado.
// ============================================================

const TILE = {
  EMPTY:   0,
  WALL:    1,
  STAR:    2,
  GOAL:    3,
  START:   4,
  GREET:   5,   // tile de saludar  🤝 — requiere bloque 'action_greet'
  SPEAK:   6,   // tile de hablar   💬 — requiere bloque 'action_speak'
  SOUND:   7,   // tile de sonido   🔊 — requiere bloque 'action_sound'
};

let CELL_SIZE = 64;

// Clave separada del progreso para no mezclar con mBlock1
const PROGRESS_KEY = 'mblock2_progress';

const LEVELS = [

  // ──────────────────────────────────────────────────────────
  // NIVEL 1 — "Saluda al amigo"
  // El robot avanza, pisa el tile de SALUDO y ejecuta saludar,
  // luego sigue hasta la meta.
  // Mapa 6x6, tema: jardín de día
  // Solución: →→ saludar →→ (llega a meta)
  // ──────────────────────────────────────────────────────────
  {
    id: 1,
    cols: 6, rows: 6,
    grid: [
      [1, 1, 1, 1, 1, 1],
      [1, 4, 0, 5, 0, 1],   // 4=inicio, 5=tile saludar
      [1, 1, 1, 0, 1, 1],
      [1, 1, 1, 0, 1, 1],
      [1, 1, 1, 3, 1, 1],   // 3=meta
      [1, 1, 1, 1, 1, 1],
    ],
    startDir: 'right',
    maxBlocks: 6,
    optimalSteps: 5,
    // Bloques disponibles este nivel
    allowedBlocks: ['move_right', 'move_down', 'action_greet'],
    // Tiles especiales que hay que activar (y con qué bloque)
    specialTiles: [
      { row: 1, col: 3, type: TILE.GREET, action: 'action_greet' },
    ],
    bgColor:    0x64B5F6,
    floorColor: 0x81C784,
    wallColor:  0x5D4037,
  },

  // ──────────────────────────────────────────────────────────
  // NIVEL 2 — "Di algo y haz sonar la campana"
  // El robot pisa tile HABLAR, ejecuta hablar,
  // luego pisa tile SONIDO, ejecuta sonido, y llega a la meta.
  // Mapa 7x6, tema: pueblo atardecer
  // Solución: ↓ hablar →→ sonido ↓↓ (meta)
  // ──────────────────────────────────────────────────────────
  {
    id: 2,
    cols: 7, rows: 6,
    grid: [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 4, 6, 1, 1, 1, 1],   // 6=tile hablar
      [1, 1, 0, 0, 7, 1, 1],   // 7=tile sonido
      [1, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 0, 3, 1],   // 3=meta
      [1, 1, 1, 1, 1, 1, 1],
    ],
    startDir: 'right',
    maxBlocks: 8,
    optimalSteps: 6,
    allowedBlocks: ['move_right', 'move_down', 'action_speak', 'action_sound'],
    specialTiles: [
      { row: 1, col: 2, type: TILE.SPEAK, action: 'action_speak' },
      { row: 2, col: 4, type: TILE.SOUND, action: 'action_sound' },
    ],
    bgColor:    0xFF8A65,
    floorColor: 0xFFCC80,
    wallColor:  0xBF360C,
  },

  // ──────────────────────────────────────────────────────────
  // NIVEL 3 — "El gran recital"
  // Los tres bloques especiales en un laberinto más grande.
  // Mapa 8x7, tema: escenario nocturno
  // Solución: → saludar ↓↓ → hablar → sonido ↓↓ (meta)
  // ──────────────────────────────────────────────────────────
  {
    id: 3,
    cols: 8, rows: 7,
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 4, 5, 1, 1, 1, 1, 1],   // 5=tile saludar
      [1, 1, 0, 0, 6, 1, 1, 1],   // 6=tile hablar
      [1, 1, 1, 1, 0, 0, 7, 1],   // 7=tile sonido
      [1, 1, 1, 1, 1, 1, 0, 1],
      [1, 1, 1, 1, 1, 1, 3, 1],   // 3=meta
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
    startDir: 'right',
    maxBlocks: 12,
    optimalSteps: 9,
    allowedBlocks: [
      'move_right', 'move_down',
      'action_greet', 'action_speak', 'action_sound',
    ],
    specialTiles: [
      { row: 1, col: 2, type: TILE.GREET,  action: 'action_greet' },
      { row: 2, col: 4, type: TILE.SPEAK,  action: 'action_speak' },
      { row: 3, col: 6, type: TILE.SOUND,  action: 'action_sound' },
    ],
    bgColor:    0x283593,
    floorColor: 0x9575CD,
    wallColor:  0x1A237E,
  },
];

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : { unlockedLevel: 1, stars: {} };
  } catch(e) { return { unlockedLevel: 1, stars: {} }; }
}

function saveProgress(p) {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch(e) {}
}

function getLevelData(id) {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

function calcStars(stepsUsed, optimalSteps) {
  if (stepsUsed <= optimalSteps)     return 3;
  if (stepsUsed <= optimalSteps * 2) return 2;
  return 1;
}
