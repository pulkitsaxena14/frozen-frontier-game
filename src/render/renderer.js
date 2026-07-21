// Frame orchestrator. Reads game state, never mutates it.
import { createTerrain } from './terrain.js';
import { nodeSprites, drawRemnant } from './nodes.js';
import { creatureSprites, wanderOffset } from './creatures.js';
import { structureSprites, drawPlayer, drawVillager } from './structures.js';
import { phaseOf } from './common.js';
import { dist } from '../utils/math.js';

const MELT_SECONDS = 0.9;

export function createRenderer(ctx) {
  const { config, state, world, camera, events, particles } = ctx;
  const canvas = document.getElementById('game-canvas');
  const g = canvas.getContext('2d');
  const terrain = createTerrain(config, world.gen, world, state.seed);
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    camera.resize(canvas.clientWidth, canvas.clientHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  events.on('tile.unlocked', ({ x, y }) => terrain.invalidateTile(x, y));
  events.on('upgrade.purchased', ({ id }) => {
    if (id === 'furnace') terrain.invalidateAll();
  });

  function drawMeltOverlays(t) {
    const s = camera.scale();
    for (const [key, start] of world.thawAnim) {
      const p = (t - start) / MELT_SECONDS;
      if (p >= 1) { world.thawAnim.delete(key); continue; }
      if (p < 0) continue; // staggered ring melt hasn't reached this tile yet
      const [x, y] = key.split(',').map(Number);
      const sp = camera.toScreen(x, y);
      g.save();
      g.globalAlpha = 1 - p;
      g.fillStyle = '#dcedfa';
      const inset = p * s * 0.5;
      g.fillRect(sp.x + inset, sp.y + inset, s - inset * 2, s - inset * 2);
      g.restore();
    }
  }

  function drawFrontier(t) {
    const view = camera.visibleTiles();
    const s = camera.scale();
    const p = state.player;
    const pulse = 0.45 + Math.sin(t * 3) * 0.2;
    const cost = world.expansionCost();
    const affordable = state.coins >= cost;
    for (let y = view.y0; y <= view.y1; y++) {
      for (let x = view.x0; x <= view.x1; x++) {
        if (!world.isFrontier(x, y)) continue;
        const sp = camera.toScreen(x, y);
        g.save();
        g.globalAlpha = pulse;
        g.strokeStyle = affordable ? '#7ee08a' : '#7fb1d8';
        g.lineWidth = 2;
        g.setLineDash([s * 0.14, s * 0.1]);
        g.strokeRect(sp.x + s * 0.08, sp.y + s * 0.08, s * 0.84, s * 0.84);
        g.restore();
        if (s >= 38 && dist(p.x, p.y, x + 0.5, y + 0.5) < 5.5) {
          g.save();
          g.globalAlpha = 0.9;
          g.font = `700 ${Math.max(10, s * 0.2)}px Nunito, sans-serif`;
          g.textAlign = 'center';
          g.fillStyle = affordable ? '#d8ffdd' : '#ffd9d9';
          g.fillText(`🪙${cost}`, sp.x + s / 2, sp.y + s * 0.56);
          g.restore();
        }
      }
    }
  }

  function collectEntities(t) {
    const view = camera.visibleTiles();
    const list = [];
    for (let y = view.y0; y <= view.y1; y++) {
      for (let x = view.x0; x <= view.x1; x++) {
        const b = world.gen.buildingAt(x, y);
        if (b) {
          list.push({ y: y + 0.5, kind: 'building', b, x, ty: y });
          continue;
        }
        if (!world.isThawed(x, y)) continue;
        const node = world.nodeAt(x, y);
        if (node) list.push({ y: y + 0.5, kind: 'node', node, x, ty: y });
      }
    }
    for (const v of ctx.villagers.list()) list.push({ y: v.y, kind: 'villager', v });
    list.push({ y: state.player.y, kind: 'player' });
    list.sort((a, b) => a.y - b.y);
    return list;
  }

  function drawEntity(e, t) {
    const s = camera.scale();
    if (e.kind === 'player') {
      const sp = camera.toScreen(state.player.x, state.player.y);
      g.save();
      g.translate(sp.x, sp.y);
      drawPlayer(g, s, t, state.player, !!state.player.harvesting);
      g.restore();
      return;
    }
    if (e.kind === 'villager') {
      const sp = camera.toScreen(e.v.x, e.v.y);
      g.save();
      g.translate(sp.x, sp.y);
      g.scale(e.v.facing, 1);
      drawVillager(g, s, t, e.v);
      g.restore();
      const job = ctx.villagers.jobOf(e.v);
      if (job) {
        const icon = job.job === 'harvest'
          ? '🪓'
          : config.itemsById[config.recipesById[job.recipe]?.outputs[0].item]?.icon ?? '⚒️';
        g.save();
        g.globalAlpha = 0.9;
        g.font = `${Math.max(11, s * 0.24)}px sans-serif`;
        g.textAlign = 'center';
        g.fillText(icon, sp.x, sp.y - s * 0.55 + Math.sin(t * 2 + e.v.ph) * s * 0.04);
        g.restore();
      }
      return;
    }
    const ph = phaseOf(e.x, e.ty);
    if (e.kind === 'building') {
      const sp = camera.toScreen(e.x + 0.5, e.ty + 0.5);
      g.save();
      g.translate(sp.x, sp.y);
      structureSprites[e.b.id]?.(g, s, t, ph, state.upgrades.furnace);
      g.restore();
      return;
    }
    // node
    const { node } = e;
    let ox = 0.5;
    let oy = 0.5;
    if (node.def.mobile && node.alive) {
      const w = wanderOffset(t, ph);
      ox += w.x;
      oy += w.y;
    }
    const sp = camera.toScreen(e.x + ox, e.ty + oy);
    g.save();
    g.translate(sp.x, sp.y);
    if (!node.alive) {
      drawRemnant(g, s);
    } else {
      // hit feedback: brief squash after each hp loss
      const hurt = node.hp < node.def.health;
      const target = state.player.harvesting;
      const isTarget = target && target.x === e.x && target.y === e.ty;
      if (isTarget) {
        const wob = Math.sin(t * 26) * 0.05;
        g.rotate(wob * 0.3);
        g.scale(1 + wob * 0.4, 1 - wob * 0.4);
      }
      (creatureSprites[node.def.sprite] ?? nodeSprites[node.def.sprite] ?? nodeSprites.stone_rock)(
        g, s, t, ph
      );
      if (hurt) drawHpArc(node, s);
    }
    g.restore();
  }

  function drawHpArc(node, s) {
    const frac = node.hp / node.def.health;
    g.save();
    g.lineWidth = Math.max(3, s * 0.06);
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(10, 22, 40, 0.45)';
    g.beginPath();
    g.arc(0, -s * 0.75, s * 0.2, -Math.PI * 0.85, -Math.PI * 0.15);
    g.stroke();
    g.strokeStyle = frac > 0.4 ? '#7ee08a' : '#ffb95e';
    g.beginPath();
    g.arc(0, -s * 0.75, s * 0.2, -Math.PI * 0.85, -Math.PI * (0.85 - 0.7 * frac));
    g.stroke();
    g.restore();
  }

  function drawLight(t) {
    const s = camera.scale();
    const fp = camera.toScreen(world.gen.center + 0.5, world.gen.center + 0.5);
    const r = world.heatRadius() * s;
    // warm furnace glow
    const flick = 1 + Math.sin(t * 7) * 0.02;
    const grad = g.createRadialGradient(fp.x, fp.y, r * 0.05, fp.x, fp.y, r * flick);
    grad.addColorStop(0, 'rgba(255, 170, 80, 0.22)');
    grad.addColorStop(0.6, 'rgba(255, 150, 70, 0.08)');
    grad.addColorStop(1, 'rgba(255, 150, 70, 0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, camera.viewW, camera.viewH);
    // cool vignette
    const v = g.createRadialGradient(
      camera.viewW / 2, camera.viewH / 2, Math.min(camera.viewW, camera.viewH) * 0.4,
      camera.viewW / 2, camera.viewH / 2, Math.max(camera.viewW, camera.viewH) * 0.75
    );
    v.addColorStop(0, 'rgba(8, 16, 32, 0)');
    v.addColorStop(1, 'rgba(8, 16, 32, 0.42)');
    g.fillStyle = v;
    g.fillRect(0, 0, camera.viewW, camera.viewH);
  }

  // Quest compass: marker over the target tile, or an edge arrow when the
  // target is off-screen. Keeps "where do I go next?" always answered.
  function drawCompass(t) {
    const target = ctx.compass.target();
    if (!target) return;
    const p = state.player;
    const thawed = world.isThawed(target.x, target.y);
    const d = dist(p.x, p.y, target.x + 0.5, target.y + 0.5);
    if (thawed && d < 4) return; // player is basically there
    const sp = camera.toScreen(target.x + 0.5, target.y + 0.5);
    const s = camera.scale();
    const m = 70;
    const pulse = 0.55 + Math.sin(t * 3) * 0.25;
    const onScreen = sp.x > m && sp.x < camera.viewW - m && sp.y > m && sp.y < camera.viewH - m;

    if (onScreen) {
      const bob = Math.sin(t * 2.4) * s * 0.08;
      if (!thawed) {
        g.save();
        g.globalAlpha = pulse;
        g.strokeStyle = '#9fe8ff';
        g.lineWidth = 3;
        g.setLineDash([s * 0.18, s * 0.12]);
        g.beginPath();
        g.arc(sp.x, sp.y, s * 0.55, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
      g.save();
      g.globalAlpha = 0.95;
      g.font = `${Math.max(16, s * 0.4)}px sans-serif`;
      g.textAlign = 'center';
      g.fillText(target.icon, sp.x, sp.y - s * 0.7 + bob);
      if (!thawed) {
        g.font = `700 ${Math.max(10, s * 0.18)}px Nunito, sans-serif`;
        g.fillStyle = '#bfe3ff';
        g.fillText('under the ice', sp.x, sp.y + s * 0.85);
      }
      g.restore();
      return;
    }

    // edge arrow chip
    const cx = camera.viewW / 2;
    const cy = camera.viewH / 2;
    const ang = Math.atan2(sp.y - cy, sp.x - cx);
    const kx = (camera.viewW / 2 - m) / Math.max(0.001, Math.abs(Math.cos(ang)));
    const ky = (camera.viewH / 2 - m) / Math.max(0.001, Math.abs(Math.sin(ang)));
    const k = Math.min(kx, ky);
    const ax = cx + Math.cos(ang) * k;
    const ay = cy + Math.sin(ang) * k;
    g.save();
    g.globalAlpha = 0.7 + pulse * 0.3;
    g.fillStyle = 'rgba(16, 38, 70, 0.8)';
    g.strokeStyle = 'rgba(159, 232, 255, 0.7)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(ax, ay, 22, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.font = '19px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(target.icon, ax, ay + 1);
    g.translate(ax + Math.cos(ang) * 32, ay + Math.sin(ang) * 32);
    g.rotate(ang);
    g.beginPath();
    g.moveTo(8, 0);
    g.lineTo(-4, -7);
    g.lineTo(-4, 7);
    g.closePath();
    g.fillStyle = '#9fe8ff';
    g.fill();
    g.restore();
    g.textBaseline = 'alphabetic';
  }

  function render() {
    const t = state.time;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b1b33';
    g.fillRect(0, 0, camera.viewW, camera.viewH);
    g.imageSmoothingEnabled = true;

    terrain.draw(g, camera);
    drawMeltOverlays(t);
    drawFrontier(t);
    for (const e of collectEntities(t)) drawEntity(e, t);
    particles.drawWorld(g, camera);
    drawLight(t);
    drawCompass(t);
    particles.drawScreen(g);
  }

  return { render, resize };
}
