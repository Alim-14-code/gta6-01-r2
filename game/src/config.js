// Verde Bay — tuning, palette and world constants for the open-world game.
// Every number the simulation uses lives here so balancing is one file.
export const WORLD = { width: 3600, height: 2600 };
export const VIEW = { width: 1280, height: 720 };
export const ROAD = { spacing: 300, width: 64, first: 150 };
export const BEACH_Y = 2320;
export const WATER_Y = 2460;
export const CITY_SEED = 20261123;

export const PALETTE = {
  ground: '#8fa35f',
  groundDry: '#a8a06a',
  road: '#46464f',
  roadEdge: '#33333a',
  laneDash: '#f2d06b',
  sidewalk: '#c9c0a4',
  sand: '#e6cf96',
  water: '#2f7fae',
  waterDeep: '#256b96',
  park: '#5d8a48',
  parkDark: '#4c7439',
  plaza: '#b9b09a',
  buildingRoof: ['#e8a88f', '#f0cf9a', '#9dc3d8', '#d89aad', '#a9cf9a', '#e0c49a', '#b3a6cf', '#efe3c0', '#c98f7a', '#8fb8a8'],
  buildingSide: '#00000033',
  glass: '#7fb2d8',
  palm: '#3f7a34',
  palmTrunk: '#8a6b48',
};

export const PLAYER = {
  walkSpeed: 165,
  runSpeed: 250,
  radius: 13,
  maxHealth: 100,
  punchDamage: 12,
  shootDamage: 34,
  pistolAmmo: 24,
  maxAmmo: 120,
};

export const CAR = {
  accel: 300,
  brake: 520,
  reverseAccel: 190,
  steerRate: 2.9,
  grip: 6.5,
  handbrakeGrip: 2.2,
  maxSpeed: { sport: 430, sedan: 330, taxi: 340, van: 285, truck: 255, police: 410 },
  length: { sport: 52, sedan: 54, taxi: 54, van: 62, truck: 74, police: 54 },
  width: { sport: 26, sedan: 26, taxi: 26, van: 28, truck: 30, police: 26 },
  colors: ['#c23b2e', '#2e6fc2', '#e8b13c', '#3fae6a', '#e8e8e8', '#7a4fae', '#c26a2e', '#222831', '#d8d8d8'],
};

export const TRAFFIC = { minSpeed: 70, maxSpeed: 115, spawnDistance: 700, despawnDistance: 1100, count: 14 };

export const PEDS = { count: 26, walkSpeed: 42, runSpeed: 150, spawnDistance: 650, despawnDistance: 1000 };

export const POLICE = {
  maxActive: 4,
  spawnDistance: 620,
  chaseSpeed: 395,
  ramDamage: 9,
  bustRadius: 34,
  bustTime: 1.6,
  sirenRadius: 500,
};

export const WANTED = {
  stealCar: 1,
  hitPed: 1,
  shoot: 1,
  hitPolice: 1,
  kill: 1,
  decayDelay: 9,
  decayStep: 4,
  hideRadius: 420,
};

export const ECONOMY = {
  sprayCost: 200,
  pickupCash: 50,
  healthPickup: 35,
  ammoPickup: 12,
  bustFine: 250,
  hospitalBill: 150,
};

export const MISSION_REWARDS = [500, 900, 1400, 2200, 4000];
