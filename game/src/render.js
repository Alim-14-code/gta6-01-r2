// All canvas drawing of the world: streets, buildings, beach, cars, people,
// particles and the mission beacon. Nothing here touches game state.
import { BEACH_Y, PALETTE, ROAD, VIEW, WATER_Y, WORLD } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function inView(cam, x, y, margin) {
  return x > cam.x - margin && x < cam.x + VIEW.width + margin && y > cam.y - margin && y < cam.y + VIEW.height + margin;
}

function drawGround(ctx, world) {
  const cam = world.camera;
  ctx.fillStyle = PALETTE.ground;
  ctx.fillRect(cam.x - 20, cam.y - 20, VIEW.width + 40, VIEW.height + 40);
  // Sand and water along the south edge.
  if (cam.y + VIEW.height > BEACH_Y) {
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(cam.x - 20, BEACH_Y, VIEW.width + 40, WATER_Y - BEACH_Y);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(cam.x - 20, WATER_Y, VIEW.width + 40, cam.y + VIEW.height - WATER_Y + 20);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let x = Math.floor((cam.x - 20) / 90) * 90; x < cam.x + VIEW.width + 20; x += 90) {
      ctx.fillRect(x, WATER_Y + 40 + ((x / 90) % 3) * 18, 46, 4);
    }
  }
}

function drawRoads(ctx, world) {
  const cam = world.camera;
  ctx.fillStyle = PALETTE.road;
  for (const rx of world.city.roadsX) {
    if (rx < cam.x - 60 || rx > cam.x + VIEW.width + 60) continue;
    ctx.fillRect(rx - ROAD.width / 2, cam.y - 20, ROAD.width, VIEW.height + 40);
  }
  for (const ry of world.city.roadsY) {
    if (ry < cam.y - 60 || ry > cam.y + VIEW.height + 60) continue;
    ctx.fillRect(cam.x - 20, ry - ROAD.width / 2, VIEW.width + 40, ROAD.width);
  }
  // Lane dashes.
  ctx.fillStyle = PALETTE.laneDash;
  for (const rx of world.city.roadsX) {
    if (rx < cam.x - 60 || rx > cam.x + VIEW.width + 60) continue;
    for (let y = Math.floor((cam.y - 20) / 44) * 44; y < cam.y + VIEW.height + 20; y += 44) {
      if (Math.abs(y - Math.round(y / ROAD.spacing) * ROAD.spacing) < 46) continue;
      ctx.fillRect(rx - 2, y, 4, 20);
    }
  }
  for (const ry of world.city.roadsY) {
    if (ry < cam.y - 60 || ry > cam.y + VIEW.height + 60) continue;
    for (let x = Math.floor((cam.x - 20) / 44) * 44; x < cam.x + VIEW.width + 20; x += 44) {
      if (Math.abs(x - Math.round(x / ROAD.spacing) * ROAD.spacing) < 46) continue;
      ctx.fillRect(x, ry - 2, 20, 4);
    }
  }
}

function drawBlocks(ctx, world) {
  const cam = world.camera;
  for (const block of world.city.blocks) {
    if (!inView(cam, block.x + block.w / 2, block.y + block.h / 2, Math.max(block.w, block.h))) continue;
    if (block.type === 'park') {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(block.x, block.y, block.w, block.h);
      ctx.fillStyle = PALETTE.parkDark;
      ctx.beginPath();
      ctx.ellipse(block.x + block.w / 2, block.y + block.h / 2, block.w / 3, block.h / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (block.type === 'plaza') {
      ctx.fillStyle = PALETTE.plaza;
      ctx.fillRect(block.x, block.y, block.w, block.h);
    } else if (block.type === 'parking') {
      ctx.fillStyle = '#5a5a60';
      ctx.fillRect(block.x, block.y, block.w, block.h);
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth = 2;
      for (let x = block.x + 24; x < block.x + block.w - 10; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, block.y + 8);
        ctx.lineTo(x, block.y + 34);
        ctx.stroke();
      }
    } else if (block.type === 'beach') {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(block.x, block.y, block.w, block.h);
    }
    for (const t of block.trees) {
      if (!inView(cam, t.x, t.y, 20)) continue;
      ctx.fillStyle = PALETTE.palmTrunk;
      ctx.fillRect(t.x - 2, t.y - 2, 4, 10);
      ctx.fillStyle = PALETTE.palm;
      ctx.beginPath();
      ctx.arc(t.x, t.y - 4, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBuilding(ctx, b, time) {
  const h = b.height * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(b.x + h * 0.5, b.y + h * 0.5, b.w, b.h);
  ctx.fillStyle = b.color;
  roundRect(ctx, b.x, b.y, b.w, b.h, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, 5);
  ctx.fillStyle = PALETTE.glass;
  const cols = Math.max(1, Math.floor(b.w / 26));
  const rows = Math.max(1, Math.floor(b.h / 26));
  for (let i = 0; i < cols; i += 1) {
    for (let j = 0; j < rows; j += 1) {
      ctx.fillRect(b.x + 10 + i * 26, b.y + 12 + j * 26, 12, 9);
    }
  }
  if (b.landmark) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.landmark.toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 4);
  }
}

function drawCarShape(ctx, car, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Wheels.
  ctx.fillStyle = '#181818';
  const hl = car.len / 2;
  const hw = car.wid / 2;
  ctx.fillRect(-hl + 6, -hw - 3, 12, 6);
  ctx.fillRect(-hl + 6, hw - 3, 12, 6);
  ctx.fillRect(hl - 18, -hw - 3, 12, 6);
  ctx.fillRect(hl - 18, hw - 3, 12, 6);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -hl, -hw, car.len, car.wid, 7);
  ctx.fill();
  // Windshield and roof.
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.fillRect(-6, -hw + 4, 14, car.wid - 8);
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(-hl + 8, -hw + 4, 10, car.wid - 8);
  if (car.driver === 'police') {
    const flash = Math.floor(time * 5) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2e2e' : '#2e6bff';
    ctx.beginPath();
    ctx.arc(-2, -hw + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#2e6bff' : '#ff2e2e';
    ctx.beginPath();
    ctx.arc(-2, hw - 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (car.marked) {
    ctx.strokeStyle = `rgba(255, 215, 60, ${0.6 + 0.4 * Math.sin(time * 6)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, hl + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  if (car.smoke > 0) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(car.x - Math.cos(car.angle) * 10, car.y - Math.sin(car.angle) * 10, 8 + Math.sin(time * 9) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPed(ctx, ped) {
  if (ped.dead) {
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ped.x, ped.y + 8, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.pants;
  ctx.fillRect(ped.x - 5, ped.y - 2, 10, 12);
  ctx.fillStyle = ped.shirt;
  ctx.beginPath();
  ctx.arc(ped.x, ped.y - 2, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ped.skin;
  ctx.beginPath();
  ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y - 4 + Math.sin(ped.angle) * 3, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayerShape(ctx, world) {
  const p = world.player;
  if (p.inCar) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + 9, 10, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Red jacket, the mark of Mara Voss.
  ctx.fillStyle = '#c23b2e';
  ctx.beginPath();
  ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.aimAngle || p.angle) * 4, p.y + Math.sin(p.aimAngle || p.angle) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.aimAngle || p.angle) * 20, p.y + Math.sin(p.aimAngle || p.angle) * 20);
  ctx.stroke();
  // Player ring so the eye finds her instantly.
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMissionBeacon(ctx, world) {
  const m = world.missions;
  if (!m.target) return;
  const t = m.target;
  const pulse = 0.55 + 0.35 * Math.sin(world.time * 5);
  ctx.fillStyle = `rgba(255, 215, 60, ${pulse * 0.25})`;
  ctx.fillRect(t.x - 26, t.y - 90, 52, 90);
  ctx.fillStyle = '#ffd73c';
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-11, -11, 22, 22);
  ctx.restore();
  ctx.strokeStyle = '#7a5a00';
  ctx.lineWidth = 2;
  ctx.strokeRect(t.x - 11, t.y - 11, 22, 22);
}

export function drawWorld(ctx, world) {
  const cam = world.camera;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  drawGround(ctx, world);
  drawRoads(ctx, world);
  drawBlocks(ctx, world);
  for (const b of world.city.buildings) {
    if (inView(cam, b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h) + 60)) drawBuilding(ctx, b, world.time);
  }
  // Skid marks.
  ctx.strokeStyle = 'rgba(20,20,20,0.55)';
  ctx.lineWidth = 5;
  for (const s of world.skids) {
    ctx.beginPath();
    ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
    ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
    ctx.stroke();
  }
  // Pickups.
  for (const pk of world.pickups) {
    if (!inView(cam, pk.x, pk.y, 20)) continue;
    const bob = Math.sin(pk.bob * 3) * 3;
    ctx.fillStyle = pk.kind === 'cash' ? '#ffd73c' : pk.kind === 'health' ? '#3fae6a' : '#4a7ad8';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + bob + 4);
  }
  for (const ped of world.peds) {
    if (inView(cam, ped.x, ped.y, 20)) drawPed(ctx, ped);
  }
  for (const car of world.cars) {
    if (car.dead && car.driver === 'police') continue;
    if (inView(cam, car.x, car.y, 60)) drawCarShape(ctx, car, world.time);
  }
  drawMissionBeacon(ctx, world);
  drawPlayerShape(ctx, world);
  // Bullets.
  ctx.fillStyle = '#ffe9a8';
  for (const b of world.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Particles.
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.max);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Hurt flash.
  if (world.player.hurtFlash > 0) {
    ctx.fillStyle = `rgba(200, 30, 30, ${world.player.hurtFlash * 0.5})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}
