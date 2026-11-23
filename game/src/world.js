// The simulation core: owns the city, the player, every car and pedestrian,
// the wanted level, missions and particles, and steps them all forward.
import { CITY_SEED, ECONOMY, PALETTE, PEDS, PLAYER, TRAFFIC, VIEW, WORLD } from './config.js';
import { buildCity, isOnRoad } from './city.js';
import { makeRng } from './rng.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { makeCar, driveCar, stepTrafficCar, spawnTrafficCar, spawnParkedCar, collideCarWithCity, clampToWorld, carsOverlap } from './cars.js';
import { makePed, stepPed, spawnPed } from './people.js';
import { createWanted, stepWanted, spawnPoliceCar, stepPoliceCar, wantedPoliceCount, addCrime } from './police.js';
import { createBullets, stepBullets, spawnPickups, collectPickup } from './combat.js';
import { createPlayer, stepPlayer, damagePlayer } from './player.js';
import { createMissions, updateMissions, startMission } from './missions.js';

export function createWorld(seed, canvas) {
  const rng = makeRng(seed || CITY_SEED);
  const city = buildCity(seed || CITY_SEED);
  const player = createPlayer(city.spawn.x, city.spawn.y);
  const world = {
    seed: seed || CITY_SEED,
    rng,
    city,
    player,
    input: createInput(),
    audio: createAudio(),
    cars: [],
    peds: [],
    bullets: createBullets(),
    pickups: spawnPickups(city, rng, 14),
    wanted: createWanted(),
    missions: createMissions(),
    particles: [],
    skids: [],
    events: [],
    stats: { missionsDone: 0, carsStolen: 0, pedsHit: 0, shotsFired: 0, timePlayed: 0 },
    camera: { x: city.spawn.x - VIEW.width / 2, y: city.spawn.y - VIEW.height / 2 },
    time: 0,
    mode: 'title',
    modeTimer: 0,
    muted: false,
    saveData: null,
  };
  world.input.attach(canvas);
  // Parked cars around the city.
  for (let i = 0; i < 10; i += 1) {
    const car = spawnParkedCar(city, rng);
    if (car) world.cars.push(car);
  }
  // A starter car near the safehouse so the first job starts rolling.
  const starter = makeCar('sedan', city.spawn.x + 60, city.spawn.y + 20, 0, '#3fae6a', 'parked');
  world.cars.push(starter);
  return world;
}

export function playerPos(world) {
  const p = world.player;
  return p.inCar && p.car ? { x: p.car.x, y: p.car.y } : { x: p.x, y: p.y };
}

function addParticles(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: world.rng.range(0.3, 0.8), max: 0.8, color, size: world.rng.range(2, 5) });
  }
  if (world.particles.length > 300) world.particles.splice(0, world.particles.length - 300);
}

function nearestPoliceDist(world) {
  const pos = playerPos(world);
  let best = Infinity;
  for (const car of world.cars) {
    if (car.driver !== 'police' || car.dead) continue;
    best = Math.min(best, Math.hypot(car.x - pos.x, car.y - pos.y));
  }
  return best;
}

function maintainPopulation(world, dt) {
  const pos = playerPos(world);
  // Traffic.
  let traffic = 0;
  for (const car of world.cars) if (car.driver === 'traffic') traffic += 1;
  if (traffic < TRAFFIC.count) {
    const car = spawnTrafficCar(world.city, world.rng, pos.x, pos.y, 480);
    if (car) world.cars.push(car);
  }
  // Pedestrians.
  let alive = 0;
  for (const p of world.peds) if (!p.dead) alive += 1;
  if (alive < PEDS.count) {
    const ped = spawnPed(world.city, world.rng, pos.x, pos.y, 420);
    if (ped) world.peds.push(ped);
  }
  // Police to match the wanted level.
  let police = 0;
  for (const car of world.cars) if (car.driver === 'police' && !car.dead) police += 1;
  const want = wantedPoliceCount(world.wanted.stars);
  if (police < want) {
    const car = spawnPoliceCar(world.city, world.rng, pos.x, pos.y);
    if (car) world.cars.push(car);
  }
  // Despawn far traffic and peds.
  for (let i = world.cars.length - 1; i >= 0; i -= 1) {
    const car = world.cars[i];
    if (car.driver === 'traffic' && Math.hypot(car.x - pos.x, car.y - pos.y) > TRAFFIC.despawnDistance) {
      world.cars.splice(i, 1);
    }
  }
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    const ped = world.peds[i];
    if (Math.hypot(ped.x - pos.x, ped.y - pos.y) > PEDS.despawnDistance) world.peds.splice(i, 1);
  }
}

export function stepWorld(world, dt) {
  world.time += dt;
  world.stats.timePlayed += dt;
  const p = world.player;
  const input = world.input;

  stepPlayer(world, dt);

  // Driving.
  if (p.inCar && p.car) {
    const car = p.car;
    const axis = input.axis();
    const throttle = axis.y < 0 ? 1 : axis.y > 0 ? -1 : 0;
    const steer = axis.x;
    const handbrake = input.down('Space');
    driveCar(car, throttle, steer, dt, handbrake);
    const hitBuilding = collideCarWithCity(world.city, car);
    if (hitBuilding && Math.abs(car.speed) > 120) {
      world.audio.crash();
      addParticles(world, car.x, car.y, '#e8e8e8', 8, 160);
    }
    clampToWorld(car);
    if (Math.abs(car.speed) > 240 && handbrake) {
      world.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 5 });
      if (world.skids.length > 220) world.skids.shift();
    }
    world.audio.setEngine(Math.abs(car.speed) / car.maxSpeed);
    // Spray shop: drive through to clear the heat, for a price.
    const spray = world.city.landmarks.spray;
    if (world.wanted.stars > 0 && p.cash >= ECONOMY.sprayCost && Math.hypot(car.x - spray.x, car.y - spray.y) < 80) {
      p.cash -= ECONOMY.sprayCost;
      world.wanted.stars = 0;
      world.wanted.heat = 0;
      world.missions.dialogue = 'SPRAY SHOP: Clean ride, no questions. -$200.';
      world.missions.dialogueUntil = world.time + 4;
      world.audio.cash();
    }
  } else {
    world.audio.setEngine(0);
  }

  // Car vs car shoves.
  const cars = world.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.dead || b.dead) continue;
      if (carsOverlap(a, b)) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const push = ((a.len + b.len) / 2 - 6 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        if (a.driver !== 'player') { a.x -= nx * push; a.y -= ny * push; }
        if (b.driver !== 'player') { b.x += nx * push; b.y += ny * push; }
        if ((a.driver === 'player' || b.driver === 'player') && Math.abs((a.driver === 'player' ? a.speed : b.speed)) > 100) {
          const pc = a.driver === 'player' ? a : b;
          pc.speed *= 0.55;
          world.audio.crash();
          addParticles(world, (a.x + b.x) / 2, (a.y + b.y) / 2, '#ffd76b', 10, 200);
        }
      }
    }
  }

  // Traffic and police.
  const pos = playerPos(world);
  for (const car of cars) {
    if (car.dead) continue;
    if (car.driver === 'traffic') stepTrafficCar(world.city, car, cars, dt, world.rng);
    else if (car.driver === 'police') {
      car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
      const hardHit = stepPoliceCar(world.city, car, pos.x, pos.y, dt, world.rng);
      if (hardHit && car.ramCd <= 0) {
        car.ramCd = 0.7;
        if (p.inCar && p.car) {
          damagePlayer(world, 4);
          world.audio.crash();
        } else {
          damagePlayer(world, 6);
        }
      }
    }
  }

  // Pedestrians.
  const danger = p.inCar && p.car && Math.abs(p.car.speed) > 120
    ? { x: p.car.x, y: p.car.y, r: 130 }
    : null;
  for (const ped of world.peds) {
    if (ped.dead) continue;
    stepPed(world.city, ped, dt, world.rng, danger);
  }
  // Player car hitting pedestrians.
  if (p.inCar && p.car && Math.abs(p.car.speed) > 60) {
    for (const ped of world.peds) {
      if (ped.dead) continue;
      if (Math.hypot(ped.x - p.car.x, ped.y - p.car.y) < 30) {
        ped.dead = true;
        ped.deadTimer = 8;
        world.stats.pedsHit += 1;
        addCrime(world.wanted, 1, world.time);
        addParticles(world, ped.x, ped.y, '#c23b2e', 12, 180);
        world.audio.crash();
      }
    }
  }
  for (let i = world.peds.length - 1; i >= 0; i -= 1) {
    const ped = world.peds[i];
    if (ped.dead) {
      ped.deadTimer = (ped.deadTimer || 0) - dt;
      if (ped.deadTimer <= 0) world.peds.splice(i, 1);
    }
  }

  // Bullets.
  stepBullets(world.bullets, dt, world.city, (b) => {
    for (const ped of world.peds) {
      if (!ped.dead && Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
        ped.dead = true;
        ped.deadTimer = 8;
        world.stats.pedsHit += 1;
        addParticles(world, ped.x, ped.y, '#c23b2e', 10, 160);
        return true;
      }
    }
    for (const car of world.cars) {
      if (car.driver === 'police' && !car.dead && Math.hypot(car.x - b.x, car.y - b.y) < 30) {
        car.health -= 34;
        addParticles(world, b.x, b.y, '#ffd76b', 6, 160);
        if (car.health <= 0) {
          car.dead = true;
          car.smoke = 4;
          addCrime(world.wanted, 1, world.time);
          addParticles(world, car.x, car.y, '#888888', 20, 220);
        }
        return true;
      }
    }
    return false;
  });

  // Pickups.
  for (let i = world.pickups.length - 1; i >= 0; i -= 1) {
    const pk = world.pickups[i];
    pk.bob += dt;
    if (Math.hypot(pk.x - pos.x, pk.y - pos.y) < 30) {
      collectPickup(p, pk);
      world.audio.pickup();
      addParticles(world, pk.x, pk.y, '#ffd76b', 8, 120);
      world.pickups.splice(i, 1);
    }
  }
  if (world.pickups.length < 10 && world.rng.chance(0.002)) {
    const x = world.rng.range(200, 3400);
    const y = world.rng.range(200, 2200);
    world.pickups.push({ kind: world.rng.pick(['cash', 'health', 'ammo']), x, y, bob: 0, taken: false });
  }

  // Wanted decay and busted.
  const nearPolice = nearestPoliceDist(world);
  stepWanted(world.wanted, dt, nearPolice, nearPolice > 420);
  if (world.wanted.stars > 0) {
    const bustDist = p.inCar ? 70 : 34;
    const slowEnough = !p.inCar || (p.car && Math.abs(p.car.speed) < 12);
    if (nearPolice < bustDist && slowEnough) {
      world.wanted.bustTimer += dt;
      if (world.wanted.bustTimer > 1.6) {
        world.mode = 'busted';
        world.modeTimer = 0;
        p.cash = Math.max(0, p.cash - ECONOMY.bustFine);
        world.wanted.stars = 0;
        world.wanted.bustTimer = 0;
        world.audio.fail();
        for (const car of world.cars) if (car.driver === 'police') car.dead = true;
      }
    } else {
      world.wanted.bustTimer = Math.max(0, world.wanted.bustTimer - dt * 2);
    }
  }

  // Wasted.
  if (p.health <= 0 && world.mode === 'play') {
    world.mode = 'wasted';
    world.modeTimer = 0;
    world.audio.fail();
  }

  // Missions.
  updateMissions(world, world.missions, dt);

  // Particles and skids age.
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.skids.length - 1; i >= 0; i -= 1) {
    world.skids[i].life -= dt;
    if (world.skids[i].life <= 0) world.skids.splice(i, 1);
  }

  maintainPopulation(world, dt);

  // Camera follows the player with a little lookahead.
  const tx = pos.x - VIEW.width / 2 + (p.inCar && p.car ? Math.cos(p.car.angle) * 60 : 0);
  const ty = pos.y - VIEW.height / 2 + (p.inCar && p.car ? Math.sin(p.car.angle) * 60 : 0);
  const k = Math.min(1, 6 * dt);
  world.camera.x += (tx - world.camera.x) * k;
  world.camera.y += (ty - world.camera.y) * k;
  world.camera.x = Math.max(-40, Math.min(WORLD.width - VIEW.width + 40, world.camera.x));
  world.camera.y = Math.max(-40, Math.min(WORLD.height - VIEW.height + 40, world.camera.y));

  // Siren when wanted.
  if (world.wanted.stars > 0) world.audio.startSiren();
  else world.audio.stopSiren();
}

export function respawnAfterBusted(world) {
  const hq = world.city.landmarks.policehq;
  const p = world.player;
  if (p.car) { p.car.driver = 'parked'; p.car = null; }
  p.inCar = false;
  p.x = hq.x + 120;
  p.y = hq.y + 100;
  p.health = 100;
  world.camera.x = p.x - VIEW.width / 2;
  world.camera.y = p.y - VIEW.height / 2;
}

export function respawnAfterWasted(world) {
  const hosp = world.city.landmarks.hospital;
  const p = world.player;
  p.cash = Math.max(0, p.cash - ECONOMY.hospitalBill);
  if (p.car) { p.car.driver = 'parked'; p.car = null; }
  p.inCar = false;
  p.x = hosp.x + 120;
  p.y = hosp.y + 100;
  p.health = 100;
  p.ammo = Math.max(p.ammo, 12);
  world.camera.x = p.x - VIEW.width / 2;
  world.camera.y = p.y - VIEW.height / 2;
}
