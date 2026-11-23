// The HUD: cash, health, wanted stars, mission objective, dialogue, minimap,
// and every screen overlay (title, pause, busted, wasted, finale).
import { PLAYER, VIEW } from './config.js';
import { currentObjective, missionTitle } from './missions.js';

function drawStars(ctx, stars, x, y) {
  ctx.font = '28px sans-serif';
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < stars ? '#ffd73c' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', x + i * 30, y);
  }
}

function drawMinimap(ctx, world) {
  const w = 190;
  const h = 138;
  const x0 = VIEW.width - w - 16;
  const y0 = VIEW.height - h - 16;
  const sx = w / 3600;
  const sy = h / 2600;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.82)';
  ctx.fillRect(x0 - 4, y0 - 4, w + 8, h + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, w + 8, h + 8);
  // Water at the bottom.
  ctx.fillStyle = '#2f7fae';
  ctx.fillRect(x0, y0 + 2320 * sy, w, h - 2320 * sy);
  // Roads.
  ctx.strokeStyle = '#8a8a92';
  ctx.lineWidth = 2;
  for (const rx of world.city.roadsX) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * sx, y0);
    ctx.lineTo(x0 + rx * sx, y0 + 2320 * sy);
    ctx.stroke();
  }
  for (const ry of world.city.roadsY) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * sy);
    ctx.lineTo(x0 + w, y0 + ry * sy);
    ctx.stroke();
  }
  // Landmarks.
  ctx.fillStyle = '#e8e8e8';
  for (const key of Object.keys(world.city.landmarks)) {
    const lm = world.city.landmarks[key];
    ctx.fillRect(x0 + lm.x * sx - 2, y0 + lm.y * sy - 2, 4, 4);
  }
  // Mission target.
  const t = world.missions.target;
  if (t) {
    const pulse = 3 + Math.sin(world.time * 6) * 1.5;
    ctx.fillStyle = '#ffd73c';
    ctx.beginPath();
    ctx.arc(x0 + t.x * sx, y0 + t.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police.
  for (const car of world.cars) {
    if (car.driver !== 'police' || car.dead) continue;
    ctx.fillStyle = '#ff4a4a';
    ctx.beginPath();
    ctx.arc(x0 + car.x * sx, y0 + car.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const p = world.player;
  const px = p.inCar && p.car ? p.car.x : p.x;
  const py = p.inCar && p.car ? p.car.y : p.y;
  const ang = p.inCar && p.car ? p.car.angle : p.angle;
  ctx.save();
  ctx.translate(x0 + px * sx, y0 + py * sy);
  ctx.rotate(ang);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('VERDE BAY', x0, y0 - 8);
}

function drawDialogue(ctx, world) {
  const m = world.missions;
  if (!m.dialogue || world.time > m.dialogueUntil) return;
  const w = 760;
  const x = (VIEW.width - w) / 2;
  const y = VIEW.height - 118;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.85)';
  ctx.fillRect(x, y, w, 52);
  ctx.strokeStyle = '#ffd73c';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'left';
  wrapText(ctx, m.dialogue, x + 16, y + 22, w - 32, 19);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}

export function drawHUD(ctx, world) {
  const p = world.player;
  // Top-left: cash and health.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.7)';
  ctx.fillRect(14, 12, 210, 64);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, 26, 40);
  ctx.fillStyle = '#333333';
  ctx.fillRect(26, 50, 150, 12);
  ctx.fillStyle = p.health > 30 ? '#3fae6a' : '#c23b2e';
  ctx.fillRect(26, 50, 150 * (p.health / PLAYER.maxHealth), 12);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.fillText(`HP ${Math.ceil(p.health)}`, 182, 60);
  if (!p.inCar) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`AMMO ${p.ammo}`, 26, 92);
  }
  // Top-right: wanted stars.
  drawStars(ctx, world.wanted.stars, VIEW.width - 170, 42);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(world.wanted.stars > 0 ? 'WANTED' : 'CLEAN', VIEW.width - 20, 64);
  // Top-center: mission.
  const title = missionTitle(world.missions);
  const obj = currentObjective(world.missions);
  if (title) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.7)';
    const tw = 460;
    ctx.fillRect((VIEW.width - tw) / 2, 12, tw, 54);
    ctx.fillStyle = '#ffd73c';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW.width / 2, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText(obj, VIEW.width / 2, 54);
  }
  // Speed when driving, left of the minimap so it never covers its label.
  if (p.inCar && p.car) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.7)';
    ctx.fillRect(VIEW.width - 310, VIEW.height - 200, 80, 34);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(Math.abs(p.car.speed) * 0.55)}`, VIEW.width - 270, VIEW.height - 176);
    ctx.font = '10px sans-serif';
    ctx.fillText('KM/H', VIEW.width - 270, VIEW.height - 164);
  }
  drawMinimap(ctx, world);
  drawDialogue(ctx, world);
  // Context hint.
  let hint = '';
  if (!p.inCar) {
    for (const car of world.cars) {
      if (!car.dead && car.driver !== 'police' && Math.hypot(car.x - p.x, car.y - p.y) < 46) {
        hint = 'E — Get in the car';
        break;
      }
    }
  } else {
    hint = 'E — Get out   SPACE — Handbrake';
  }
  if (world.missions.target && world.missions.index === 3 && world.missions.stage === 1) hint = 'Hold E — Crack the vault';
  if (hint) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hint, VIEW.width / 2, VIEW.height - 24);
  }
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = accent || '#ffd73c';
  ctx.font = 'bold 54px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, 250);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px sans-serif';
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, VIEW.width / 2, y);
    y += 28;
  }
}

export function drawTitle(ctx, world, hasSave) {
  overlay(ctx, 'VERDE BAY', [
    'A getaway story in the sun. Five jobs for Sal Reyes.',
    'Drive the city. Steal the cars. Lose the cops. Get paid.',
    '',
    'WASD — Move / Drive     Mouse — Aim     Click — Shoot',
    'E — Get in / out, grab     SPACE — Handbrake     SHIFT — Run',
    'ESC — Pause     M — Mute',
    '',
    hasSave ? 'ENTER — Start new game      C — Continue your story' : 'ENTER — Start the story',
  ]);
}

export function drawPaused(ctx) {
  overlay(ctx, 'PAUSED', ['ESC — Back to the streets', 'M — Mute sound'], '#e8e8e8');
}

export function drawBusted(ctx, fine) {
  overlay(ctx, 'BUSTED', [`The Verde Bay PD took $${fine}.`, 'Press ENTER to walk free.'], '#5a8fd8');
}

export function drawWasted(ctx, bill) {
  overlay(ctx, 'WASTED', [`City Hospital patched you up. Bill: $${bill}.`, 'Press ENTER to get back out there.'], '#c23b2e');
}

export function drawComplete(ctx, world) {
  const s = world.stats;
  overlay(ctx, 'THE BIG SCORE', [
    'Mara Voss drove the van home. Verde Bay is hers now.',
    `Jobs done: ${s.missionsDone}/5     Cash: $${world.player.cash.toLocaleString('en-US')}`,
    `Cars stolen: ${s.carsStolen}     Time on the streets: ${Math.floor(s.timePlayed / 60)} min`,
    '',
    'ENTER — Free roam Verde Bay',
  ], '#7dff8a');
}
