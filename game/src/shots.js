// Screenshot scenes: each one plays the real game forward from a fresh world
// for a fixed number of steps, steered by a simple driving autopilot, so the
// frame is what a short session really looks like — and the same seed always
// gives the same frame. Used with ?shot=cover|street|chase|mission&seed=N.
import { makeCar } from './cars.js';
import { roadDirectionAt } from './city.js';
import { startMission } from './missions.js';
import { addCrime } from './police.js';
import { stepWorld, playerPos } from './world.js';

const STEP = 1 / 60;

function autopilotDrive(world) {
  const p = world.player;
  if (!p.inCar || !p.car) return;
  const car = p.car;
  const dir = roadDirectionAt(world.city, car.x, car.y);
  const want = Math.atan2(dir.dy, dir.dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const keys = world.input.keys;
  keys.add('KeyW');
  keys.delete('KeyA');
  keys.delete('KeyD');
  if (diff > 0.12) keys.add('KeyA');
  else if (diff < -0.12) keys.add('KeyD');
}

function placePoliceBehind(world, count, gap) {
  const p = world.player;
  const base = p.inCar && p.car ? p.car : p;
  const ang = p.inCar && p.car ? p.car.angle : p.angle;
  for (let i = 0; i < count; i += 1) {
    const back = gap * (i + 1);
    const lat = (i % 2 === 0 ? -38 : 38);
    const x = base.x - Math.cos(ang) * back - Math.sin(ang) * lat;
    const y = base.y - Math.sin(ang) * back + Math.cos(ang) * lat;
    const cop = makeCar('police', x, y, ang, '#1a2a4a', 'police');
    cop.speed = 200;
    world.cars.push(cop);
  }
}

function placeTrafficAhead(world, count) {
  const p = world.player;
  const base = p.inCar && p.car ? p.car : p;
  const ang = p.inCar && p.car ? p.car.angle : p.angle;
  for (let i = 0; i < count; i += 1) {
    const ahead = 180 + i * 130;
    const lat = (i % 2 === 0 ? 16 : -16);
    const x = base.x + Math.cos(ang) * ahead - Math.sin(ang) * lat;
    const y = base.y + Math.sin(ang) * ahead + Math.cos(ang) * lat;
    const car = makeCar(i % 2 ? 'sedan' : 'taxi', x, y, ang, i % 2 ? '#c23b2e' : '#e8b13c', 'traffic');
    car.speed = 90;
    car.route = { dx: Math.round(Math.cos(ang)), dy: Math.round(Math.sin(ang)) };
    world.cars.push(car);
  }
}

function runSteps(world, seconds, drive) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (drive) autopilotDrive(world);
    stepWorld(world, STEP);
    world.input.endFrame();
  }
  world.input.keys.clear();
}

export function stageShot(world, name) {
  world.mode = 'play';
  if (name === 'cover') {
    // Job 2, mid-delivery: the yellow Comet GT, three stars, cops closing in.
    startMission(world, world.missions, 1);
    const marked = world.missions.markedCar;
    const p = world.player;
    p.x = marked.x;
    p.y = marked.y;
    p.inCar = true;
    p.car = marked;
    marked.driver = 'player';
    marked.speed = 180;
    runSteps(world, 0.5, false);
    addCrime(world.wanted, 3, world.time);
    placePoliceBehind(world, 2, 170);
    placeTrafficAhead(world, 3);
    runSteps(world, 2.2, true);
  } else if (name === 'street') {
    // Job 1, on foot by the starter car: sidewalks busy, traffic rolling.
    startMission(world, world.missions, 0);
    runSteps(world, 3.5, false);
  } else if (name === 'chase') {
    // Four stars, three cop cars on the bumper, on the avenue.
    const p = world.player;
    const car = makeCar('sport', world.city.roadsX[5], world.city.roadsY[3], 0, '#c23b2e', 'player');
    world.cars.push(car);
    p.inCar = true;
    p.car = car;
    car.speed = 300;
    addCrime(world.wanted, 4, world.time);
    placePoliceBehind(world, 2, 150);
    placeTrafficAhead(world, 2);
    runSteps(world, 1.8, true);
    for (let i = 0; i < 6; i += 1) {
      world.skids.push({ x: car.x - Math.cos(car.angle) * (30 + i * 22), y: car.y - Math.sin(car.angle) * (30 + i * 22), angle: car.angle, life: 5 });
    }
  } else if (name === 'mission') {
    // Job 4, the bank job: vault half-cracked, cops already rolling in.
    startMission(world, world.missions, 3);
    const bank = world.city.landmarks.bank;
    const p = world.player;
    p.x = bank.x;
    p.y = bank.y + bank.h / 2 + 30;
    runSteps(world, 0.5, false);
    world.missions.stageTimer = 1.1;
    addCrime(world.wanted, 2, world.time);
    placePoliceBehind(world, 1, 420);
    runSteps(world, 1.0, false);
  } else {
    runSteps(world, 2.0, false);
  }
  // Freeze: one frame, drawn by the caller.
  return world;
}

export { playerPos };
