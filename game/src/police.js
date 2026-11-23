// The wanted system: heat rises with crimes, falls when the player hides.
// Police cars spawn at the edge of sight and chase, ram, and bust the player.
import { POLICE, ROAD, WANTED } from './config.js';
import { makeCar } from './cars.js';
import { randomRoadPoint } from './city.js';

export function createWanted() {
  return {
    stars: 0,
    heat: 0,
    quietTimer: 0,
    bustTimer: 0,
    lastCrime: 0,
  };
}

export function addCrime(wanted, amount, now) {
  wanted.stars = Math.min(5, wanted.stars + amount);
  wanted.heat = 100;
  wanted.quietTimer = 0;
  wanted.lastCrime = now;
}

export function wantedPoliceCount(stars) {
  return Math.min(POLICE.maxActive, stars);
}

export function stepWanted(wanted, dt, nearestPoliceDist, playerHidden) {
  if (wanted.stars === 0) return;
  if (nearestPoliceDist > WANTED.hideRadius && playerHidden) {
    wanted.quietTimer += dt;
    if (wanted.quietTimer > WANTED.decayDelay) {
      wanted.stars -= 1;
      wanted.quietTimer = 0;
      wanted.heat = Math.max(0, wanted.heat - 40);
    }
  } else {
    wanted.quietTimer = 0;
  }
}

export function spawnPoliceCar(city, rng, px, py) {
  for (let tries = 0; tries < 14; tries += 1) {
    const p = randomRoadPoint(city, rng);
    if (Math.hypot(p.x - px, p.y - py) < POLICE.spawnDistance) continue;
    const car = makeCar('police', p.x, p.y, 0, '#1a2a4a', 'police');
    car.health = 70;
    return car;
  }
  return null;
}

// A police car steers straight at the player and rams. Returns true on a hard hit.
export function stepPoliceCar(city, car, px, py, dt, rng) {
  const dx = px - car.x;
  const dy = py - car.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  const throttle = dist > 46 ? 1 : 0.4;
  // Reuse the arcade drive: police push hard, brake little.
  car.speed += 320 * throttle * dt;
  if (car.speed > POLICE.chaseSpeed) car.speed = POLICE.chaseSpeed;
  if (car.speed < 0) car.speed = 0;
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 90);
  car.angle += steer * 3.1 * steerAuthority * dt;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Keep on the roads where possible: nudge off buildings.
  const fixed = { x: car.x, y: car.y };
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(fixed.x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(fixed.y, b.y + b.h));
    const ddx = fixed.x - cx;
    const ddy = fixed.y - cy;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 < 26 * 26 && d2 > 0.01) {
      const d = Math.sqrt(d2);
      fixed.x = cx + (ddx / d) * 26;
      fixed.y = cy + (ddy / d) * 26;
      car.speed *= 0.55;
    }
  }
  car.x = fixed.x;
  car.y = fixed.y;
  return dist < 60 && car.speed > 120;
}
