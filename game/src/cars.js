// Cars: arcade driving physics for the player, plus traffic that follows the
// road grid. One entity shape for every car on the street.
import { CAR, ROAD, WORLD } from './config.js';
import { nearestRoadPoint, randomRoadPoint, resolveBuildingCollision } from './city.js';

export function makeCar(kind, x, y, angle, color, driver) {
  const max = CAR.maxSpeed[kind] || CAR.maxSpeed.sedan;
  return {
    kind, x, y, angle, color,
    driver: driver || 'traffic',
    speed: 0,
    steer: 0,
    len: CAR.length[kind] || CAR.length.sedan,
    wid: CAR.width[kind] || CAR.width.sedan,
    maxSpeed: max,
    health: kind === 'police' ? 70 : 100,
    targetSpeed: 0,
    route: null,
    stuck: 0,
    smoke: 0,
    dead: false,
  };
}

// Lane offset for right-hand traffic, given a travel direction.
export function laneOffset(dx, dy) {
  if (dx === 1) return { x: 0, y: 16 };
  if (dx === -1) return { x: 0, y: -16 };
  if (dy === 1) return { x: -16, y: 0 };
  return { x: 16, y: 0 };
}

export function driveCar(car, throttle, steer, dt, handbrake) {
  const max = car.maxSpeed;
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 8) car.speed -= CAR.brake * dt;
    else car.speed += CAR.reverseAccel * throttle * dt;
  } else {
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 140 * dt);
  }
  car.speed = Math.max(-max * 0.45, Math.min(max, car.speed));
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 90);
  const grip = handbrake ? CAR.handbrakeGrip : CAR.grip;
  car.angle += steer * CAR.steerRate * steerAuthority * dt * Math.sign(car.speed || 1) * (handbrake ? 1.5 : 1);
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  const vx = forward.x * car.speed;
  const vy = forward.y * car.speed;
  car.x += vx * dt;
  car.y += vy * dt;
  if (handbrake) car.speed *= Math.max(0, 1 - grip * dt * 0.4);
  return { vx, vy };
}

function carCorners(car) {
  const c = Math.cos(car.angle);
  const s = Math.sin(car.angle);
  const hl = car.len / 2;
  const hw = car.wid / 2;
  return [
    { x: car.x + c * hl - s * hw, y: car.y + s * hl + c * hw },
    { x: car.x + c * hl + s * hw, y: car.y + s * hl - c * hw },
    { x: car.x - c * hl - s * hw, y: car.y - s * hl + c * hw },
    { x: car.x - c * hl + s * hw, y: car.y - s * hl - c * hw },
  ];
}

function carsOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  return dist < (a.len + b.len) / 2 - 6;
}

export function collideCarWithCity(city, car) {
  const fixed = resolveBuildingCollision(city, car.x, car.y, car.len / 2 - 4);
  if (fixed.x !== car.x || fixed.y !== car.y) {
    car.x = fixed.x;
    car.y = fixed.y;
    car.speed *= 0.4;
    return true;
  }
  return false;
}

export function clampToWorld(car) {
  car.x = Math.max(30, Math.min(WORLD.width - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD.height - 30, car.y));
}

// Traffic: pick a road, a direction, a lane, and follow it, turning at
// intersections. Brake for the car ahead.
export function stepTrafficCar(city, car, cars, dt, rng) {
  if (!car.route) {
    const p = randomRoadPoint(city, rng);
    car.x = p.x;
    car.y = p.y;
    const dir = rng.chance(0.5) ? 1 : -1;
    car.route = { dx: p.along === 'x' ? dir : 0, dy: p.along === 'y' ? dir : 0 };
    const off = laneOffset(car.route.dx, car.route.dy);
    car.x += off.x;
    car.y += off.y;
    car.angle = Math.atan2(car.route.dy, car.route.dx);
    car.targetSpeed = rng.range(70, 115);
  }
  const r = car.route;
  // Car ahead on the same lane?
  let ahead = Infinity;
  for (const other of cars) {
    if (other === car || other.dead) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const along = dx * r.dx + dy * r.dy;
    const side = Math.abs(dx * r.dy - dy * r.dx);
    if (along > 0 && along < 90 && side < 30) ahead = Math.min(ahead, along);
  }
  const want = ahead < 70 ? 0 : car.targetSpeed;
  if (car.speed < want) car.speed += 120 * dt;
  else if (car.speed > want) car.speed -= 260 * dt;
  car.x += r.dx * car.speed * dt;
  car.y += r.dy * car.speed * dt;
  car.angle = Math.atan2(r.dy, r.dx);

  // At an intersection, maybe turn.
  const nearX = city.roadsX.some((rx) => Math.abs(car.x - rx) < 8);
  const nearY = city.roadsY.some((ry) => Math.abs(car.y - ry) < 8);
  if (nearX && nearY && rng.chance(0.02)) {
    const turn = rng.pick(['straight', 'left', 'right']);
    if (turn === 'left') car.route = { dx: r.dy, dy: -r.dx };
    else if (turn === 'right') car.route = { dx: -r.dy, dy: r.dx };
    const off = laneOffset(car.route.dx, car.route.dy);
    const snapped = nearestRoadPoint(city, car.x, car.y);
    car.x = snapped.x + off.x;
    car.y = snapped.y + off.y;
  }
  // Left the grid: respawn elsewhere.
  if (car.x < 60 || car.x > WORLD.width - 60 || car.y < 60 || car.y > WORLD.height - 60) {
    car.route = null;
  }
}

export function spawnTrafficCar(city, rng, nearX, nearY, minDist) {
  for (let tries = 0; tries < 12; tries += 1) {
    const p = randomRoadPoint(city, rng);
    if (nearX !== undefined && Math.hypot(p.x - nearX, p.y - nearY) < (minDist || 500)) continue;
    const kind = rng.pick(['sedan', 'sedan', 'taxi', 'van', 'sport']);
    const car = makeCar(kind, p.x, p.y, 0, rng.pick(CAR.colors), 'traffic');
    return car;
  }
  return null;
}

export function spawnParkedCar(city, rng) {
  const spot = rng.pick(city.parked);
  if (!spot) return null;
  const kind = rng.pick(['sedan', 'sport', 'taxi', 'van']);
  const car = makeCar(kind, spot.x, spot.y, spot.angle, spot.color, 'parked');
  car.speed = 0;
  return car;
}

export { carCorners, carsOverlap };
