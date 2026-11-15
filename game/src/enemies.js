// Blight spores: the enemies that march the path toward the World Tree.
// Four kinds, each with its own speed, toughness, sap bounty and tree damage.
import { jitter } from './rng.js';
import { pointAlong } from './path.js';

export const ENEMY_TYPES = {
  mote: { hp: 18, speed: 56, sap: 6, damage: 1, radius: 9, color: '#c86dd7', dark: '#8e3fa3', name: 'Mote' },
  puff: { hp: 48, speed: 38, sap: 10, damage: 1, radius: 13, color: '#e07a5f', dark: '#a34a33', name: 'Puff' },
  wisp: { hp: 26, speed: 88, sap: 9, damage: 1, radius: 8, color: '#f2d06b', dark: '#b8932e', name: 'Wisp' },
  brute: { hp: 170, speed: 24, sap: 22, damage: 3, radius: 18, color: '#7a4fd0', dark: '#4e2a94', name: 'Brute' },
};

let nextId = 1;

export function makeEnemy(kind, wave, rng) {
  const base = ENEMY_TYPES[kind];
  const hpScale = 1 + 0.22 * (wave - 1);
  return {
    id: nextId,
    kind,
    name: base.name,
    x: -24,
    y: 150,
    dist: 0,
    maxHp: Math.round(base.hp * hpScale),
    hp: Math.round(base.hp * hpScale),
    speed: base.speed * (0.95 + rng() * 0.1),
    sap: base.sap,
    damage: base.damage,
    radius: base.radius,
    color: base.color,
    dark: base.dark,
    slowUntil: 0,
    slowFactor: 1,
    flash: 0,
    wobble: rng() * Math.PI * 2,
    wobbleAmp: jitter(rng, 3),
    dead: false,
    leaked: false,
  };
}

// Move one enemy along the path for dt seconds. Returns true when it reaches the tree.
export function stepEnemy(enemy, dt, now, totalLength) {
  if (enemy.dead || enemy.leaked) return false;
  const slowed = now < enemy.slowUntil;
  const speed = enemy.speed * (slowed ? enemy.slowFactor : 1);
  enemy.dist += speed * dt;
  enemy.wobble += dt * 6;
  if (enemy.flash > 0) enemy.flash = Math.max(0, enemy.flash - dt * 6);
  if (enemy.dist >= totalLength) {
    enemy.leaked = true;
    return true;
  }
  const pos = pointAlong(enemy.dist);
  const wob = Math.sin(enemy.wobble) * enemy.wobbleAmp;
  enemy.x = pos.x + wob * 0.4;
  enemy.y = pos.y + wob;
  return false;
}

// Apply damage; returns true when the hit kills the enemy.
export function hurtEnemy(enemy, amount) {
  if (enemy.dead) return false;
  enemy.hp -= amount;
  enemy.flash = 1;
  if (enemy.hp <= 0) {
    enemy.dead = true;
    return true;
  }
  return false;
}

// Chill an enemy: it moves slower until `now + duration`.
export function chillEnemy(enemy, now, duration, factor) {
  enemy.slowUntil = Math.max(enemy.slowUntil, now + duration);
  enemy.slowFactor = factor;
}
