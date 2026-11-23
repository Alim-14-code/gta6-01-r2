// The story: five jobs for fixer Sal Reyes, from a first pickup to the big
// score. Each mission is stages of drive / enter / steal / deliver / evade,
// with an objective line and a dialogue line the HUD shows.
import { MISSION_REWARDS } from './config.js';
import { addCrime } from './police.js';
import { makeCar } from './cars.js';

const MISSION_DEFS = [
  {
    name: 'First Gear',
    intro: 'REYES: Mara, first job. Pick up the package at Palma Mall, bring it home. Easy money.',
    stages: [
      { type: 'goto', label: 'Drive to Palma Mall', place: 'mall' },
      { type: 'interact', label: 'Press E to grab the package', place: 'mall', hold: 0 },
      { type: 'goto', label: 'Deliver the package to the Safehouse', place: 'safehouse' },
    ],
  },
  {
    name: 'Hot Wheels',
    intro: 'REYES: A yellow Comet GT is parked at the Marina Docks. Take it. The Chop Shop pays well.',
    stages: [
      { type: 'steal', label: 'Steal the yellow Comet GT at the Marina', place: 'docks', carKind: 'sport', carColor: '#e8c33c' },
      { type: 'deliver', label: 'Deliver the Comet GT to the Chop Shop', place: 'chopshop' },
    ],
  },
  {
    name: 'Smoke Screen',
    intro: 'REYES: The cops are onto you, Mara. Shake them. Lose the heat, then get to the Spray Shop.',
    stages: [
      { type: 'evade', label: 'Lose the cops — stay out of sight', seconds: 45, minStars: 2 },
      { type: 'goto', label: 'Get to the Spray Shop', place: 'spray' },
    ],
  },
  {
    name: 'The Bank Job',
    intro: 'REYES: Verde Bank, on foot, in and out. Grab the cash and run. Cops will come fast.',
    stages: [
      { type: 'goto', label: 'Get to Verde Bank on foot', place: 'bank' },
      { type: 'interact', label: 'Hold E to crack the vault', place: 'bank', hold: 2 },
      { type: 'goto', label: 'Escape to the Safehouse', place: 'safehouse' },
    ],
  },
  {
    name: 'The Big Score',
    intro: 'REYES: Last one. An armored van at the Docks, full of casino cash. Bring it home, Mara.',
    stages: [
      { type: 'steal', label: 'Take the armored van at the Marina Docks', place: 'docks', carKind: 'van', carColor: '#3a4a5a' },
      { type: 'deliver', label: 'Drive the van to the Safehouse — cops everywhere', place: 'safehouse' },
    ],
  },
];

export function createMissions() {
  return {
    index: -1,
    stage: 0,
    stageTimer: 0,
    target: null,
    markedCar: null,
    complete: false,
    gameComplete: false,
    dialogue: '',
    dialogueUntil: 0,
  };
}

function placeOf(world, place) {
  return world.city.landmarks[place];
}

function setStage(world, missions, stageIndex) {
  const def = MISSION_DEFS[missions.index];
  const stage = def.stages[stageIndex];
  missions.stage = stageIndex;
  missions.stageTimer = 0;
  missions.markedCar = null;
  if (stage.type === 'steal') {
    const place = placeOf(world, stage.place);
    const car = makeCar(stage.carKind, place.x + 60, place.y + 40, 0, stage.carColor, 'parked');
    car.marked = true;
    world.cars.push(car);
    missions.markedCar = car;
    missions.target = { x: car.x, y: car.y, label: stage.label };
  } else if (stage.type === 'evade') {
    missions.target = null;
  } else if (stage.place) {
    const place = placeOf(world, stage.place);
    missions.target = { x: place.x, y: place.y, label: stage.label };
  } else {
    missions.target = null;
  }
  if (stage.type === 'evade') {
    addCrime(world.wanted, 2, world.time);
  }
}

export function startMission(world, missions, index) {
  missions.index = index;
  missions.complete = false;
  const def = MISSION_DEFS[index];
  missions.dialogue = def.intro;
  missions.dialogueUntil = world.time + 6;
  setStage(world, missions, 0);
  world.audio.mission();
}

export function currentObjective(missions) {
  if (missions.index < 0 || missions.complete) return '';
  const def = MISSION_DEFS[missions.index];
  const stage = def.stages[missions.stage];
  if (stage.type === 'evade') {
    const left = Math.max(0, Math.ceil(stage.seconds - missions.stageTimer));
    return `${stage.label} — ${left}s`;
  }
  return stage.label;
}

export function missionTitle(missions) {
  if (missions.index < 0) return '';
  return `JOB ${missions.index + 1}/5 — ${MISSION_DEFS[missions.index].name}`;
}

function completeMission(world, missions) {
  const reward = MISSION_REWARDS[missions.index];
  world.player.cash += reward;
  missions.dialogue = `REYES: Job done. $${reward} is yours, Mara.`;
  missions.dialogueUntil = world.time + 5;
  missions.complete = true;
  missions.target = null;
  missions.markedCar = null;
  world.audio.cash();
  if (missions.index >= MISSION_DEFS.length - 1) {
    missions.gameComplete = true;
    world.stats.missionsDone += 1;
    return;
  }
  world.stats.missionsDone += 1;
  // Next job starts when the player drives to the safehouse and presses E,
  // or automatically after a breather.
  missions.nextAt = world.time + 4;
}

function playerPos(world) {
  const p = world.player;
  return p.inCar && p.car ? { x: p.car.x, y: p.car.y } : { x: p.x, y: p.y };
}

// Advance the active mission. Returns 'complete' | 'gamecomplete' | null.
export function updateMissions(world, missions, dt) {
  if (missions.index < 0) return null;
  if (missions.complete) {
    if (missions.gameComplete) return 'gamecomplete';
    if (world.time >= (missions.nextAt || 0) && missions.index < MISSION_DEFS.length - 1) {
      startMission(world, missions, missions.index + 1);
    }
    return null;
  }
  const def = MISSION_DEFS[missions.index];
  const stage = def.stages[missions.stage];
  const pos = playerPos(world);
  const input = world.input;

  if (stage.type === 'goto' || stage.type === 'deliver') {
    const t = missions.target;
    if (t && Math.hypot(pos.x - t.x, pos.y - t.y) < 130) {
      if (stage.type === 'deliver' && !(world.player.inCar && world.player.car === missions.markedCar)) {
        // Must arrive in the marked car.
      } else {
        advance(world, missions);
      }
    }
  } else if (stage.type === 'interact') {
    const t = missions.target;
    if (t && Math.hypot(pos.x - t.x, pos.y - t.y) < 60) {
      if (stage.hold > 0) {
        if (input.down('KeyE')) {
          missions.stageTimer += dt;
          if (missions.stageTimer >= stage.hold) {
            if (missions.index === 3) addCrime(world.wanted, 3, world.time);
            advance(world, missions);
          }
        } else {
          missions.stageTimer = Math.max(0, missions.stageTimer - dt * 2);
        }
      } else if (input.wasPressed('KeyE')) {
        advance(world, missions);
      }
    }
  } else if (stage.type === 'steal') {
    if (world.player.inCar && world.player.car === missions.markedCar) {
      if (missions.index === 1) addCrime(world.wanted, 1, world.time);
      if (missions.index === 4) addCrime(world.wanted, 4, world.time);
      advance(world, missions);
    }
  } else if (stage.type === 'evade') {
    if (world.wanted.stars >= stage.minStars) missions.stageTimer += dt;
    if (missions.stageTimer >= stage.seconds) advance(world, missions);
  }
  return null;
}

function advance(world, missions) {
  const def = MISSION_DEFS[missions.index];
  if (missions.stage + 1 >= def.stages.length) {
    completeMission(world, missions);
  } else {
    setStage(world, missions, missions.stage + 1);
    world.audio.pickup();
  }
}

export function missionCount() {
  return MISSION_DEFS.length;
}
