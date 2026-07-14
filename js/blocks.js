// ============================================================
// blocks.js — mBlock2
// Bloques de movimiento + 3 bloques especiales de acción:
//   action_greet  🤝  Saludar
//   action_speak  💬  Hablar
//   action_sound  🔊  Sonido
// ============================================================

// ── SVG para flechas de movimiento ────────────────────────
function createArrowSVG(direction, bgColor) {
  const arrows = {
    up:    'M24,8 L40,34 L29,34 L29,44 L19,44 L19,34 L8,34 Z',
    down:  'M24,44 L8,18 L19,18 L19,8 L29,8 L29,18 L40,18 Z',
    left:  'M8,24 L34,8 L34,19 L44,19 L44,29 L34,29 L34,40 Z',
    right: 'M44,24 L18,40 L18,29 L8,29 L8,19 L18,19 L18,8 Z',
  };
  const path = arrows[direction];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 52 52">
    <rect width="52" height="52" rx="12" fill="${bgColor}"/>
    <path d="${path}" fill="white" opacity="0.95"/>
    <path d="${path}" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1.5"/>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// ── SVG para bloques de acción (emoji grande) ──────────────
function createActionSVG(emoji, bg1, bg2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <defs>
      <radialGradient id="g" cx="40%" cy="35%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </radialGradient>
    </defs>
    <rect width="64" height="64" rx="14" fill="url(#g)"/>
    <rect x="2" y="2" width="60" height="28" rx="12" fill="rgba(255,255,255,0.12)"/>
    <text x="32" y="44" font-size="30" text-anchor="middle"
          font-family="Apple Color Emoji,Segoe UI Emoji,sans-serif">${emoji}</text>
  </svg>`;
  // btoa no soporta Unicode: convertir con encodeURIComponent → escape
  const encoded = 'data:image/svg+xml;base64,' +
    btoa(unescape(encodeURIComponent(svg)));
  return encoded;
}

// ── Bloques de movimiento ──────────────────────────────────
Blockly.Blocks['move_up'] = {
  init: function () {
    this.setColour('#43A047');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(createArrowSVG('up', '#2E7D32'), 52, 52, '↑'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};
Blockly.Blocks['move_down'] = {
  init: function () {
    this.setColour('#E53935');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(createArrowSVG('down', '#B71C1C'), 52, 52, '↓'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};
Blockly.Blocks['move_left'] = {
  init: function () {
    this.setColour('#1E88E5');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(createArrowSVG('left', '#1565C0'), 52, 52, '←'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};
Blockly.Blocks['move_right'] = {
  init: function () {
    this.setColour('#8E24AA');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(createArrowSVG('right', '#6A1B9A'), 52, 52, '→'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};

// ── Bloque: SALUDAR 🤝 ────────────────────────────────────
Blockly.Blocks['action_greet'] = {
  init: function () {
    this.setColour('#00897B');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(
        createActionSVG('🤝', '#00BFA5', '#00695C'), 60, 60, 'Saludar'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};

// ── Bloque: HABLAR 💬 ─────────────────────────────────────
Blockly.Blocks['action_speak'] = {
  init: function () {
    this.setColour('#F57C00');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(
        createActionSVG('💬', '#FFA726', '#E65100'), 60, 60, 'Hablar'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};

// ── Bloque: SONIDO 🔊 ─────────────────────────────────────
Blockly.Blocks['action_sound'] = {
  init: function () {
    this.setColour('#C62828');
    this.appendDummyInput()
      .appendField(new Blockly.FieldImage(
        createActionSVG('🔊', '#EF5350', '#B71C1C'), 60, 60, 'Sonido'));
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
  }
};

// ── Registrar generadores ──────────────────────────────────
function registerGenerators() {
  let gen = null;
  if (typeof javascript !== 'undefined' && javascript.javascriptGenerator) {
    gen = javascript.javascriptGenerator;
  } else if (typeof Blockly !== 'undefined' && Blockly.JavaScript) {
    gen = Blockly.JavaScript;
  }
  if (!gen) { console.error('Generador JS no disponible'); return null; }

  gen.forBlock = gen.forBlock || {};
  function reg(name, code) {
    gen.forBlock[name] = () => code;
    gen[name]          = () => code;
  }

  reg('move_up',      'await moveUp();\n');
  reg('move_down',    'await moveDown();\n');
  reg('move_left',    'await moveLeft();\n');
  reg('move_right',   'await moveRight();\n');
  reg('action_greet', 'await actionGreet();\n');
  reg('action_speak', 'await actionSpeak();\n');
  reg('action_sound', 'await actionSound();\n');

  window._jsGenerator = gen;
  return gen;
}

// ── Workspace global ───────────────────────────────────────
window.workspace = null;

function initBlockly(allowedBlocks) {
  if (!window._jsGenerator) registerGenerators();

  if (window.workspace) {
    try { window.workspace.dispose(); } catch(e) {}
    window.workspace = null;
  }
  document.getElementById('blockly-workspace').innerHTML = '';

  const blocksXML = allowedBlocks
    .map(b => `<block type="${b}"></block>`).join('');
  const toolboxXML = `<xml xmlns="https://developers.google.com/blockly/xml">${blocksXML}</xml>`;

  window.workspace = Blockly.inject('blockly-workspace', {
    toolbox: toolboxXML,
    scrollbars: true,
    trashcan: false,
    zoom:   { controls: false, wheel: false, startScale: 1.1 },
    grid:   { spacing: 20, length: 3, colour: 'rgba(255,255,255,0.1)', snap: true },
    renderer: 'zelos',
    theme: buildKidsTheme(),
  });

  window.workspace.addChangeListener(onWorkspaceChange);
}

function buildKidsTheme() {
  return Blockly.Theme.defineTheme('kidsTheme', {
    base: Blockly.Themes.Classic,
    componentStyles: {
      workspaceBackgroundColour: '#1a1a2e',
      toolboxBackgroundColour:   '#16213e',
      toolboxForegroundColour:   '#ffffff',
      flyoutBackgroundColour:    '#16213e',
      flyoutForegroundColour:    '#ffffff',
      flyoutOpacity:             0.9,
      scrollbarColour:           '#4a4a8a',
    },
    fontStyle: { family: 'sans-serif', weight: 'bold', size: 14 },
  });
}

function onWorkspaceChange() {
  if (!window.currentLevelData || !window.workspace) return;
  const count = window.workspace.getAllBlocks(false).length;
  const max   = window.currentLevelData.maxBlocks;
  const el    = document.getElementById('block-counter');
  if (el) {
    el.textContent = count + ' / ' + max;
    el.style.color = count > max ? '#ff4444' : '#ffffff';
  }
  if (typeof window._guideOnBlockPlaced === 'function') {
    window._guideOnBlockPlaced();
  }
}

function clearWorkspace() {
  if (window.workspace) window.workspace.clear();
}

function generateCode() {
  if (!window.workspace) return '';
  const gen = window._jsGenerator;
  if (!gen) return '';
  try { return gen.workspaceToCode(window.workspace); }
  catch(e) { console.error('Error al generar código:', e); return ''; }
}

document.addEventListener('DOMContentLoaded', registerGenerators);
