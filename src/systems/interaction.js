// Taps and the interact key: open buildings, buy frontier tiles.
import { dist } from '../utils/math.js';

const BUILDING_OPEN_RANGE = 2.6;
// Workers now routinely leave their post for market runs (selling surplus
// crafted goods or a full backpack of raw materials), not just wandering
// villagers — a tight range meant a worker you walked up to at their
// building/camp spot was often actually away selling and un-tappable. Wide
// enough to comfortably cover "at the merchant while I'm back at camp".
const VILLAGER_SELECT_RANGE = 10;

export function createInteraction(ctx) {
  const { state, world, events, camera, economy } = ctx;

  function nearestBuilding(maxDist = BUILDING_OPEN_RANGE) {
    const p = state.player;
    let best = null;
    let bestD = maxDist;
    for (const b of world.buildings) {
      const d = dist(p.x, p.y, b.x + 0.5, b.y + 0.5);
      if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }

  function tryBuyTile(tx, ty) {
    const cost = world.expansionCost();
    if (!economy.spend(cost)) {
      events.emit('ui.toast', { text: `Need 🪙${cost} to melt this tile`, kind: 'warn' });
      return false;
    }
    world.buyTile(tx, ty);
    return true;
  }

  // Nearest villager to the tap point (sprite bodies extend ~half a tile up).
  // Overlapping villagers resolve to whichever is closest to the tap.
  function villagerNear(wx, wy, radius) {
    const p = state.player;
    let best = null;
    let bestD = radius;
    for (const v of ctx.villagers.list()) {
      if (dist(v.x, v.y, p.x, p.y) > VILLAGER_SELECT_RANGE) continue;
      const d = Math.min(dist(v.x, v.y, wx, wy), dist(v.x, v.y - 0.45, wx, wy));
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }

  events.on('input.tap', ({ x, y }) => {
    const w = camera.toWorld(x, y);
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);

    // A precise tap on a villager wins even when they stand at a building —
    // the sprite under the finger is what the player is aiming at.
    const precise = villagerNear(w.x, w.y, 0.55);
    if (precise) {
      events.emit('ui.openWorker', { slot: precise.slot });
      return;
    }

    // Building sprites extend upward past their tile — accept taps on the tile
    // above by also checking the tile below the tapped one.
    const b = world.gen.buildingAt(tx, ty) ?? world.gen.buildingAt(tx, ty + 1);
    if (b) {
      const near = nearestBuilding();
      if (near && near.id === b.id) {
        events.emit('ui.openBuilding', { building: near });
      } else {
        events.emit('ui.toast', { text: `Walk closer to the ${b.name}`, kind: 'warn' });
      }
      return;
    }

    // Looser villager pick for imprecise taps on open ground.
    const loose = villagerNear(w.x, w.y, 1.1);
    if (loose) {
      events.emit('ui.openWorker', { slot: loose.slot });
      return;
    }

    if (world.isFrontier(tx, ty)) tryBuyTile(tx, ty);
  });

  events.on('input.interact', () => {
    const near = nearestBuilding();
    if (near) events.emit('ui.openBuilding', { building: near });
  });

  return { nearestBuilding, tryBuyTile };
}
