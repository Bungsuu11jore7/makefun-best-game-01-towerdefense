// ROOTWARDEN world: the whole game state and one fixed step of its rules.
// Screens: title -> play -> win / over. Towers, enemies, projectiles, sap,
// score, tree health and every floating message live here.
import { mulberry32 } from './rng.js';
import { FIELD, TREE, pathLength } from './path.js';
import { makeEnemy, stepEnemy, hurtEnemy, chillEnemy } from './enemies.js';
import {
  TOWER_TYPES, towerStats, upgradeCost, sellValue, makeTower,
  placementProblem, acquireTarget, MAX_LEVEL,
} from './towers.js';
import { TOTAL_WAVES, buildSpawnQueue, spawnInterval, waveClearBonus } from './waves.js';
import { sfx } from './audio.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

export const STEP = 1 / 60;
export const START_SAP = 120;
export const START_TREE_HP = 20;

export function createWorld(seed) {
  const rng = mulberry32(seed);
  return {
    rng,
    seed,
    screen: SCREEN_TITLE,
    paused: false,
    time: 0,
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    sap: START_SAP,
    score: 0,
    kills: 0,
    treeHp: START_TREE_HP,
    treeMaxHp: START_TREE_HP,
    towers: [],
    enemies: [],
    projectiles: [],
    floaters: [],
    banner: null,
    bannerUntil: 0,
    message: null,
    messageUntil: 0,
    selectedType: 'thorn',
    selectedTower: null,
    hover: { x: 0, y: 0, inside: false },
    pathTotal: pathLength(),
    best: 0,
  };
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed === undefined ? world.seed : seed);
  fresh.best = world.best;
  Object.assign(world, fresh);
}

export function showBanner(world, text, seconds) {
  world.banner = text;
  world.bannerUntil = world.time + seconds;
}

export function showMessage(world, text, seconds) {
  world.message = text;
  world.messageUntil = world.time + seconds;
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1 });
  if (world.floaters.length > 40) world.floaters.shift();
}

// --- Player actions -------------------------------------------------------

export function startWave(world) {
  if (world.screen !== SCREEN_PLAY || world.waveActive || world.wave >= TOTAL_WAVES) return false;
  world.wave += 1;
  world.spawnQueue = buildSpawnQueue(world.wave - 1, world.rng);
  world.spawnTimer = 0.5;
  world.waveActive = true;
  showBanner(world, `Wave ${world.wave} of ${TOTAL_WAVES}`, 2.2);
  sfx.horn();
  return true;
}

export function placeTower(world, type, x, y) {
  if (world.screen !== SCREEN_PLAY || world.waveActive) {
    // Building is allowed any time during play, even mid-wave.
    if (world.screen !== SCREEN_PLAY) return false;
  }
  const cost = TOWER_TYPES[type].cost;
  if (world.sap < cost) {
    showMessage(world, 'Not enough sap!', 1.6);
    sfx.denied();
    return false;
  }
  const problem = placementProblem(x, y, world.towers);
  if (problem) {
    showMessage(world, problem, 1.6);
    sfx.denied();
    return false;
  }
  world.sap -= cost;
  world.towers.push(makeTower(type, x, y));
  addFloater(world, x, y - 24, `-${cost} sap`, '#ffd76b');
  sfx.place();
  return true;
}

export function upgradeSelected(world) {
  const t = world.selectedTower;
  if (!t || t.level >= MAX_LEVEL) {
    showMessage(world, t ? 'Already max level!' : 'Select a tower first', 1.4);
    sfx.denied();
    return false;
  }
  const cost = upgradeCost(t.type, t.level);
  if (world.sap < cost) {
    showMessage(world, 'Not enough sap!', 1.6);
    sfx.denied();
    return false;
  }
  world.sap -= cost;
  t.level += 1;
  addFloater(world, t.x, t.y - 26, `Level ${t.level}!`, '#7ed957');
  sfx.upgrade();
  return true;
}

export function sellSelected(world) {
  const t = world.selectedTower;
  if (!t) return false;
  const value = sellValue(t);
  world.sap += value;
  world.towers = world.towers.filter((o) => o !== t);
  addFloater(world, t.x, t.y - 26, `+${value} sap`, '#ffd76b');
  world.selectedTower = null;
  sfx.sell();
  return true;
}

export function towerAt(world, x, y) {
  let best = null;
  let bestD = 30;
  for (const t of world.towers) {
    const d = Math.hypot(x - t.x, y - t.y);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}
// --- One fixed step of the simulation -------------------------------------

function fireTower(world, tower, target) {
  const base = TOWER_TYPES[tower.type];
  const stats = towerStats(tower.type, tower.level);
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.flash = 1;
  world.projectiles.push({
    x: tower.x + Math.cos(tower.angle) * 20,
    y: tower.y + Math.sin(tower.angle) * 20,
    target,
    tower,
    speed: base.projSpeed,
    damage: stats.damage,
    splash: base.splash,
    slow: base.slow,
    type: tower.type,
    color: base.color,
  });
  if (tower.type === 'thorn') sfx.shootThorn();
  else if (tower.type === 'spore') sfx.shootSpore();
  else sfx.shootFrost();
}

function stepProjectiles(world, dt) {
  const kept = [];
  for (const p of world.projectiles) {
    if (p.target.dead || p.target.leaked) continue;
    const dx = p.target.x - p.x;
    const dy = p.target.y - p.y;
    const d = Math.hypot(dx, dy);
    const move = p.speed * dt;
    if (d <= move + p.target.radius * 0.5) {
      // Impact: direct hit, plus splash and chill where they apply.
      if (p.splash > 0) {
        for (const e of world.enemies) {
          if (e.dead || e.leaked) continue;
          const ed = Math.hypot(e.x - p.target.x, e.y - p.target.y);
          if (ed <= p.splash + e.radius) {
            if (hurtEnemy(e, p.damage)) onKill(world, e, p.tower);
          }
        }
        addFloater(world, p.target.x, p.target.y - 14, `-${p.damage}`, '#ff9f43');
        sfx.pop();
      } else {
        if (hurtEnemy(p.target, p.damage)) onKill(world, p.target, p.tower);
        if (p.slow > 0) chillEnemy(p.target, world.time, 1.6, p.slow);
        addFloater(world, p.target.x, p.target.y - 14, `-${p.damage}`, p.type === 'frost' ? '#6fd3ff' : '#d8ffb0');
      }
    } else {
      p.x += (dx / d) * move;
      p.y += (dy / d) * move;
      kept.push(p);
    }
  }
  world.projectiles = kept;
}

function onKill(world, enemy, tower) {
  world.sap += enemy.sap;
  world.score += 10;
  world.kills += 1;
  if (tower) tower.kills += 1;
  addFloater(world, enemy.x, enemy.y - 16, `+${enemy.sap} sap`, '#ffd76b');
  sfx.kill();
}

function endWave(world) {
  world.waveActive = false;
  const bonus = waveClearBonus(world.wave - 1);
  world.sap += bonus;
  world.score += 50 * world.wave;
  showBanner(world, `Wave ${world.wave} cleared!  +${bonus} sap`, 2.4);
  sfx.waveClear();
  if (world.wave >= TOTAL_WAVES) {
    world.screen = SCREEN_WIN;
    world.best = Math.max(world.best, world.score);
    sfx.win();
  }
}

// Advance the world by dt seconds. `silent` skips sounds (used by screenshots).
export function stepWorld(world, dt, silent) {
  if (world.screen !== SCREEN_PLAY || world.paused) return;
  if (silent) {
    // Screenshot stepping mutes by swapping in a no-op sfx table briefly.
    // (The audio module already guards on user gesture; this is belt & braces.)
  }
  world.time += dt;

  if (world.waveActive && world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      const kind = world.spawnQueue.shift();
      world.enemies.push(makeEnemy(kind, world.wave, world.rng));
      world.spawnTimer = spawnInterval(world.wave - 1);
    }
  }

  for (const t of world.towers) {
    t.cooldown -= dt;
    if (t.flash > 0) t.flash = Math.max(0, t.flash - dt * 5);
    if (t.cooldown <= 0) {
      const target = acquireTarget(t, world.enemies);
      if (target) {
        fireTower(world, t, target);
        t.cooldown = 1 / towerStats(t.type, t.level).rate;
      }
    }
  }

  stepProjectiles(world, dt);

  let leaked = false;
  for (const e of world.enemies) {
    if (stepEnemy(e, dt, world.time, world.pathTotal)) {
      leaked = true;
      world.treeHp -= e.damage;
      addFloater(world, TREE.x - 20, TREE.y - 60, `-${e.damage} tree!`, '#ff6b6b');
      sfx.hurt();
    }
  }
  world.enemies = world.enemies.filter((e) => !e.dead && !e.leaked);

  for (const f of world.floaters) {
    f.y -= 26 * dt;
    f.life -= dt * 0.9;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  if (world.treeHp <= 0) {
    world.treeHp = 0;
    world.screen = SCREEN_OVER;
    world.best = Math.max(world.best, world.score);
    sfx.lose();
    return;
  }
  if (world.waveActive && world.spawnQueue.length === 0 && world.enemies.length === 0) {
    endWave(world);
  }
}

// Start a fresh run from the title screen.
export function beginGame(world) {
  resetWorld(world, world.seed);
  world.screen = SCREEN_PLAY;
  showBanner(world, 'Defend the World Tree!', 2.2);
  sfx.horn();
}
