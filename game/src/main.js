// Verde Bay — boot, game loop and screen flow. In shot mode (?shot=...) the
// game stages one scene, draws a single frame and stops: that is what the
// screenshots are taken from.
import { VIEW } from './config.js';
import { createWorld, stepWorld, respawnAfterBusted, respawnAfterWasted } from './world.js';
import { drawWorld } from './render.js';
import { drawHUD, drawTitle, drawPaused, drawBusted, drawWasted, drawComplete } from './hud.js';
import { saveGame, loadGame } from './save.js';
import { startMission } from './missions.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);

function drawFrame(world) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);
  drawWorld(ctx, world);
  if (world.mode === 'play' || world.mode === 'paused') drawHUD(ctx, world);
  if (world.mode === 'title') drawTitle(ctx, world, !!world.saveData);
  else if (world.mode === 'paused') drawPaused(ctx);
  else if (world.mode === 'busted') drawBusted(ctx, 250);
  else if (world.mode === 'wasted') drawWasted(ctx, 150);
  else if (world.mode === 'complete') drawComplete(ctx, world);
}

function startGame(world, useSave) {
  const save = world.saveData;
  if (useSave && save) {
    world.player.cash = save.cash || 0;
    world.muted = !!save.muted;
    if (save.muted) world.audio.setMuted(true);
    const idx = Math.min(4, Math.max(0, save.missionIndex || 0));
    if ((save.missionsDone || 0) >= 5) {
      world.missions.index = 4;
      world.missions.complete = true;
      world.missions.gameComplete = true;
      world.freeRoam = true;
    } else {
      startMission(world, world.missions, idx);
    }
  } else {
    startMission(world, world.missions, 0);
  }
  world.mode = 'play';
  world.audio.unlock();
  world.audio.startMusic();
}

function main() {
  const seed = Number(params.get('seed') || 7);
  const shot = params.get('shot');
  const world = createWorld(seed, canvas);
  world.saveData = loadGame();

  if (shot) {
    stageShot(world, shot);
    drawFrame(world);
    window.__verdeShotDone = true;
    return;
  }

  let last = performance.now();
  let saveTimer = 0;
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;
    const input = world.input;

    if (input.wasPressed('KeyM')) {
      world.muted = !world.muted;
      world.audio.setMuted(world.muted);
    }

    if (world.mode === 'title') {
      if (input.wasPressed('Enter')) startGame(world, false);
      else if (input.wasPressed('KeyC') && world.saveData) startGame(world, true);
    } else if (world.mode === 'play') {
      if (input.wasPressed('Escape')) {
        world.mode = 'paused';
        saveGame(world);
      } else {
        stepWorld(world, dt);
        saveTimer += dt;
        if (saveTimer > 15) {
          saveTimer = 0;
          saveGame(world);
        }
        if (world.missions.gameComplete && !world.freeRoam) {
          world.mode = 'complete';
          world.audio.mission();
          saveGame(world);
        }
      }
    } else if (world.mode === 'paused') {
      if (input.wasPressed('Escape') || input.wasPressed('Enter')) world.mode = 'play';
    } else if (world.mode === 'busted' || world.mode === 'wasted') {
      world.modeTimer += dt;
      if (input.wasPressed('Enter') || world.modeTimer > 3.2) {
        if (world.mode === 'busted') respawnAfterBusted(world);
        else respawnAfterWasted(world);
        world.mode = 'play';
        world.modeTimer = 0;
      }
    } else if (world.mode === 'complete') {
      if (input.wasPressed('Enter')) {
        world.freeRoam = true;
        world.mode = 'play';
      }
    }

    drawFrame(world);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
