// The blight path: a winding dirt trail the spores march along from the western
// edge of the glade to the World Tree. Towers may not be built on it.
export const FIELD = { width: 1280, height: 720, hudHeight: 56, shopHeight: 80 };
export const TREE = { x: 1162, y: 360, radius: 46 };

// Waypoints of the path, left to right. The last point is the tree's doorstep.
export const WAYPOINTS = [
  { x: -24, y: 150 },
  { x: 280, y: 150 },
  { x: 280, y: 430 },
  { x: 600, y: 430 },
  { x: 600, y: 172 },
  { x: 880, y: 172 },
  { x: 880, y: 540 },
  { x: 1080, y: 540 },
  { x: 1080, y: 360 },
  { x: 1116, y: 360 },
];

export const PATH_HALF_WIDTH = 26;

// Distance from a point to one line segment.
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Shortest distance from a point to the whole path.
export function distToPath(x, y) {
  let best = Infinity;
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    best = Math.min(best, distToSegment(x, y, a.x, a.y, b.x, b.y));
  }
  return best;
}

// Total length of the path, used to measure how far an enemy has marched.
export function pathLength() {
  let total = 0;
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    total += Math.hypot(WAYPOINTS[i + 1].x - WAYPOINTS[i].x, WAYPOINTS[i + 1].y - WAYPOINTS[i].y);
  }
  return total;
}

// Position a given distance along the path (clamped to the end).
export function pointAlong(distance) {
  let remaining = distance;
  for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
    const a = WAYPOINTS[i];
    const b = WAYPOINTS[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= seg;
  }
  const last = WAYPOINTS[WAYPOINTS.length - 1];
  return { x: last.x, y: last.y };
}
