// The eight waves of the blight. Each wave lists how many of each spore marches;
// health grows wave by wave, and the gaps between spawns shrink.
export const TOTAL_WAVES = 8;

export const WAVES = [
  { mote: 6, puff: 0, wisp: 0, brute: 0 },
  { mote: 10, puff: 2, wisp: 0, brute: 0 },
  { mote: 12, puff: 5, wisp: 0, brute: 0 },
  { mote: 10, puff: 8, wisp: 4, brute: 0 },
  { mote: 14, puff: 8, wisp: 6, brute: 2 },
  { mote: 12, puff: 12, wisp: 8, brute: 4 },
  { mote: 16, puff: 14, wisp: 10, brute: 6 },
  { mote: 20, puff: 16, wisp: 12, brute: 10 },
];

// Build the spawn queue for a wave: an ordered list of kinds, shuffled with a
// seeded rng but always starting with a couple of motes so the wave reads well.
export function buildSpawnQueue(waveIndex, rng) {
  const def = WAVES[waveIndex];
  const queue = [];
  for (const [kind, count] of Object.entries(def)) {
    for (let i = 0; i < count; i += 1) queue.push(kind);
  }
  // Shuffle the tail, keep the first two as motes when there are any.
  const head = queue.splice(0, Math.min(2, queue.length));
  for (let i = queue.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return head.concat(queue);
}

// Seconds between spawns in this wave.
export function spawnInterval(waveIndex) {
  return Math.max(0.45, 0.95 - waveIndex * 0.06);
}

// Sap bonus for clearing a wave with the tree still standing.
export function waveClearBonus(waveIndex) {
  return 30 + waveIndex * 15;
}
