// Quest compass: finds the nearest tile whose node drops the item the
// player actually needs to go find — even under frozen ground — so
// expansion always has a direction. The renderer draws the marker/arrow.
//
// For collect_item quests that's just the quest's own target. For
// craft_item quests (e.g. "Forge 2 iron ingots") the target itself isn't
// harvested — it walks the recipe's inputs upstream (same chain-following
// as the auto-sell reservation logic) to find whichever raw ingredient the
// player doesn't have enough of yet, so a quest like that still points
// somewhere useful instead of going silent. Iron ingots need iron_ore AND
// coal; a player who followed the compass straight to iron_ore during the
// previous quest may never have crossed paths with coal.
//
// The target is picked once per (quest, missing ingredient) and then locked
// in, rather than re-searching "nearest" as the player moves. Resource
// types tend to appear at many points around a biome ring, so a
// distance-based recheck would often flip to a different instance in a
// completely different direction after only a few tiles of travel — the
// compass would visibly swing direction mid-walk, and a player chasing it
// could melt frontier tiles in several directions for what looks like the
// same resource. The "which ingredient" part still updates live — once the
// player picks up enough of it, the next-neediest ingredient takes over —
// but the direction for whichever ingredient is current stays locked.
import { dist } from '../utils/math.js';

const SEARCH_RADIUS = 64;

export function createCompass(ctx) {
  const { state, config, world, inventory } = ctx;
  let cache = null; // { questIndex, targetItem, target }

  function sourceIdsFor(itemId) {
    const ids = new Set();
    for (const r of config.resources) {
      if (r.drops.some((d) => d.item === itemId)) ids.add(r.id);
    }
    return ids;
  }

  // Walk a recipe's inputs upstream for the first one the player is short
  // on. Crafted inputs recurse into their own recipe; cycle-guarded via seen.
  function missingIngredient(itemId, seen = new Set()) {
    if (seen.has(itemId)) return null;
    seen.add(itemId);
    const recipe = config.recipes.find((r) => r.outputs.some((o) => o.item === itemId));
    if (!recipe) return null;
    for (const input of recipe.inputs) {
      if ((inventory?.count(input.item) ?? 0) >= input.amount) continue; // have enough already
      if (config.itemsById[input.item]?.crafted) {
        const upstream = missingIngredient(input.item, seen);
        if (upstream) return upstream;
        continue; // no reachable source upstream either — try the next input
      }
      const ids = sourceIdsFor(input.item);
      if (ids.size) return { targetItem: input.item, ids };
    }
    return null;
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
    if (!quest) return null;

    let targetItem;
    let ids;
    if (quest.type === 'collect_item') {
      targetItem = quest.target;
      ids = sourceIdsFor(quest.target);
    } else if (quest.type === 'craft_item') {
      const missing = missingIngredient(quest.target);
      if (!missing) return null; // already have everything, or nothing findable
      ({ targetItem, ids } = missing);
    } else {
      return null;
    }

    if (cache && cache.questIndex === state.quest.index && cache.targetItem === targetItem) {
      return cache.target;
    }
    const p = state.player;
    const found = ids.size ? findNearest(ids, Math.round(p.x), Math.round(p.y)) : null;
    if (!found) return null; // nothing in range yet — don't lock in a miss, retry next call
    cache = {
      questIndex: state.quest.index,
      targetItem,
      target: { ...found, icon: config.itemsById[targetItem].icon },
    };
    return cache.target;
  }

  return { target };
}
