// Verde Bay — the city itself: road grid, blocks, buildings, parks, beach and
// the named places missions use. Everything is generated from one seed so the
// city is identical every run and every screenshot replays the same streets.
import { BEACH_Y, PALETTE, ROAD, WATER_Y, WORLD } from './config.js';
import { makeRng } from './rng.js';

const LANDMARK_SPOTS = [
  { name: 'Reyes Safehouse', kind: 'safehouse', bx: 1, by: 3 },
  { name: 'Verde Bank', kind: 'bank', bx: 5, by: 2 },
  { name: 'Chop Shop', kind: 'chopshop', bx: 9, by: 4 },
  { name: 'Marina Docks', kind: 'docks', bx: 10, by: 5 },
  { name: 'City Hospital', kind: 'hospital', bx: 3, by: 1 },
  { name: 'Spray Shop', kind: 'spray', bx: 6, by: 4 },
  { name: 'Police HQ', kind: 'policehq', bx: 5, by: 4 },
  { name: 'Bay Stadium', kind: 'stadium', bx: 1, by: 4 },
  { name: 'Palma Mall', kind: 'mall', bx: 8, by: 2 },
];

export function buildCity(seed) {
  const rng = makeRng(seed);
  const roadsX = [];
  const roadsY = [];
  for (let x = ROAD.first; x < WORLD.width; x += ROAD.spacing) roadsX.push(x);
  for (let y = ROAD.first; y < BEACH_Y - 120; y += ROAD.spacing) roadsY.push(y);

  const blocks = [];
  const buildings = [];
  const trees = [];
  const parked = [];
  const colCount = roadsX.length - 1;
  const rowCount = roadsY.length - 1;

  for (let by = 0; by < rowCount; by += 1) {
    for (let bx = 0; bx < colCount; bx += 1) {
      const x0 = roadsX[bx] + ROAD.width / 2 + 6;
      const y0 = roadsY[by] + ROAD.width / 2 + 6;
      const x1 = roadsX[bx + 1] - ROAD.width / 2 - 6;
      const y1 = roadsY[by + 1] - ROAD.width / 2 - 6;
      const roll = rng.next();
      const type = by >= rowCount - 1 ? 'beach' : roll < 0.58 ? 'buildings' : roll < 0.73 ? 'park' : roll < 0.88 ? 'parking' : 'plaza';
      const block = { x: x0, y: y0, w: x1 - x0, h: y1 - y0, type, buildings: [], trees: [] };
      if (type === 'buildings') {
        const count = rng.int(1, 3);
        for (let i = 0; i < count; i += 1) {
          const bw = rng.range(70, Math.min(150, block.w - 20));
          const bh = rng.range(55, Math.min(120, block.h - 20));
          const bx0 = block.x + rng.range(8, Math.max(9, block.w - bw - 8));
          const by0 = block.y + rng.range(8, Math.max(9, block.h - bh - 8));
          const b = {
            x: bx0, y: by0, w: bw, h: bh,
            height: rng.range(14, 58),
            color: rng.pick(PALETTE.buildingRoof),
            windows: rng.int(2, 5),
          };
          block.buildings.push(b);
          buildings.push(b);
        }
      } else if (type === 'park') {
        for (let i = 0; i < rng.int(5, 9); i += 1) {
          const t = { x: block.x + rng.range(14, block.w - 14), y: block.y + rng.range(14, block.h - 14), r: rng.range(9, 15) };
          block.trees.push(t);
          trees.push(t);
        }
      } else if (type === 'parking') {
        for (let i = 0; i < rng.int(3, 6); i += 1) {
          parked.push({
            x: block.x + rng.range(30, block.w - 30),
            y: block.y + rng.range(30, block.h - 30),
            angle: rng.pick([0, Math.PI / 2]),
            color: rng.pick(['#c23b2e', '#2e6fc2', '#e8b13c', '#3fae6a', '#e8e8e8', '#7a4fae']),
          });
        }
      }
      blocks.push(block);
    }
  }

  // Named places: one big building each, planted on its block.
  const landmarks = {};
  for (const spot of LANDMARK_SPOTS) {
    const block = blocks[spot.by * colCount + spot.bx];
    const b = {
      x: block.x + block.w * 0.2, y: block.y + block.h * 0.22,
      w: block.w * 0.6, h: block.h * 0.56, height: 46,
      color: spot.kind === 'hospital' ? '#e8e8e8' : spot.kind === 'bank' ? '#d8b25e' : spot.kind === 'policehq' ? '#5a7fb8' : '#c98f7a',
      windows: 4, landmark: spot.kind,
    };
    block.buildings.push(b);
    buildings.push(b);
    landmarks[spot.kind] = { name: spot.name, kind: spot.kind, x: b.x + b.w / 2, y: b.y + b.h / 2, w: b.w, h: b.h };
  }

  const city = {
    roadsX, roadsY, blocks, buildings, trees, parked, landmarks,
    spawn: { x: landmarks.safehouse.x + 130, y: landmarks.safehouse.y + 90 },
  };
  return city;
}

export function isOnRoad(city, x, y) {
  const half = ROAD.width / 2;
  for (const rx of city.roadsX) if (Math.abs(x - rx) <= half && y >= 0 && y <= BEACH_Y) return true;
  for (const ry of city.roadsY) if (Math.abs(y - ry) <= half && x >= 0 && x <= WORLD.width) return true;
  return false;
}

export function roadDirectionAt(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { dx: 0, dy: 1 }; }
  }
  for (const ry of city.roadsY) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { dx: 1, dy: 0 }; }
  }
  return best;
}

// Snap a point onto the nearest road centreline.
export function nearestRoadPoint(city, x, y) {
  let bx = city.roadsX[0];
  let bd = Math.abs(x - bx);
  for (const rx of city.roadsX) if (Math.abs(x - rx) < bd) { bd = Math.abs(x - rx); bx = rx; }
  let by = city.roadsY[0];
  bd = Math.abs(y - by);
  for (const ry of city.roadsY) if (Math.abs(y - ry) < bd) { bd = Math.abs(y - ry); by = ry; }
  return Math.abs(x - bx) < Math.abs(y - by) ? { x: bx, y } : { x, y: by };
}

export function randomRoadPoint(city, rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(city.roadsX), y: rng.range(ROAD.first, BEACH_Y - 60), along: 'y' };
  }
  return { x: rng.range(ROAD.first, WORLD.width - 60), y: rng.pick(city.roadsY), along: 'x' };
}

// Push a circle out of every building it overlaps. Returns corrected {x, y}.
export function resolveBuildingCollision(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        y = b.y - r;
      }
    }
  }
  return { x, y };
}

export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
