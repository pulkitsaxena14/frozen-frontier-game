// Villagers arrive as quests complete. Unassigned ones wander for atmosphere;
// assigned workers harvest the camp or run a crafting station on repeat.
// Workers run at 75% of player efficiency (90% with Worker Training research)
// and never earn XP — the player stays the settlement's best hand.
import { dist } from '../utils/math.js';
import { mulberry32 } from '../utils/rng.js';
import { createLootRoller } from './loot.js';

const MAX_VILLAGERS = 6;
const QUESTS_PER_VILLAGER = 2;
const WALK_SPEED = 1.6; // tiles/sec
const CAMP_REACH = 6; // how far past the heat radius workers will roam
const FULL_RETRY_SECONDS = 5;
const ARRIVE = 0.08;
const STUCK_AFTER = 0.8; // seconds of no progress before trying a detour
const PERSONAL_SPACE = 0.42; // villagers softly push apart below this distance

export function createVillagers(ctx) {
  const { state, world, config, events } = ctx;
  const rand = mulberry32((state.seed ^ 0x51ab3e) >>> 0);
  const rollDrops = createLootRoller(rand);
  const villagers = [];
  let fullToastAt = -60;

  // Legacy saves may have a villager on the old standalone 'sell' job, which
  // no longer exists — crafters and harvesters sell their own surplus now.
  for (const [slot, job] of Object.entries(state.workers ?? {})) {
    if (job?.job === 'sell') state.workers[slot] = { job: 'harvest' };
  }

  const efficiency = () =>
    state.research?.includes('worker_training') ? 0.9 : 0.75;

  function desiredCount() {
    return Math.min(MAX_VILLAGERS, Math.floor(state.quest.index / QUESTS_PER_VILLAGER));
  }

  function jobOf(v) {
    return state.workers[v.slot] ?? null;
  }

  function assign(slot, job) {
    if (job) state.workers[slot] = job;
    else delete state.workers[slot];
    const v = villagers.find((x) => x.slot === slot);
    if (v) { v.target = null; v.hitTimer = 0; v.idleUntil = 0; v.waitUntil = 0; v.detour = null; v.stuckTime = 0; v.wanderDeadline = 0; v.marketRun = false; }
    events.emit('worker.assigned', { slot, job });
  }

  function randomSpot() {
    const c = world.gen.center;
    for (let tries = 0; tries < 12; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 1.5 + rand() * (world.heatRadius() - 2);
      const x = c + 0.5 + Math.cos(a) * r;
      const y = c + 0.5 + Math.sin(a) * r;
      if (world.isWalkable(x, y)) return { x, y };
    }
    return { x: c + 0.5, y: c + 1.5 };
  }

  function spawn() {
    const spot = randomSpot();
    villagers.push({
      slot: villagers.length, x: spot.x, y: spot.y, tx: spot.x, ty: spot.y,
      variant: villagers.length, ph: rand() * 6.28,
      idleUntil: state.time + rand() * 3, moving: false, facing: 1,
      target: null, hitTimer: 0, waitUntil: 0, marketRun: false,
      stuckTime: 0, detour: null, detourUntil: 0, wanderDeadline: 0,
      targetSince: 0, blocked: {},
    });
  }

  // Each worker stands at a distinct spot when sharing a building.
  const standOffset = (v) => (v.slot - 2.5) * 0.35;

  // Walk toward (tx, ty); returns remaining distance. Slides along obstacles
  // at full speed and accumulates v.stuckTime when making no progress.
  function walkToward(v, tx, ty, dt) {
    const d = dist(v.x, v.y, tx, ty);
    if (d < ARRIVE) { v.moving = false; v.stuckTime = 0; return 0; }
    v.moving = true;
    const step = Math.min(d, WALK_SPEED * dt);
    const dx = ((tx - v.x) / d) * step;
    const dy = ((ty - v.y) / d) * step;
    const canX = world.isWalkable(v.x + dx, v.y);
    const canY = world.isWalkable(v.x, v.y + dy);
    if (canX && canY && world.isWalkable(v.x + dx, v.y + dy)) {
      v.x += dx;
      v.y += dy;
    } else if (canX) {
      v.x += Math.sign(dx || 1) * Math.min(step, Math.abs(tx - v.x) || step);
    } else if (canY) {
      v.y += Math.sign(dy || 1) * Math.min(step, Math.abs(ty - v.y) || step);
    }
    if (Math.abs(dx) > 1e-9) v.facing = dx > 0 ? 1 : -1;
    const after = dist(v.x, v.y, tx, ty);
    v.stuckTime = d - after < step * 0.25 ? v.stuckTime + dt : 0;
    return after;
  }

  // walkToward plus stuck recovery: when progress stalls, wander to a random
  // nearby walkable spot first, then resume the real goal.
  function pickDetour(v) {
    for (let tries = 0; tries < 10; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 1 + rand() * 1.8;
      const x = v.x + Math.cos(a) * r;
      const y = v.y + Math.sin(a) * r;
      if (world.isWalkable(x, y)) return { x, y };
    }
    return null;
  }

  function travel(v, tx, ty, dt) {
    if (v.detour) {
      const dd = walkToward(v, v.detour.x, v.detour.y, dt);
      if (dd < 0.2 || state.time > v.detourUntil || v.stuckTime > STUCK_AFTER) {
        v.detour = null;
        v.stuckTime = 0;
      }
      return dist(v.x, v.y, tx, ty);
    }
    const d = walkToward(v, tx, ty, dt);
    if (v.stuckTime > STUCK_AFTER) {
      v.stuckTime = 0;
      v.detour = pickDetour(v);
      v.detourUntil = state.time + 2.5;
    }
    return d;
  }

  // Nearest living node in the camp zone not claimed by another worker.
  function findWorkNode(v) {
    const c = world.gen.center;
    const reach = world.heatRadius() + CAMP_REACH;
    let best = null;
    let bestD = Infinity;
    for (let y = c - reach; y <= c + reach; y++) {
      for (let x = c - reach; x <= c + reach; x++) {
        if (!world.isThawed(x, y)) continue;
        const node = world.nodeAt(x, y);
        if (!node || !node.alive) continue;
        if ((v.blocked[`${x},${y}`] ?? 0) > state.time) continue; // unreachable lately
        const claimed = villagers.some(
          (o) => o !== v && o.target && o.target.x === x && o.target.y === y
        );
        if (claimed) continue;
        const d = dist(v.x, v.y, x + 0.5, y + 0.5);
        if (d < bestD) { bestD = d; best = { x, y }; }
      }
    }
    return best;
  }

  function sellAtStall(v, items, dt) {
    const stall = world.buildings.find((b) => b.id === 'merchant');
    if (!stall) return true; // nothing to travel toward — treat as done
    const d = travel(v, stall.x + 1.2 + standOffset(v) * 0.6, stall.y + 0.9, dt);
    if (d > 1.4) return false;
    v.moving = false;
    let earned = 0;
    for (const item of items) {
      const id = item.id ?? item;
      const qty = ctx.economy.sellableQty(id);
      if (qty > 0) earned += ctx.economy.sell(id, qty, { worker: true });
    }
    if (earned > 0) {
      ctx.particles.floatText(stall.x + 0.5, stall.y - 0.6, `+🪙${earned}`, '#ffd24a');
    }
    return true;
  }

  function updateHarvester(v, dt) {
    if (state.time < v.waitUntil) { v.moving = false; return; }
    if (ctx.inventory.isFull()) {
      const sellable = ctx.economy.harvesterSellables();
      if (sellable.length === 0) {
        v.moving = false;
        v.waitUntil = state.time + FULL_RETRY_SECONDS;
        if (state.time - fullToastAt > 30) {
          fullToastAt = state.time;
          events.emit('ui.toast', { text: '🎒 Workers paused — backpack full of reserved materials!' });
        }
        return;
      }
      if (sellAtStall(v, sellable, dt)) v.waitUntil = state.time + 0.5;
      return;
    }
    if (v.target) {
      const node = world.nodeAt(v.target.x, v.target.y);
      if (!node || !node.alive) v.target = null;
    }
    if (!v.target) {
      v.target = findWorkNode(v);
      if (!v.target) { v.waitUntil = state.time + 3; return; }
      v.targetSince = state.time;
    }
    const d = travel(v, v.target.x + 0.5, v.target.y + 0.85, dt);
    if (d > 1.0) {
      // Detours failing for a long while — the node is walled off; skip it.
      if (state.time - v.targetSince > 10) {
        v.blocked[`${v.target.x},${v.target.y}`] = state.time + 30;
        v.target = null;
      }
      return;
    }
    v.moving = false;
    v.hitTimer += dt;
    const interval =
      config.world.player.harvest_interval / (ctx.progression.toolMultiplier() * efficiency());
    if (v.hitTimer < interval) return;
    v.hitTimer = 0;
    const result = world.damageNode(v.target.x, v.target.y, 1);
    if (!result) { v.target = null; return; }
    const gained = [];
    for (const drop of rollDrops(result.def)) {
      const added = ctx.inventory.add(drop.item, drop.qty);
      if (added > 0) {
        gained.push({ item: drop.item, qty: added });
        events.emit('item.collected', { item: drop.item, count: added });
      }
    }
    events.emit('node.hit', {
      x: v.target.x, y: v.target.y, def: result.def, drops: gained, worker: true,
    });
    if (result.depleted) {
      events.emit('node.depleted', { x: v.target.x, y: v.target.y, def: result.def, worker: true });
      v.target = null;
    }
  }

  const CRAFTER_SURPLUS = 6; // sell own output once this many pile up, so a
  // well-supplied crafter doesn't hoard forever between craft cycles

  function updateCrafter(v, job, dt) {
    const recipe = config.recipesById[job.recipe];
    if (!recipe) return;
    const outputId = recipe.outputs[0].item;

    if (v.marketRun) {
      if (sellAtStall(v, [outputId], dt)) v.marketRun = false;
      return;
    }

    const building = world.buildings.find((b) => b.id === job.building);
    if (!building) return;
    const d = travel(v, building.x + 0.5 + standOffset(v), building.y + 1.3, dt);
    if (d > 1.4) return;
    v.moving = false;
    if (state.time < v.waitUntil) return;

    const sellableHeld = ctx.economy.sellableQty(outputId);
    const canSell = sellableHeld > 0;
    if (canSell && sellableHeld >= CRAFTER_SURPLUS) { v.marketRun = true; return; }

    if (ctx.crafting.start(job.recipe, { timeMult: 1 / efficiency(), worker: true })) {
      v.waitUntil = state.time + recipe.time / efficiency() + 0.5;
    } else if (canSell) {
      v.marketRun = true; // nothing to craft right now — sell what we have instead of idling
    } else {
      v.waitUntil = state.time + 3; // missing inputs and nothing to sell — check again shortly
    }
  }

  function updateWanderer(v, dt) {
    if (state.time < v.idleUntil) { v.moving = false; return; }
    if (!v.wanderDeadline) v.wanderDeadline = state.time + 8;
    const d = travel(v, v.tx, v.ty, dt);
    // Arrived — or the spot proved unreachable; either way pick a fresh one.
    if (d < 0.15 || state.time > v.wanderDeadline) {
      const spot = randomSpot();
      v.tx = spot.x;
      v.ty = spot.y;
      v.idleUntil = state.time + 1.5 + rand() * 4;
      v.wanderDeadline = 0;
      v.detour = null;
      v.stuckTime = 0;
    }
  }

  // Soft collision: overlapping villagers drift apart so each stays tappable.
  function separate(dt) {
    const k = Math.min(1, dt * 6);
    for (let i = 0; i < villagers.length; i++) {
      for (let j = i + 1; j < villagers.length; j++) {
        const a = villagers[i];
        const b = villagers[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= PERSONAL_SPACE) continue;
        if (d < 1e-4) { const ang = a.ph + i; dx = Math.cos(ang); dy = Math.sin(ang); }
        else { dx /= d; dy /= d; }
        const push = (PERSONAL_SPACE - d) * 0.5 * k;
        if (world.isWalkable(a.x - dx * push, a.y - dy * push)) {
          a.x -= dx * push;
          a.y -= dy * push;
        }
        if (world.isWalkable(b.x + dx * push, b.y + dy * push)) {
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
  }

  function update(dt) {
    while (villagers.length < desiredCount()) spawn();
    for (const v of villagers) {
      const job = jobOf(v);
      if (!job) updateWanderer(v, dt);
      else if (job.job === 'harvest') updateHarvester(v, dt);
      else if (job.job === 'craft') updateCrafter(v, job, dt);
    }
    separate(dt);
  }

  return { update, list: () => villagers, assign, jobOf, efficiency };
}
