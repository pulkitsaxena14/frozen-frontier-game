// Hold-to-harvest: hits the nearest living node on an interval scaled by tool
// quality. Each hit rolls the loot table; depletion pays bonus XP and starts
// the respawn timer.
import { dist } from '../utils/math.js';
import { mulberry32 } from '../utils/rng.js';
import { createLootRoller } from './loot.js';

export function createHarvest(ctx) {
  const { state, world, config, input, inventory, progression, events } = ctx;
  const rand = mulberry32((state.seed ^ 0x9e3779b9) >>> 0);
  const rollDrops = createLootRoller(rand);
  let hitTimer = 0;
  let fullWarnAt = -10;

  // Nearest living node within interact range of the player.
  function findTarget() {
    const p = state.player;
    const r = config.world.player.interact_radius;
    let best = null;
    let bestD = r;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    for (let y = cy - 2; y <= cy + 2; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        if (!world.isThawed(x, y)) continue;
        const node = world.nodeAt(x, y);
        if (!node || !node.alive) continue;
        const d = dist(p.x, p.y, x + 0.5, y + 0.5);
        if (d < bestD) { bestD = d; best = node; }
      }
    }
    return best;
  }

  function update(dt) {
    if (!input.actionHeld()) {
      hitTimer = 0;
      state.player.harvesting = null;
      return;
    }
    const target = findTarget();
    state.player.harvesting = target ? { x: target.x, y: target.y } : null;
    if (!target) { hitTimer = 0; return; }

    if (inventory.isFull()) {
      if (state.time - fullWarnAt > 3) {
        fullWarnAt = state.time;
        events.emit('inventory.full');
      }
      return;
    }

    hitTimer += dt;
    const speedResearch = state.research?.includes('swift_hands') ? 1.15 : 1;
    const interval = config.world.player.harvest_interval / (progression.toolMultiplier() * speedResearch);
    if (hitTimer < interval) return;
    hitTimer = 0;

    const result = world.damageNode(target.x, target.y, 1);
    if (!result) return;

    const crit = state.research?.includes('keen_eye') && rand() < 0.1;
    const gained = [];
    for (const d of rollDrops(result.def)) {
      const added = inventory.add(d.item, crit ? d.qty * 2 : d.qty);
      if (added > 0) {
        gained.push({ item: d.item, qty: added });
        state.stats.collected = (state.stats.collected ?? 0) + added;
        events.emit('item.collected', { item: d.item, count: added });
      }
    }

    progression.addXp(1);
    events.emit('node.hit', { x: target.x, y: target.y, def: result.def, drops: gained, crit });

    if (result.depleted) {
      progression.addXp(result.def.experience);
      events.emit('node.depleted', { x: target.x, y: target.y, def: result.def });
    }
  }

  return { update, findTarget };
}
