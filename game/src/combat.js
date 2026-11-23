// Combat and pickups: the player's pistol, bullets, and the cash, health and
// ammo that spawn around the city.
import { PLAYER } from './config.js';

export function createBullets() {
  return [];
}

export function fireBullet(bullets, x, y, angle, owner) {
  if (bullets.length > 60) return;
  bullets.push({
    x: x + Math.cos(angle) * 20,
    y: y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * 720,
    vy: Math.sin(angle) * 720,
    owner: owner || 'player',
    life: 0.9,
  });
}

export function stepBullets(bullets, dt, city, hitTest) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const bd of city.buildings) {
        if (b.x >= bd.x && b.x <= bd.x + bd.w && b.y >= bd.y && b.y <= bd.y + bd.h) {
          dead = true;
          break;
        }
      }
    }
    if (!dead && hitTest) dead = hitTest(b);
    if (dead) bullets.splice(i, 1);
  }
}

export function makePickup(kind, x, y) {
  return { kind, x, y, bob: 0, taken: false };
}

export function spawnPickups(city, rng, count) {
  const list = [];
  for (let i = 0; i < count; i += 1) {
    const kind = rng.pick(['cash', 'cash', 'health', 'ammo']);
    const x = rng.range(200, 3400);
    const y = rng.range(200, 2200);
    list.push(makePickup(kind, x, y));
  }
  return list;
}

export function collectPickup(player, pickup) {
  if (pickup.kind === 'cash') {
    player.cash += 50;
    return 'cash';
  }
  if (pickup.kind === 'health') {
    player.health = Math.min(PLAYER.maxHealth, player.health + 35);
    return 'health';
  }
  player.ammo = Math.min(PLAYER.maxAmmo, player.ammo + 12);
  return 'ammo';
}
