// Pedestrians: they stroll the sidewalks, wait at corners, and run when a car
// or a gunshot comes too close. Hitting one is a crime the police notice.
import { PEDS, ROAD } from './config.js';
import { nearestRoadPoint, resolveBuildingCollision } from './city.js';

const SHIRTS = ['#d85a4a', '#4a7ad8', '#e8c33c', '#5aa84a', '#a44ad8', '#e8e8e8', '#d88a2e', '#2ea8a8'];
const PANTS = ['#2e3a4a', '#4a4a4a', '#6a4a2e', '#3a5a3a'];

export function makePed(x, y, rng) {
  return {
    x, y,
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(34, 52),
    state: 'walk',
    shirt: rng.pick(SHIRTS),
    pants: rng.pick(PANTS),
    skin: rng.pick(['#e8b88a', '#c98d5a', '#8a5a3a', '#f0c8a0']),
    target: null,
    wait: rng.range(0, 3),
    panic: 0,
    dead: false,
  };
}

function pickSidewalkTarget(city, ped, rng) {
  const p = nearestRoadPoint(city, ped.x, ped.y);
  const alongX = rng.chance(0.5);
  const dist = rng.range(120, 420);
  const dir = rng.chance(0.5) ? 1 : -1;
  const off = 44;
  if (alongX) {
    return { x: p.x + dir * dist, y: p.y + (rng.chance(0.5) ? off : -off) };
  }
  return { x: p.x + (rng.chance(0.5) ? off : -off), y: p.y + dir * dist };
}

export function stepPed(city, ped, dt, rng, danger) {
  if (ped.dead) return;
  if (danger && Math.hypot(danger.x - ped.x, danger.y - ped.y) < danger.r) {
    ped.panic = 1.6;
  }
  if (ped.panic > 0) {
    ped.panic -= dt;
    ped.state = 'run';
  } else if (ped.wait > 0) {
    ped.wait -= dt;
    ped.state = 'idle';
    return;
  } else {
    ped.state = 'walk';
  }
  if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 12) {
    if (ped.state === 'run') {
      // Run away from the road, into a block.
      ped.target = { x: ped.x + (ped.x < 1800 ? -140 : 140), y: ped.y + (ped.y < 1300 ? -120 : 120) };
    } else {
      ped.target = pickSidewalkTarget(city, ped, rng);
      if (rng.chance(0.25)) ped.wait = rng.range(1, 4);
    }
  }
  const dx = ped.target.x - ped.x;
  const dy = ped.target.y - ped.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  const speed = ped.state === 'run' ? PEDS.runSpeed : ped.speed;
  const step = Math.min(dist, speed * dt);
  ped.angle = Math.atan2(dy, dx);
  ped.x += (dx / dist) * step;
  ped.y += (dy / dist) * step;
  const fixed = resolveBuildingCollision(city, ped.x, ped.y, 10);
  ped.x = fixed.x;
  ped.y = fixed.y;
}

export function spawnPed(city, rng, nearX, nearY, minDist) {
  for (let tries = 0; tries < 10; tries += 1) {
    const p = nearestRoadPoint(city, rng.range(150, 3450), rng.range(150, 2200));
    const off = rng.chance(0.5) ? 44 : -44;
    const x = p.x + (Math.abs(p.x - Math.round(p.x)) < 1 ? off : 0);
    const y = p.y + off;
    if (nearX !== undefined && Math.hypot(x - nearX, y - nearY) < (minDist || 450)) continue;
    return makePed(x, y, rng);
  }
  return null;
}
