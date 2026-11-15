// ROOTWARDEN boot: canvas sizing, mouse + keyboard input, the game loop,
// and the ?shot= scenes used for screenshots.
import { FIELD } from './path.js';
import { TOWER_ORDER } from './towers.js';
import {
  STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER,
  createWorld, beginGame, startWave, placeTower, upgradeSelected,
  sellSelected, towerAt, stepWorld, showMessage,
} from './world.js';
import { render, shopLayout } from './render.js';
import { stageShot } from './shots.js';
import { ensureAudio, toggleMute, sfx } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');
const world = createWorld(seed);

function fitCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
}

function toLogical(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
    y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
  };
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

// --- Click handling --------------------------------------------------------
function handleClick(x, y) {
  ensureAudio();
  if (world.screen === SCREEN_TITLE) {
    beginGame(world);
    announce('Game started. Defend the World Tree!');
    return;
  }
  if (world.screen === SCREEN_WIN || world.screen === SCREEN_OVER) {
    beginGame(world);
    announce('New game started.');
    return;
  }
  if (world.screen !== SCREEN_PLAY) return;

  const layout = shopLayout();
  // Shop cards: pick a tower type to plant.
  for (const card of layout.cards) {
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      world.selectedType = card.key;
      world.selectedTower = null;
      sfx.click();
      announce(`${TOWER_ORDER.includes(card.key) ? card.key : ''} tower selected. Click the glade to plant it.`);
      return;
    }
  }
  // Wave button.
  const wb = layout.waveBtn;
  if (x >= wb.x && x <= wb.x + wb.w && y >= wb.y && y <= wb.y + wb.h) {
    if (startWave(world)) announce(`Wave ${world.wave} incoming!`);
    return;
  }
  // Upgrade / sell buttons for the selected tower.
  if (world.selectedTower) {
    const up = layout.upgradeBtn;
    const sl = layout.sellBtn;
    if (x >= up.x && x <= up.x + up.w && y >= up.y && y <= up.y + up.h) {
      upgradeSelected(world);
      return;
    }
    if (x >= sl.x && x <= sl.x + sl.w && y >= sl.y && y <= sl.y + sl.h) {
      sellSelected(world);
      announce('Tower sold.');
      return;
    }
  }
  // Field: select an existing tower, or plant the selected type.
  if (y > FIELD.hudHeight && y < FIELD.height - FIELD.shopHeight) {
    const existing = towerAt(world, x, y);
    if (existing) {
      world.selectedTower = existing;
      sfx.click();
      announce(`Tower selected. Level ${existing.level}.`);
      return;
    }
    world.selectedTower = null;
    if (placeTower(world, world.selectedType, x, y)) {
      announce(`Tower planted. Sap ${world.sap}.`);
    }
  }
}

canvas.addEventListener('click', (event) => {
  const p = toLogical(event);
  handleClick(p.x, p.y);
});

canvas.addEventListener('mousemove', (event) => {
  const p = toLogical(event);
  world.hover = { x: p.x, y: p.y, inside: true };
});

canvas.addEventListener('mouseleave', () => {
  world.hover.inside = false;
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  world.selectedTower = null;
});

// --- Keyboard shortcuts ----------------------------------------------------
window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === '1' || key === '2' || key === '3') {
    world.selectedType = TOWER_ORDER[Number(key) - 1];
    world.selectedTower = null;
    sfx.click();
    return;
  }
  if (key === ' ') {
    event.preventDefault();
    ensureAudio();
    if (world.screen === SCREEN_TITLE || world.screen === SCREEN_WIN || world.screen === SCREEN_OVER) {
      beginGame(world);
    } else {
      startWave(world);
    }
    return;
  }
  if (key === 'u') { upgradeSelected(world); return; }
  if (key === 's') { sellSelected(world); return; }
  if (key === 'p' && world.screen === SCREEN_PLAY) {
    world.paused = !world.paused;
    sfx.click();
    return;
  }
  if (key === 'm') {
    const muted = toggleMute();
    showMessage(world, muted ? 'Sound off' : 'Sound on', 1.2);
    return;
  }
  if (key === 'r') {
    beginGame(world);
    return;
  }
  if (key === 'escape') {
    world.selectedTower = null;
  }
});

window.addEventListener('resize', fitCanvas);

// --- Boot ------------------------------------------------------------------
fitCanvas();

if (shotName) {
  // Screenshot mode: stage the deterministic scene and draw one frame.
  const staged = stageShot(shotName, world);
  world.best = Math.max(world.best, staged.best);
  render(ctx, world);
} else {
  // Live game: fixed-step simulation with a capped frame delta.
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      stepWorld(world, STEP);
      acc -= STEP;
    }
    // Idle sway on the title screen so the glade feels alive.
    if (world.screen === SCREEN_TITLE) world.time += dt;
    render(ctx, world);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
