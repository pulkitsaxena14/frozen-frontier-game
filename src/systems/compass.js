// Quest compass: for collect_item quests, finds the nearest tile whose node
// drops the target item — even under frozen ground — so expansion always has
// a direction. The renderer draws the marker/arrow.
import { dist } from '../utils/math.js';

const SEARCH_RADIUS = 64;
const RECHECK_DISTANCE = 4; // recompute after the player moves this far

export function createCompass(ctx) {
  const { state, config, world } = ctx;
  let cache = null; // { questIndex, px, py, target }

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
    const p = state.player;
    if (
      cache &&
      cache.questIndex === state.quest.index &&
      dist(p.x, p.y, cache.px, cache.py) < RECHECK_DISTANCE
    ) {
      return cache.target;
    }
    const ids = sourceIdsFor(quest.target);
    const found = ids.size ? findNearest(ids, Math.round(p.x), Math.round(p.y)) : null;
    cache = {
      questIndex: state.quest.index,
      px: p.x,
      py: p.y,
      target: found ? { ...found, icon: config.itemsById[quest.target].icon } : null,
    };
    return cache.target;
  }

  return { target };
}
