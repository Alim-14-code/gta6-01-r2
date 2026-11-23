// The player on foot: walk, run, shoot, get in and out of cars, pick things up.
import { PLAYER } from './config.js';
import { resolveBuildingCollision } from './city.js';
import { fireBullet } from './combat.js';
import { addCrime } from './police.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    cash: 0,
    ammo: PLAYER.pistolAmmo,
    inCar: false,
    car: null,
    shootCooldown: 0,
    crimeCooldown: 0,
    hurtFlash: 0,
  };
}

function nearestEnterableCar(world, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of world.cars) {
    if (car.dead || car.driver === 'police') continue;
    const d = Math.hypot(car.x - world.player.x, car.y - world.player.y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

export function stepPlayer(world, dt) {
  const p = world.player;
  const input = world.input;
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.crimeCooldown = Math.max(0, p.crimeCooldown - dt);
  p.hurtFlash = Math.max(0, p.hurtFlash - dt);

  if (p.inCar && p.car) {
    // Driving is handled by the world step (driveCar); here: exit + siren state.
    if (input.wasPressed('KeyE')) {
      const car = p.car;
      car.driver = 'parked';
      car.speed *= 0.3;
      p.inCar = false;
      p.car = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
      const fixed = resolveBuildingCollision(world.city, p.x, p.y, PLAYER.radius);
      p.x = fixed.x;
      p.y = fixed.y;
      world.audio.stopEngine();
    }
    return;
  }

  // On foot movement.
  const axis = input.axis();
  const running = input.down('ShiftLeft') || input.down('ShiftRight');
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(axis.x, axis.y);
  if (len > 0) {
    p.x += (axis.x / len) * speed * dt;
    p.y += (axis.y / len) * speed * dt;
    p.angle = Math.atan2(axis.y, axis.x);
    const fixed = resolveBuildingCollision(world.city, p.x, p.y, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
  }

  // Aim at the mouse.
  const cam = world.camera;
  const wx = cam.x + input.mouseX;
  const wy = cam.y + input.mouseY;
  p.aimAngle = Math.atan2(wy - p.y, wx - p.x);

  // Shoot.
  if (input.mouseDown && p.shootCooldown <= 0 && p.ammo > 0) {
    fireBullet(world.bullets, p.x, p.y, p.aimAngle, 'player');
    p.ammo -= 1;
    p.shootCooldown = 0.22;
    world.audio.shoot();
    if (p.crimeCooldown <= 0) {
      addCrime(world.wanted, 1, world.time);
      p.crimeCooldown = 1.5;
    }
  }

  // Get in a car.
  if (input.wasPressed('KeyE')) {
    const car = nearestEnterableCar(world, 46);
    if (car) {
      if (car.driver === 'traffic') {
        addCrime(world.wanted, 1, world.time);
        world.events.push({ type: 'stolen', x: car.x, y: car.y });
      }
      car.driver = 'player';
      p.inCar = true;
      p.car = car;
      world.audio.startEngine(0);
    }
  }
}

export function damagePlayer(world, amount) {
  const p = world.player;
  p.health -= amount;
  p.hurtFlash = 0.35;
  if (p.health <= 0) {
    p.health = 0;
    world.events.push({ type: 'wasted', x: p.x, y: p.y });
  }
}

export function healPlayer(world, amount) {
  world.player.health = Math.min(PLAYER.maxHealth, world.player.health + amount);
}
