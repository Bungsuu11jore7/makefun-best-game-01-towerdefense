// The three rootwarden towers: Thorn Shooter, Spore Cloud and Frost Bloom.
// Placement rules, targeting (furthest along the path), firing, upgrades, selling.
import { distToPath, TREE, FIELD, PATH_HALF_WIDTH } from './path.js';

export const TOWER_TYPES = {
  thorn: {
    key: 'thorn', name: 'Thorn Shooter', cost: 40, damage: 7, rate: 2.2, range: 115,
    projSpeed: 460, splash: 0, slow: 0, color: '#7ed957', dark: '#3f8f2a',
    desc: 'Fast thorns, single target',
  },
  spore: {
    key: 'spore', name: 'Spore Cloud', cost: 70, damage: 16, rate: 0.7, range: 95,
    projSpeed: 260, splash: 55, slow: 0, color: '#ff9f43', dark: '#c96a12',
    desc: 'Slow lob, splash damage',
  },
  frost: {
    key: 'frost', name: 'Frost Bloom', cost: 50, damage: 4, rate: 1.2, range: 105,
    projSpeed: 380, splash: 0, slow: 0.55, color: '#6fd3ff', dark: '#2a7fb8',
    desc: 'Chills spores, slows them',
  },
};

export const TOWER_ORDER = ['thorn', 'spore', 'frost'];
export const MAX_LEVEL = 3;

export function towerStats(type, level) {
  const base = TOWER_TYPES[type];
  const mult = 1 + 0.55 * (level - 1);
  return {
    damage: Math.round(base.damage * mult),
    rate: base.rate * (1 + 0.12 * (level - 1)),
    range: base.range + 12 * (level - 1),
  };
}

export function upgradeCost(type, level) {
  return Math.round(TOWER_TYPES[type].cost * 0.8 * level);
}

export function sellValue(tower) {
  let spent = TOWER_TYPES[tower.type].cost;
  for (let l = 1; l < tower.level; l += 1) spent += upgradeCost(tower.type, l);
  return Math.round(spent * 0.7);
}

let nextTowerId = 1;

export function makeTower(type, x, y) {
  return {
    id: nextTowerId,
    type,
    x,
    y,
    level: 1,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
    kills: 0,
  };
}

// Why a spot cannot hold a tower, or null when it can.
export function placementProblem(x, y, towers) {
  if (x < 24 || x > FIELD.width - 24 || y < FIELD.hudHeight + 20 || y > FIELD.height - FIELD.shopHeight - 16) {
    return 'Too close to the edge';
  }
  if (distToPath(x, y) < PATH_HALF_WIDTH + 16) return 'Too close to the path';
  if (Math.hypot(x - TREE.x, y - TREE.y) < TREE.radius + 34) return 'Too close to the World Tree';
  for (const t of towers) {
    if (Math.hypot(x - t.x, y - t.y) < 44) return 'Too close to another tower';
  }
  return null;
}

// The enemy furthest along the path inside this tower's range, or null.
export function acquireTarget(tower, enemies) {
  const stats = towerStats(tower.type, tower.level);
  let best = null;
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= stats.range + e.radius && (best === null || e.dist > best.dist)) best = e;
  }
  return best;
}
