// ============================================================
// ui.js — Interfaz visual y navegación
// ============================================================

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function selectLevel(id) {
  const progress = loadProgress();
  if (id > progress.unlockedLevel) return;
  startLevel(id);
}

function updateStartScreen() {
  const progress = loadProgress();
  for (let i = 1; i <= LEVELS.length; i++) {
    const card = document.getElementById('lv-card-' + i);
    if (!card) continue;
    if (i <= progress.unlockedLevel) {
      card.classList.remove('locked');
      const lock = card.querySelector('.lock-icon');
      if (lock) lock.style.display = 'none';
    }
    const s = progress.stars[i] || 0;
    for (let j = 1; j <= 3; j++) {
      const star = document.getElementById('star-' + i + '-' + j);
      if (star) star.textContent = j <= s ? '★' : '☆';
    }
  }
}

function animateLogoRobot() {
  const robot = document.querySelector('.logo-robot');
  if (!robot) return;
  let up = true;
  setInterval(() => {
    robot.style.transform = up
      ? 'translateY(-10px) rotate(-3deg)'
      : 'translateY(0px) rotate(3deg)';
    up = !up;
  }, 700);
}

function injectBlockCounter(maxBlocks) {
  let counter = document.getElementById('block-counter');
  if (!counter) {
    counter = document.createElement('div');
    counter.id = 'block-counter';
    document.getElementById('blockly-panel').appendChild(counter);
  }
  counter.textContent = '0 / ' + maxBlocks;
}

function resizeBlockly() {
  if (window.workspace) Blockly.svgResize(window.workspace);
}

function showLoadingScreen() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);
  }, 1200);
}

function createStartParticles() {
  const bg = document.querySelector('.start-bg');
  if (!bg) return;
  for (let i = 0; i < 12; i++) {
    const star = document.createElement('div');
    star.className = 'bg-star';
    star.style.cssText = `
      left: ${Math.random()*100}%;
      top:  ${Math.random()*60}%;
      animation-delay: ${Math.random()*3}s;
      width:  ${Math.random()*6+3}px;
      height: ${Math.random()*6+3}px;
    `;
    bg.appendChild(star);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  showLoadingScreen();
  updateStartScreen();
  animateLogoRobot();
  createStartParticles();

  if (typeof GUIDE !== 'undefined') GUIDE.init();

  window.addEventListener('resize', resizeBlockly);
});
