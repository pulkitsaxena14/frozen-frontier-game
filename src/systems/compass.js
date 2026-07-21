// Quest compass: for collect_item quests, finds the nearest tile whose node
// drops the target item — even under frozen ground — so expansion always has
// a direction. The renderer draws the marker/arrow.
//
// The target is picked once per quest and then locked in, rather than
// re-searching "nearest" as the player moves. Resource types tend to appear
// at many points around a biome ring, so a distance-based recheck would
// often flip to a different instance in a completely different direction
// after only a few tiles of travel — the compass would visibly swing
// direction mid-walk, and a player chasing it could melt frontier tiles in
// several different directions for what looks like the same resource.
// Locking to one pick keeps "which way do I go" a single, stable answer.
import { dist } from '../utils/math.js';

const SEARCH_RADIUS = 64;

export function createCompass(ctx) {
  const { state, config, world } = ctx;
  let cache = null; // { questIndex, target }

  function sourceIdsFor(itemId) {
    const ids = new Set();
    for (const r of config.resources) {
      if (r.drops.some((d) => d.item === itemId)) ids.add(r.id);
    }
    return ids;
  }

  // Outward ring scan; the first hit ring is approximately nearest.
  function findNearest(ids, cx, cy) {
    let best = null;
    let bestD = Infinity;
    const check = (x, y) => {
      if (x < 0 || y < 0 || x >= world.gen.size || y >= world.gen.size) return;
      const def = world.gen.nodeDefAt(x, y);
      if (!def || !ids.has(def.id)) return;
      const d = dist(cx, cy, x, y);
      if (d < bestD) { bestD = d; best = { x, y }; }
    };
    for (let r = 0; r <= SEARCH_RADIUS; r++) {
      for (let dx = -r; dx <= r; dx++) {
        check(cx + dx, cy - r);
        if (r > 0) check(cx + dx, cy + r);
      }
      for (let dy = -r + 1; dy <= r - 1; dy++) {
        check(cx - r, cy + dy);
        check(cx + r, cy + dy);
      }
      if (best) return best; // allow the ring to finish before returning
    }
    return best;
  }

  function target() {
    const quest = config.quests[state.quest.index];
    if (!quest || quest.type !== 'collect_item') return null;
    if (cache && cache.questIndex === state.quest.index) return cache.target;
    const p = state.player;
    const ids = sourceIdsFor(quest.target);
    const found = ids.size ? findNearest(ids, Math.round(p.x), Math.round(p.y)) : null;
    if (!found) return null; // nothing in range yet — don't lock in a miss, retry next call
    cache = {
      questIndex: state.quest.index,
      target: { ...found, icon: config.itemsById[quest.target].icon },
    };
    return cache.target;
  }

  return { target };
}
