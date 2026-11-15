// Screenshot scenes behind ?shot=start|play|end|win. Each one plays the real
// rules forward from a fresh world with a fixed seed, steered by a simple
// autopilot (plant towers from a build plan, upgrade when rich, send the next
// wave when the field is clear), so the frame is what a real game looks like.
import { upgradeCost, TOWER_TYPES } from './towers.js';
import { STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER, createWorld, resetWorld, beginGame, startWave, placeTower, upgradeSelected, stepWorld } from './world.js';

// Tower spots near the path's bends, where one tower covers the longest stretch.
const BUILD_PLAN = [
  { type: 'thorn', x: 360, y: 230 },
  { type: 'thorn', x: 520, y: 330 },
  { type: 'frost', x: 700, y: 260 },
  { type: 'spore', x: 800, y: 260 },
  { type: 'thorn', x: 960, y: 440 },
  { type: 'frost', x: 200, y: 340 },
  { type: 'spore', x: 420, y: 520 },
  { type: 'thorn', x: 700, y: 340 },
  { type: 'frost', x: 960, y: 260 },
  { type: 'spore', x: 1024, y: 440 },
  { type: 'thorn', x: 200, y: 230 },
  { type: 'thorn', x: 520, y: 250 },
];

// One autopilot decision per step: plant the next planned tower when affordable,
// upgrade the weakest tower when everything is planted, send a wave when idle.
function autopilot(world, plan, minTowers) {
  if (world.screen !== SCREEN_PLAY) return;
  const next = plan[world.towers.length];
  if (next && world.sap >= TOWER_TYPES[next.type].cost) {
    // Plant it when affordable; when sap is short, fall through and send a
    // wave to earn more instead of stalling on the same failed placement.
    if (placeTower(world, next.type, next.x, next.y)) return;
  }
  if (world.towers.length > 0 && world.towers.some((t) => t.level < 3)) {
    const weakest = [...world.towers].sort((a, b) => a.level - b.level || a.kills - b.kills)[0];
    if (weakest && world.sap >= upgradeCost(weakest.type, weakest.level)) {
      world.selectedTower = weakest;
      upgradeSelected(world);
      world.selectedTower = null;
    }
  }
  if (!world.waveActive && world.towers.length >= minTowers) startWave(world);
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title screen over a quiet glade. play: mid-wave-3 action with HUD.
 * end: a thin defence collapses and the tree falls. win: all 8 waves cleared.
 */
export function stageShot(name, world) {
  resetWorld(world, world.seed);
  if (name !== 'play' && name !== 'end' && name !== 'win') {
    world.time = 5;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  beginGame(world);
  if (name === 'play') {
    const plan = BUILD_PLAN.slice(0, 5);
    for (let i = 0; i < 400 / STEP; i += 1) {
      autopilot(world, plan, 2);
      stepWorld(world, STEP);
      if (world.wave === 3 && world.enemies.length >= 6 && world.enemies.some((e) => e.dist > 500)) break;
      if (world.screen !== SCREEN_PLAY) break;
    }
    return { screen: SCREEN_PLAY, best: world.score };
  }
  if (name === 'end') {
    const plan = BUILD_PLAN.slice(0, 1);
    for (let i = 0; i < 600 / STEP; i += 1) {
      autopilot(world, plan, 1);
      stepWorld(world, STEP);
      if (world.screen === SCREEN_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.score };
  }
  // win: the full build plan, every wave.
  for (let i = 0; i < 1200 / STEP; i += 1) {
    autopilot(world, BUILD_PLAN, 2);
    stepWorld(world, STEP);
    if (world.screen === SCREEN_WIN || world.screen === SCREEN_OVER) break;
  }
  return { screen: world.screen, best: world.score };
}

export { createWorld };
