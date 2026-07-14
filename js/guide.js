// ============================================================
// guide.js — Mano guía 👆 paso a paso para niños
//
// La mano aparece si el niño no hace nada en 5 segundos.
// Luego guía CADA bloque de la solución uno por uno:
//   1. Señala el bloque correcto en el toolbox (2s visible)
//   2. Se desliza al área de trabajo (enseña que hay que arrastrarlo)
//   3. Pausa, repite con el siguiente bloque
//   4. Cuando están todos → señala el botón ▶ (que pulsa)
// Cualquier interacción del niño oculta la mano y reinicia el timer.
// ============================================================

const GUIDE = (() => {

  // ── Tiempos (ms) ─────────────────────────────────────
  const IDLE_MS        = 5000;  // inactividad antes de aparecer
  const PAUSE_BETWEEN  = 1800;  // pausa entre cada paso de la guía
  const LINGER_MS      = 2000;  // tiempo que la mano ESPERA en el origen señalando
  const SLIDE_MS       = 700;   // duración del deslizamiento
  const TAP_MS         = 200;   // duración del golpecito de llegada
  const FADE_MS        = 400;   // duración del desvanecimiento

  // Solución de cada nivel (bloques en orden)
  const SOLUTIONS = {
    1: ['move_right', 'move_right', 'action_greet', 'move_down', 'move_down', 'move_down'],
    2: ['move_right', 'action_speak', 'move_down', 'move_right', 'move_right', 'action_sound', 'move_down', 'move_right'],
    3: ['move_right', 'action_greet', 'move_down', 'move_right', 'move_right', 'action_speak',
        'move_right', 'move_right', 'action_sound', 'move_down', 'move_down'],
  };

  let hand        = null;
  let idleTimer   = null;
  let stepTimer   = null;
  let running     = false;
  let initialized = false;
  let currentStep = 0;   // índice del paso actual dentro del ciclo

  // ── Elemento DOM de la mano ───────────────────────────
  function getHand() {
    if (!hand) {
      hand = document.createElement('div');
      hand.id = 'guide-hand';
      hand.textContent = '👆';
      hand.setAttribute('aria-hidden', 'true');
      document.body.appendChild(hand);
    }
    return hand;
  }

  function hideHand() {
    const h = getHand();
    h.style.transition = 'opacity ' + FADE_MS + 'ms ease';
    h.style.opacity    = '0';
    h.style.pointerEvents = 'none';
  }

  // ── Posicionar instantáneamente sin transición ────────
  function placeAt(x, y, scale, rotate) {
    const h = getHand();
    h.style.transition = 'none';
    h.style.left       = x + 'px';
    h.style.top        = y + 'px';
    h.style.transform  = `scale(${scale}) rotate(${rotate}deg)`;
    h.style.opacity    = '0';
  }

  // ── Aparecer en una posición ──────────────────────────
  function appearAt(x, y, onDone) {
    const h = getHand();
    placeAt(x, y, 0.5, -20);
    // doble rAF para que el browser procese el estado inicial
    requestAnimationFrame(() => requestAnimationFrame(() => {
      h.style.transition = 'opacity 0.35s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)';
      h.style.opacity    = '1';
      h.style.transform  = 'scale(1.15) rotate(0deg)';
      setTimeout(onDone, 380);
    }));
  }

  // ── Deslizarse a otra posición ────────────────────────
  function slideTo(x, y, onDone) {
    const h = getHand();
    h.style.transition = [
      `left ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
      `top  ${SLIDE_MS}ms cubic-bezier(0.4,0,0.2,1)`,
      'transform 0.2s ease',
    ].join(', ');
    h.style.left      = x + 'px';
    h.style.top       = y + 'px';
    h.style.transform = 'scale(1) rotate(12deg)';
    setTimeout(onDone, SLIDE_MS + 50);
  }

  // ── Golpecito de llegada ──────────────────────────────
  function tap(onDone) {
    const h = getHand();
    h.style.transition = `transform ${TAP_MS}ms ease`;
    h.style.transform  = 'scale(1.35) rotate(0deg)';
    setTimeout(() => {
      h.style.transform = 'scale(1) rotate(0deg)';
      setTimeout(onDone, TAP_MS);
    }, TAP_MS);
  }

  // ── Calcular posiciones en pantalla ──────────────────
  function getToolboxPos(blockType) {
    // Intentar encontrar el bloque específico en el flyout SVG de Blockly
    if (window.workspace) {
      const flyout = window.workspace.getFlyout && window.workspace.getFlyout();
      if (flyout) {
        const fw = flyout.getWorkspace && flyout.getWorkspace();
        if (fw) {
          const blocks = fw.getAllBlocks(false);
          for (const b of blocks) {
            if (b.type === blockType) {
              const svg = b.getSvgRoot && b.getSvgRoot();
              if (svg) {
                const r = svg.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                }
              }
            }
          }
        }
      }
      // Fallback: usar el área del flyout visible
      const flyoutEl = document.querySelector('.blocklyFlyout');
      if (flyoutEl) {
        const r = flyoutEl.getBoundingClientRect();
        if (r.width > 0) return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.3 };
      }
    }
    // Último fallback: borde izquierdo del panel
    const panel = document.getElementById('blockly-panel');
    if (panel) {
      const r = panel.getBoundingClientRect();
      return { x: r.left + r.width * 0.20, y: r.top + r.height * 0.35 };
    }
    return { x: 70, y: window.innerHeight * 0.35 };
  }

  function getWorkspacePos() {
    const ws = document.getElementById('blockly-workspace');
    if (ws) {
      const r = ws.getBoundingClientRect();
      return { x: r.left + r.width * 0.65, y: r.top + r.height * 0.45 };
    }
    const panel = document.getElementById('blockly-panel');
    if (panel) {
      const r = panel.getBoundingClientRect();
      return { x: r.left + r.width * 0.72, y: r.top + r.height * 0.48 };
    }
    return { x: window.innerWidth * 0.28, y: window.innerHeight * 0.48 };
  }

  function getRunBtnPos() {
    const btn = document.getElementById('run-btn');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // ── Lógica de la guía ─────────────────────────────────
  function placedCount() {
    return window.workspace ? window.workspace.getAllBlocks(false).length : 0;
  }

  function neededCount() {
    const lvId = window.currentLevelId || 1;
    return (SOLUTIONS[lvId] || SOLUTIONS[1]).length;
  }

  function blockTypeForStep(step) {
    const lvId = window.currentLevelId || 1;
    const sol  = SOLUTIONS[lvId] || SOLUTIONS[1];
    return sol[step] || sol[0];
  }

  // ── Ejecutar un paso de guía ──────────────────────────
  // Un "paso" = señalar bloque → esperar → deslizar a workspace → golpecito → ocultar
  function runStep() {
    if (!running) return;
    if (!window.currentLevelData) { scheduleNext(PAUSE_BETWEEN); return; }

    const placed = placedCount();
    const needed = neededCount();

    if (placed >= needed) {
      // Todos los bloques colocados → guiar al play
      guideToPlay();
      return;
    }

    // Paso actual = cuántos bloques ya puso el niño
    const blockType = blockTypeForStep(placed);
    const toolPos   = getToolboxPos(blockType);
    const wsPos     = getWorkspacePos();

    // 1. Aparecer sobre el bloque en el toolbox
    appearAt(toolPos.x, toolPos.y, () => {
      if (!running) return;

      // 2. Esperar LINGER_MS señalando el bloque (el niño lo ve)
      stepTimer = setTimeout(() => {
        if (!running) return;

        // 3. Deslizarse hacia el workspace (muestra adónde arrastrarlo)
        slideTo(wsPos.x, wsPos.y, () => {
          if (!running) return;

          // 4. Golpecito al llegar
          tap(() => {
            if (!running) return;

            // 5. Ocultar y esperar antes del siguiente paso
            hideHand();
            scheduleNext(PAUSE_BETWEEN);
          });
        });
      }, LINGER_MS);
    });
  }

  // ── Guiar al botón de play ────────────────────────────
  function guideToPlay() {
    if (!running) return;
    const wsPos  = getWorkspacePos();
    const btnPos = getRunBtnPos();
    if (!btnPos) { scheduleNext(PAUSE_BETWEEN); return; }

    const btn = document.getElementById('run-btn');

    appearAt(wsPos.x, wsPos.y, () => {
      if (!running) return;
      stepTimer = setTimeout(() => {
        if (!running) return;
        if (btn) btn.classList.add('guide-pulse');

        slideTo(btnPos.x, btnPos.y, () => {
          if (!running) return;
          tap(() => {
            if (!running) return;
            hideHand();
            // Mantener el pulso un momento y luego quitar
            stepTimer = setTimeout(() => {
              if (btn) btn.classList.remove('guide-pulse');
              scheduleNext(PAUSE_BETWEEN * 1.5);
            }, 1200);
          });
        });
      }, LINGER_MS);
    });
  }

  function scheduleNext(ms) {
    if (!running) return;
    stepTimer = setTimeout(runStep, ms);
  }

  // ── Control ───────────────────────────────────────────
  function activate() {
    if (running) return;
    running = true;
    runStep();
  }

  function deactivate(stopIdle) {
    running = false;
    clearTimeout(stepTimer);
    hideHand();
    const btn = document.getElementById('run-btn');
    if (btn) btn.classList.remove('guide-pulse');
    if (stopIdle) clearTimeout(idleTimer);
  }

  function onActivity() {
    deactivate(false);
    clearTimeout(idleTimer);
    // Solo reiniciar el timer si estamos en el juego
    idleTimer = setTimeout(() => {
      if (window.currentLevelData) activate();
    }, IDLE_MS);
  }

  // ── API pública ───────────────────────────────────────
  return {
    init() {
      if (initialized) return;
      initialized = true;
      getHand();
      ['mousedown', 'touchstart', 'keydown', 'pointerdown'].forEach(ev =>
        document.addEventListener(ev, onActivity, { passive: true })
      );
      window._guideOnBlockPlaced = onActivity;
      // No arrancar en la pantalla de inicio
    },

    reset() {
      deactivate(false);
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (window.currentLevelData) activate();
      }, IDLE_MS);
    },

    levelComplete() { deactivate(true); },
    destroy() {
      deactivate(true);
      if (hand) { hand.remove(); hand = null; }
      initialized = false;
    },
  };
})();
