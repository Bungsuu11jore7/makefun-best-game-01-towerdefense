// Seeded random numbers for ROOTWARDEN: every run with the same seed plays the
// same way, so the screenshot scenes are reproducible frame for frame.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one element of an array with the seeded rng.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

// A small jitter in [-amount, amount] for visual wobble and spawn offsets.
export function jitter(rng, amount) {
  return (rng() * 2 - 1) * amount;
}
