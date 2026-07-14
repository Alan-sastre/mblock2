// ============================================================
// game.js — mBlock2
// Igual que mBlock pero con lógica de tiles especiales:
//   GREET(5), SPEAK(6), SOUND(7)
// El robot debe estar EN el tile especial y ejecutar el bloque
// de acción correcto para "activarlo". Tiles sin activar
// bloquean el avance hasta que se ejecute la acción.
// ============================================================

let phaserGame = null;
let gameScene  = null;

window.currentLevelData = null;
window.currentLevelId   = 1;

const robotState = {
  col: 0, row: 0,
  container: null,
  moving: false,
};

const ABS_DELTA = {
  up:    { dc:  0, dr: -1 },
  down:  { dc:  0, dr:  1 },
  left:  { dc: -1, dr:  0 },
  right: { dc:  1, dr:  0 },
};

// Tiles especiales activados en el nivel actual
// clave: "row,col" → true/false
let activatedTiles = {};

// ── Crear juego Phaser ────────────────────────────────────
function createPhaserGame() {
  if (phaserGame) { phaserGame.destroy(true); phaserGame = null; }

  const panel = document.getElementById('phaser-panel');
  const W = panel.clientWidth  || window.innerWidth  * 0.6;
  const H = panel.clientHeight || window.innerHeight;

  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: W, height: H,
    backgroundColor: '#1a1a2e',
    parent: 'game-container',
    scene: { create: sceneCreate, update: sceneUpdate },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
}

// ── Crear escena ──────────────────────────────────────────
function sceneCreate() {
  gameScene = this;
  const level = window.currentLevelData;
  if (!level) return;

  const W = this.scale.width;
  const H = this.scale.height;

  const maxCellW = Math.floor((W * 0.92) / level.cols);
  const maxCellH = Math.floor((H * 0.92) / level.rows);
  CELL_SIZE = Math.min(maxCellW, maxCellH, 90);

  const mapW = level.cols * CELL_SIZE;
  const mapH = level.rows * CELL_SIZE;
  this.mapOffsetX = Math.floor((W - mapW) / 2);
  this.mapOffsetY = Math.floor((H - mapH) / 2);

  // Guardar referencia a objetos de tiles especiales para animarlos
  this.specialTileObjects = {};

  drawBackground(this, level);
  drawDecorations(this, level, mapW, mapH, this.mapOffsetX, this.mapOffsetY);
  drawGrid(this, level, this.mapOffsetX, this.mapOffsetY);

  // Dibujar tiles especiales encima de la grilla
  if (level.specialTiles) {
    level.specialTiles.forEach(st => {
      const tx = this.mapOffsetX + st.col * CELL_SIZE;
      const ty = this.mapOffsetY + st.row * CELL_SIZE;
      const obj = drawSpecialTile(this, tx, ty, st.type);
      this.specialTileObjects[`${st.row},${st.col}`] = obj;
    });
  }

  // Meta
  const goalPos = findTile(level.grid, TILE.GOAL);
  if (goalPos) {
    drawGoal(this,
      this.mapOffsetX + goalPos.col * CELL_SIZE,
      this.mapOffsetY + goalPos.row * CELL_SIZE
    );
  }

  // Robot
  const startPos = findTile(level.grid, TILE.START);
  if (startPos) {
    robotState.col = startPos.col;
    robotState.row = startPos.row;
    robotState.moving = false;
    robotState.container = drawRobot(this,
      this.mapOffsetX + startPos.col * CELL_SIZE,
      this.mapOffsetY + startPos.row * CELL_SIZE
    );
    robotState.container.setAngle(0);
  }

  window.sceneReady = true;
}

function sceneUpdate() {}

// ── Helpers ───────────────────────────────────────────────
function findTile(grid, tileType) {
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[r].length; c++)
      if (grid[r][c] === tileType) return { row: r, col: c };
  return null;
}

function isWall(grid, row, col) {
  if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return true;
  const t = grid[row][col];
  return t === TILE.WALL;
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function shakeRobot(scene, container, onDone) {
  const origX = container.x;
  scene.tweens.add({
    targets: container, x: origX + 8,
    duration: 55, yoyo: true, repeat: 3,
    ease: 'Sine.easeInOut',
    onComplete: () => { container.x = origX; onDone(); },
  });
}

// ── Iniciar nivel ─────────────────────────────────────────
function startLevel(levelId) {
  window.currentLevelId   = levelId;
  window.currentLevelData = getLevelData(levelId);
  window.sceneReady       = false;
  window.stepCount        = 0;
  activatedTiles          = {};

  showScreen('game-screen');
  initBlockly(window.currentLevelData.allowedBlocks);
  injectBlockCounter(window.currentLevelData.maxBlocks);
  createPhaserGame();

  if (typeof GUIDE !== 'undefined') GUIDE.reset();
}

// ── Ejecutar código ───────────────────────────────────────
async function runCode() {
  if (robotState.moving) return;
  const level = window.currentLevelData;
  if (!level) return;

  let tries = 0;
  while (!window.sceneReady && tries < 50) { await delay(100); tries++; }

  const code = generateCode();
  if (!code.trim()) return;

  await resetRobotPosition();
  window.stepCount  = 0;
  robotState.moving = true;
  activatedTiles    = {};
  // Restaurar visual de tiles especiales
  restoreSpecialTiles();

  const asyncFn = new Function(
    'moveUp','moveDown','moveLeft','moveRight',
    'actionGreet','actionSpeak','actionSound','delay',
    `return (async () => { ${code} })()`
  );

  try {
    await asyncFn(
      moveUp, moveDown, moveLeft, moveRight,
      actionGreet, actionSpeak, actionSound, delay
    );
  } catch(e) {
    console.warn('Error al ejecutar:', e.message);
  }

  robotState.moving = false;
}

// ── Resetear robot ────────────────────────────────────────
async function resetRobotPosition() {
  const level    = window.currentLevelData;
  const startPos = findTile(level.grid, TILE.START);
  if (!startPos || !robotState.container || !gameScene) return;

  robotState.col = startPos.col;
  robotState.row = startPos.row;

  const rx = gameScene.mapOffsetX + startPos.col * CELL_SIZE;
  const ry = gameScene.mapOffsetY + startPos.row * CELL_SIZE;
  robotState.container.setPosition(rx + CELL_SIZE / 2, ry + CELL_SIZE / 2);
  robotState.container.setAngle(0);
  await delay(50);
}

function restoreSpecialTiles() {
  if (!gameScene || !gameScene.specialTileObjects) return;
  Object.values(gameScene.specialTileObjects).forEach(obj => {
    if (obj && obj.setAlpha) obj.setAlpha(1);
    if (obj && obj.setScale) obj.setScale(1);
  });
}

// ── Movimiento absoluto ───────────────────────────────────
function makeMover(dir) {
  return function () {
    return new Promise(resolve => {
      if (!gameScene || !robotState.container) { resolve(); return; }

      const { dc, dr } = ABS_DELTA[dir];
      const newCol = robotState.col + dc;
      const newRow = robotState.row + dr;
      const level  = window.currentLevelData;
      window.stepCount++;

      if (isWall(level.grid, newRow, newCol)) {
        shakeRobot(gameScene, robotState.container, resolve);
        return;
      }

      robotState.col = newCol;
      robotState.row = newRow;

      const tx = gameScene.mapOffsetX + newCol * CELL_SIZE;
      const ty = gameScene.mapOffsetY + newRow * CELL_SIZE;

      animateRobotMove(gameScene, robotState.container, tx, ty, () => {
        checkGoal(newRow, newCol);
        resolve();
      });
    });
  };
}

const moveUp    = makeMover('up');
const moveDown  = makeMover('down');
const moveLeft  = makeMover('left');
const moveRight = makeMover('right');

// ── Acciones especiales ───────────────────────────────────
// Cada acción verifica que el robot esté en el tile correcto.
// Si lo está → activa el tile (animación) y cuenta el paso.
// Si NO está en el tile → animación de error (sacudida).

function makeAction(tileType, actionName) {
  return function () {
    return new Promise(resolve => {
      if (!gameScene || !robotState.container) { resolve(); return; }
      window.stepCount++;

      const level = window.currentLevelData;
      const row   = robotState.row;
      const col   = robotState.col;
      const key   = `${row},${col}`;

      // ¿El tile actual es del tipo correcto?
      const isCorrectTile = level.grid[row] && level.grid[row][col] === tileType;
      // ¿Ya fue activado?
      const alreadyDone   = activatedTiles[key];

      if (isCorrectTile && !alreadyDone) {
        // ✅ Activar el tile
        activatedTiles[key] = true;
        playActionAnimation(gameScene, robotState.container, actionName, () => {
          activateSpecialTileVisual(key);
          resolve();
        });
      } else if (isCorrectTile && alreadyDone) {
        // Ya activado, solo continuar
        resolve();
      } else {
        // ❌ Bloque usado en lugar incorrecto → sacudida
        shakeRobot(gameScene, robotState.container, resolve);
      }
    });
  };
}

const actionGreet = makeAction(TILE.GREET, 'greet');
const actionSpeak = makeAction(TILE.SPEAK, 'speak');
const actionSound = makeAction(TILE.SOUND, 'sound');

// Efecto visual cuando se activa un tile especial
function activateSpecialTileVisual(key) {
  if (!gameScene || !gameScene.specialTileObjects) return;
  const obj = gameScene.specialTileObjects[key];
  if (!obj) return;
  gameScene.tweens.add({
    targets: obj,
    alpha: 0.3, scaleX: 0.7, scaleY: 0.7,
    duration: 400, ease: 'Back.easeIn',
  });
}

// ── Verificar si todos los tiles especiales están activados
// y si el robot llegó a la meta
function checkGoal(row, col) {
  const level = window.currentLevelData;
  if (!level) return;

  if (level.grid[row] && level.grid[row][col] === TILE.GOAL) {
    // Verificar que todos los tiles especiales estén activados
    const allActivated = !level.specialTiles || level.specialTiles.every(st => {
      return activatedTiles[`${st.row},${st.col}`] === true;
    });

    if (allActivated) {
      setTimeout(onLevelComplete, 300);
    } else {
      // Llegó a la meta pero faltan acciones → sacudir y mostrar indicador
      setTimeout(() => {
        shakeRobot(gameScene, robotState.container, () => {});
        flashPendingTiles();
      }, 300);
    }
  }
}

// Parpadear los tiles que faltan activar
function flashPendingTiles() {
  if (!gameScene || !window.currentLevelData) return;
  const level = window.currentLevelData;
  if (!level.specialTiles) return;

  level.specialTiles.forEach(st => {
    const key = `${st.row},${st.col}`;
    if (!activatedTiles[key]) {
      const obj = gameScene.specialTileObjects && gameScene.specialTileObjects[key];
      if (obj) {
        gameScene.tweens.add({
          targets: obj,
          alpha: 0.2,
          duration: 200, yoyo: true, repeat: 4,
          ease: 'Sine.easeInOut',
        });
      }
    }
  });
}

// ── Nivel completado ──────────────────────────────────────
function onLevelComplete() {
  if (!gameScene) return;
  playWinAnimation(gameScene, robotState.container);
  if (typeof GUIDE !== 'undefined') GUIDE.levelComplete();

  const stars = calcStars(window.stepCount, window.currentLevelData.optimalSteps);
  ['ws1','ws2','ws3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.style.opacity = i < stars ? '1' : '0.2';
  });

  const progress = loadProgress();
  const lvId = window.currentLevelId;
  if ((progress.stars[lvId] || 0) < stars) progress.stars[lvId] = stars;
  if (progress.unlockedLevel < lvId + 1)   progress.unlockedLevel = lvId + 1;
  saveProgress(progress);

  setTimeout(() => {
    document.getElementById('success-overlay').classList.remove('hidden');
  }, 800);
}

// ── Navegación ────────────────────────────────────────────
function nextLevel() {
  document.getElementById('success-overlay').classList.add('hidden');
  const next = window.currentLevelId + 1;
  if (next <= LEVELS.length) startLevel(next);
  else goHome();
}

function retryLevel() {
  document.getElementById('success-overlay').classList.add('hidden');
  document.getElementById('fail-overlay').classList.add('hidden');
  startLevel(window.currentLevelId);
}

function goHome() {
  document.getElementById('success-overlay').classList.add('hidden');
  document.getElementById('fail-overlay').classList.add('hidden');
  showScreen('start-screen');
  updateStartScreen();
  if (typeof GUIDE !== 'undefined') GUIDE.destroy();
  if (phaserGame) { phaserGame.destroy(true); phaserGame = null; }
}

window.addEventListener('resize', () => {
  if (phaserGame) {
    const panel = document.getElementById('phaser-panel');
    phaserGame.scale.resize(panel.clientWidth, panel.clientHeight);
  }
});
