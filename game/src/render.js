// ROOTWARDEN rendering: every pixel the player sees, drawn on one canvas.
// Field, path, World Tree, towers, spores, HUD, shop, banners and screens.
import { FIELD, TREE, WAYPOINTS, PATH_HALF_WIDTH } from './path.js';
import { TOWER_TYPES, TOWER_ORDER, towerStats, upgradeCost, sellValue, MAX_LEVEL } from './towers.js';
import { TOTAL_WAVES } from './waves.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_OVER } from './world.js';

const GRASS_A = '#2e5d33';
const GRASS_B = '#2a5230';
const PATH_COLOR = '#8a6b46';
const PATH_EDGE = '#6e5236';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawField(ctx, world) {
  ctx.fillStyle = GRASS_A;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  // Soft checker meadow.
  ctx.fillStyle = GRASS_B;
  const cell = 64;
  for (let y = FIELD.hudHeight; y < FIELD.height - FIELD.shopHeight; y += cell) {
    for (let x = 0; x < FIELD.width; x += cell) {
      if (((x + y) / cell) % 2 === 0) ctx.fillRect(x, y, cell, cell);
    }
  }
  // Flower dots, seeded by fixed positions so the field is stable.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (let i = 0; i < 46; i += 1) {
    const fx = (i * 173) % 1240 + 20;
    const fy = FIELD.hudHeight + ((i * 97) % 540) + 10;
    ctx.beginPath();
    ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // The winding dirt path.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = PATH_EDGE;
  ctx.lineWidth = PATH_HALF_WIDTH * 2 + 8;
  ctx.beginPath();
  WAYPOINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = PATH_COLOR;
  ctx.lineWidth = PATH_HALF_WIDTH * 2;
  ctx.beginPath();
  WAYPOINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
  // Pebbles on the path.
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let i = 0; i < 30; i += 1) {
    const px = (i * 211) % 1180 + 30;
    const py = FIELD.hudHeight + ((i * 131) % 540) + 10;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTree(ctx, world) {
  const sway = Math.sin(world.time * 1.2) * 3;
  const hurt = world.treeHp <= 5;
  ctx.save();
  ctx.translate(TREE.x, TREE.y);
  // Glow when the tree is in danger.
  if (hurt) {
    ctx.fillStyle = 'rgba(255,80,80,0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, TREE.radius + 18 + Math.sin(world.time * 6) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Trunk.
  ctx.fillStyle = '#6b4423';
  ctx.beginPath();
  ctx.moveTo(-16, 34);
  ctx.quadraticCurveTo(-12, -6, -8, -14);
  ctx.lineTo(8, -14);
  ctx.quadraticCurveTo(12, -6, 16, 34);
  ctx.closePath();
  ctx.fill();
  // Canopy: three overlapping crowns.
  const crowns = [
    { x: -26 + sway, y: -26, r: 30, c: '#3f8f2a' },
    { x: 24 + sway, y: -28, r: 30, c: '#4da634' },
    { x: 0 + sway, y: -46, r: 36, c: '#63c144' },
  ];
  for (const c of crowns) {
    ctx.fillStyle = c.c;
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Golden fruit lights.
  ctx.fillStyle = '#ffd76b';
  for (const [fx, fy] of [[-18, -40], [14, -52], [26, -24], [-30, -18], [2, -30]]) {
    ctx.beginPath();
    ctx.arc(fx + sway, fy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Face: two sleepy eyes watching the glade.
  ctx.fillStyle = '#1d2b16';
  ctx.beginPath();
  ctx.arc(-7, 4, 3, 0, Math.PI * 2);
  ctx.arc(7, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Tree health bar under the tree.
  const w = 84;
  const ratio = Math.max(0, world.treeHp / world.treeMaxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, TREE.x - w / 2, TREE.y + 52, w, 10, 5);
  ctx.fill();
  ctx.fillStyle = ratio > 0.5 ? '#7ed957' : ratio > 0.25 ? '#ffb347' : '#ff6b6b';
  roundRect(ctx, TREE.x - w / 2 + 1, TREE.y + 53, (w - 2) * ratio, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`TREE ${world.treeHp}/${world.treeMaxHp}`, TREE.x, TREE.y + 76);
}

function drawTower(ctx, tower) {
  const base = TOWER_TYPES[tower.type];
  const stats = towerStats(tower.type, tower.level);
  ctx.save();
  ctx.translate(tower.x, tower.y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 12, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Base mound.
  ctx.fillStyle = '#5a4632';
  ctx.beginPath();
  ctx.arc(0, 4, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = base.dark;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  if (tower.type === 'thorn') {
    // Spiky shooter: a green pod with thorns pointing at its aim.
    ctx.rotate(tower.angle);
    ctx.fillStyle = base.color;
    for (let i = -1; i <= 1; i += 1) {
      ctx.save();
      ctx.rotate(i * 0.45);
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(26, -4);
      ctx.lineTo(26, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eaffd0';
    ctx.beginPath();
    ctx.arc(4, -3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'spore') {
    // Puffball: a round orange cap that glows when it fires.
    ctx.fillStyle = tower.flash > 0.4 ? '#ffd76b' : base.color;
    ctx.beginPath();
    ctx.arc(0, -4, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = base.dark;
    ctx.fillRect(-13, -4, 26, 5);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -9, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -11, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Frost bloom: a crystal flower, pale blue.
    ctx.fillStyle = base.color;
    for (let i = 0; i < 6; i += 1) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3 + Math.sin(tower.x) * 0.1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-4, -16);
      ctx.lineTo(4, -16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#eafcff';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Level pips above the tower.
  for (let i = 0; i < tower.level; i += 1) {
    ctx.fillStyle = '#ffd76b';
    ctx.beginPath();
    ctx.arc(tower.x - 10 + i * 10, tower.y - 26, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemy(ctx, enemy, now) {
  const slowed = now < enemy.slowUntil;
  const x = enemy.x;
  const y = enemy.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius * 0.8, enemy.radius, enemy.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // Blobby spore body.
  ctx.fillStyle = enemy.flash > 0.3 ? '#ffffff' : enemy.color;
  ctx.beginPath();
  ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = enemy.dark;
  for (let i = 0; i < 3; i += 1) {
    const a = enemy.wobble + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * enemy.radius * 0.55, Math.sin(a) * enemy.radius * 0.55, enemy.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  // Angry eyes facing the tree (to the right).
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(3, -3, 3.2, 0, Math.PI * 2);
  ctx.arc(3, 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1026';
  ctx.beginPath();
  ctx.arc(4.5, -3, 1.6, 0, Math.PI * 2);
  ctx.arc(4.5, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (slowed) {
    ctx.strokeStyle = '#6fd3ff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  // Health bar.
  if (enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - w / 2, y - enemy.radius - 10, w, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7ed957' : '#ff9f43';
    ctx.fillRect(x - w / 2, y - enemy.radius - 10, w * ratio, 5);
  }
}

function drawProjectiles(ctx, world) {
  for (const p of world.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.type === 'spore' ? 7 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(p.x - 1.5, p.y - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFloaters(ctx, world) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px sans-serif';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.fillStyle = f.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

// --- HUD, shop and overlays -----------------------------------------------

// Layout the shop cards and buttons once so input and rendering agree.
export function shopLayout() {
  const cards = [];
  const cardW = 210;
  const gap = 14;
  const startX = 16;
  TOWER_ORDER.forEach((key, i) => {
    cards.push({ key, x: startX + i * (cardW + gap), y: FIELD.height - FIELD.shopHeight + 8, w: cardW, h: 64 });
  });
  return {
    cards,
    waveBtn: { x: 700, y: FIELD.height - FIELD.shopHeight + 8, w: 150, h: 64 },
    upgradeBtn: { x: 866, y: FIELD.height - FIELD.shopHeight + 8, w: 130, h: 30 },
    sellBtn: { x: 866, y: FIELD.height - FIELD.shopHeight + 42, w: 130, h: 30 },
    helpBtn: { x: 1012, y: FIELD.height - FIELD.shopHeight + 8, w: 252, h: 64 },
  };
}

function drawHud(ctx, world) {
  ctx.fillStyle = '#1e3a24';
  ctx.fillRect(0, 0, FIELD.width, FIELD.hudHeight);
  ctx.fillStyle = '#162b1a';
  ctx.fillRect(0, FIELD.hudHeight - 4, FIELD.width, 4);
  ctx.fillStyle = '#eaffd0';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🌳 ROOTWARDEN', 16, 36);
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#ffd76b';
  ctx.fillText(`Sap  💧 ${world.sap}`, 260, 35);
  ctx.fillStyle = '#fff';
  ctx.fillText(`Score  ⭐ ${world.score}`, 430, 35);
  ctx.fillText(`Wave  🌊 ${world.wave} / ${TOTAL_WAVES}`, 600, 35);
  ctx.fillText(`Kills  💥 ${world.kills}`, 760, 35);
  // Tree health as a labelled bar.
  ctx.fillStyle = '#fff';
  ctx.fillText('Tree', 900, 35);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  roundRect(ctx, 950, 22, 180, 16, 8);
  ctx.fill();
  const ratio = Math.max(0, world.treeHp / world.treeMaxHp);
  ctx.fillStyle = ratio > 0.5 ? '#7ed957' : ratio > 0.25 ? '#ffb347' : '#ff6b6b';
  roundRect(ctx, 951, 23, 178 * ratio, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${world.treeHp} / ${world.treeMaxHp}`, 1040, 34);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#9fd8a4';
  ctx.font = '13px sans-serif';
  ctx.fillText(`Best ${world.best}`, 1150, 35);
}

function drawShop(ctx, world) {
  const layout = shopLayout();
  ctx.fillStyle = '#1e3a24';
  ctx.fillRect(0, FIELD.height - FIELD.shopHeight, FIELD.width, FIELD.shopHeight);
  ctx.fillStyle = '#162b1a';
  ctx.fillRect(0, FIELD.height - FIELD.shopHeight, FIELD.width, 4);
  for (const card of layout.cards) {
    const base = TOWER_TYPES[card.key];
    const selected = world.selectedType === card.key && !world.selectedTower;
    const afford = world.sap >= base.cost;
    ctx.fillStyle = selected ? '#3f6b2f' : '#2a5230';
    roundRect(ctx, card.x, card.y, card.w, card.h, 10);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd76b' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = selected ? 3 : 1.5;
    roundRect(ctx, card.x, card.y, card.w, card.h, 10);
    ctx.stroke();
    // Mini tower icon.
    ctx.fillStyle = base.color;
    ctx.beginPath();
    ctx.arc(card.x + 26, card.y + 24, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = base.dark;
    ctx.beginPath();
    ctx.arc(card.x + 26, card.y + 24, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(base.name, card.x + 48, card.y + 20);
    ctx.fillStyle = afford ? '#ffd76b' : '#ff8a8a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`💧 ${base.cost} sap   [${TOWER_ORDER.indexOf(card.key) + 1}]`, card.x + 48, card.y + 40);
    ctx.fillStyle = '#cfe8c0';
    ctx.font = '12px sans-serif';
    ctx.fillText(base.desc, card.x + 12, card.y + 57);
  }
  // Wave button.
  const wb = layout.waveBtn;
  const canWave = world.screen === SCREEN_PLAY && !world.waveActive && world.wave < TOTAL_WAVES;
  ctx.fillStyle = canWave ? '#c96a12' : '#4a4a4a';
  roundRect(ctx, wb.x, wb.y, wb.w, wb.h, 10);
  ctx.fill();
  ctx.strokeStyle = '#ffd76b';
  ctx.lineWidth = 2;
  roundRect(ctx, wb.x, wb.y, wb.w, wb.h, 10);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(world.wave >= TOTAL_WAVES ? 'FINAL WAVE!' : world.waveActive ? 'WAVE...' : 'SEND WAVE ▶', wb.x + wb.w / 2, wb.y + 28);
  ctx.font = '12px sans-serif';
  ctx.fillText('[Space]', wb.x + wb.w / 2, wb.y + 48);
  // Upgrade / sell panel for the selected tower.
  const t = world.selectedTower;
  const up = layout.upgradeBtn;
  const sl = layout.sellBtn;
  ctx.textAlign = 'center';
  if (t) {
    const stats = towerStats(t.type, t.level);
    const upCost = t.level < MAX_LEVEL ? upgradeCost(t.type, t.level) : null;
    ctx.fillStyle = upCost !== null && world.sap >= upCost ? '#3f8f2a' : '#4a4a4a';
    roundRect(ctx, up.x, up.y, up.w, up.h, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(upCost !== null ? `Upgrade ⬆ ${upCost} sap [U]` : 'MAX LEVEL ★', up.x + up.w / 2, up.y + 20);
    ctx.fillStyle = '#2a5230';
    roundRect(ctx, sl.x, sl.y, sl.w, sl.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#ffd76b';
    ctx.lineWidth = 1.5;
    roundRect(ctx, sl.x, sl.y, sl.w, sl.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#ffd76b';
    ctx.fillText(`Sell 💧 ${sellValue(t)} [S]`, sl.x + sl.w / 2, sl.y + 20);
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${TOWER_TYPES[t.type].name}  Lv ${t.level}  dmg ${stats.damage}  rng ${stats.range}`, 1012, FIELD.height - FIELD.shopHeight + 26);
    ctx.fillStyle = '#cfe8c0';
    ctx.fillText(`Kills: ${t.kills}`, 1012, FIELD.height - FIELD.shopHeight + 44);
  } else {
    ctx.fillStyle = '#cfe8c0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Click a tower to upgrade or sell it.', 1012, FIELD.height - FIELD.shopHeight + 26);
    ctx.fillText('Click the glade to plant the selected tower.', 1012, FIELD.height - FIELD.shopHeight + 44);
    ctx.fillText('Keys: 1/2/3 towers · Space wave · P pause · M mute', 1012, FIELD.height - FIELD.shopHeight + 62);
  }
  ctx.textAlign = 'left';
}

function drawBanner(ctx, world) {
  if (world.banner && world.time < world.bannerUntil) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (world.bannerUntil - world.time) * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(world.banner).width + 60;
    roundRect(ctx, FIELD.width / 2 - w / 2, 76, w, 46, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd76b';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.banner, FIELD.width / 2, 108);
    ctx.restore();
  }
  if (world.message && world.time < world.messageUntil) {
    ctx.fillStyle = 'rgba(20,10,10,0.75)';
    const w = ctx.measureText(world.message).width + 40;
    roundRect(ctx, FIELD.width / 2 - w / 2, 130, w, 32, 10);
    ctx.fill();
    ctx.fillStyle = '#ff9d9d';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, FIELD.width / 2, 151);
  }
}

function drawRangeRing(ctx, world) {
  let ring = null;
  if (world.selectedTower) {
    const stats = towerStats(world.selectedTower.type, world.selectedTower.level);
    ring = { x: world.selectedTower.x, y: world.selectedTower.y, r: stats.range };
  } else if (world.screen === SCREEN_PLAY && world.hover.inside && world.hover.y > FIELD.hudHeight && world.hover.y < FIELD.height - FIELD.shopHeight) {
    const stats = towerStats(world.selectedType, 1);
    ring = { x: world.hover.x, y: world.hover.y, r: stats.range };
  }
  if (ring) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,26,14,0.88)';
  roundRect(ctx, 340, 150, 600, 420, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  roundRect(ctx, 340, 150, 600, 420, 18);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 220);
  ctx.fillStyle = '#eaffd0';
  ctx.font = '18px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, 640, 268 + i * 34));
  ctx.fillStyle = '#ffd76b';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Click or press R to play again', 640, 268 + lines.length * 34 + 22);
}

function drawScreens(ctx, world) {
  if (world.screen === SCREEN_TITLE) {
    ctx.fillStyle = 'rgba(8,20,10,0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#ffd76b';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌳 ROOTWARDEN', 640, 200);
    ctx.fillStyle = '#eaffd0';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Defend the World Tree from the blight spores!', 640, 252);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cfe8c0';
    ctx.fillText('Plant thorn, spore and frost towers along the winding path.', 640, 300);
    ctx.fillText('Earn sap from every spore you pop. Upgrade your towers.', 640, 330);
    ctx.fillText('Survive all 8 waves — if the tree falls, the glade falls.', 640, 360);
    ctx.fillStyle = '#ffd76b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('▶  CLICK TO START  (or press Space)', 640, 430);
    ctx.fillStyle = '#9fd8a4';
    ctx.font = '15px sans-serif';
    ctx.fillText('Mouse: place & select towers  ·  1/2/3: tower type  ·  Space: send wave', 640, 480);
    ctx.fillText('U: upgrade  ·  S: sell  ·  P: pause  ·  M: mute  ·  R: restart', 640, 506);
    ctx.fillText('Best score: ' + world.best, 640, 540);
    ctx.textAlign = 'left';
    return;
  }
  if (world.screen === SCREEN_WIN) {
    panel(ctx, '🌟 THE TREE STANDS!', [
      `You survived all ${TOTAL_WAVES} waves!`,
      `Score: ${world.score}    Kills: ${world.kills}`,
      `Tree health left: ${world.treeHp} / ${world.treeMaxHp}`,
      `Best score: ${world.best}`,
      'The glade blooms again thanks to you, Rootwarden.',
    ], '#7ed957');
    return;
  }
  if (world.screen === SCREEN_OVER) {
    panel(ctx, '🥀 THE TREE HAS FALLEN', [
      `The blight reached the World Tree on wave ${world.wave}.`,
      `Score: ${world.score}    Kills: ${world.kills}`,
      `Best score: ${world.best}`,
      'Plant more towers near the bends —',
      'the spores slow down where the path turns.',
    ], '#ff6b6b');
    return;
  }
  if (world.paused) {
    ctx.fillStyle = 'rgba(8,20,10,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 340);
    ctx.font = '20px sans-serif';
    ctx.fillText('Press P to resume', 640, 384);
    ctx.textAlign = 'left';
  }
}

// --- Main entry: draw the whole frame --------------------------------------
export function render(ctx, world) {
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawField(ctx, world);
  drawRangeRing(ctx, world);
  drawTree(ctx, world);
  for (const t of world.towers) drawTower(ctx, t);
  for (const e of world.enemies) drawEnemy(ctx, e, world.time);
  drawProjectiles(ctx, world);
  drawFloaters(ctx, world);
  drawHud(ctx, world);
  drawShop(ctx, world);
  drawBanner(ctx, world);
  drawScreens(ctx, world);
}
