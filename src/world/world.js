// Runtime world state: thawed tiles, node health/respawn, walkability.
// Static terrain comes from worldgen; only player-caused changes live in state.
import { tileKey, roundCost } from '../utils/math.js';

export function createWorld(config, gen, state, events) {
  const purchased = new Set(state.purchasedTiles);
  const thawAnim = new Map(); // key → game time the melt started (render-only)

  const buildings = config.world.buildings.map((b) => ({
    ...b,
    x: gen.center + b.dx,
    y: gen.center + b.dy,
  }));

  function heatRadius() {
    const bonus = state.research?.includes('efficient_flame') ? 2 : 0;
    return Math.min(
      config.world.heat_max_radius,
      config.world.heat_base_radius + state.upgrades.furnace + bonus
    );
  }

  function inHeat(x, y) {
    const dx = x - gen.center;
    const dy = y - gen.center;
    return dx * dx + dy * dy <= heatRadius() ** 2;
  }

  function isThawed(x, y) {
    if (x < 0 || y < 0 || x >= gen.size || y >= gen.size) return false;
    return inHeat(x, y) || purchased.has(tileKey(x, y));
  }

  function isFrontier(x, y) {
    if (isThawed(x, y)) return false;
    if (x < 0 || y < 0 || x >= gen.size || y >= gen.size) return false;
    return (
      isThawed(x - 1, y) || isThawed(x + 1, y) || isThawed(x, y - 1) || isThawed(x, y + 1)
    );
  }

  function expansionCost() {
    const discount = state.research?.includes('frost_walker') ? 0.9 : 1;
    return roundCost(
      (config.economy.expansion_base + purchased.size * config.economy.expansion_per_tile) * discount
    );
  }

  function buyTile(x, y) {
    const key = tileKey(x, y);
    purchased.add(key);
    state.purchasedTiles.push(key);
    thawAnim.set(key, state.time);
    events.emit('tile.unlocked', { x, y, count: purchased.size });
  }

  // Furnace upgrades melt a whole new ring at once — mark those tiles so the
  // renderer can play the melt animation for each.
  function thawRing(prevRadius) {
    const r = heatRadius();
    for (let y = gen.center - r; y <= gen.center + r; y++) {
      for (let x = gen.center - r; x <= gen.center + r; x++) {
        const dx = x - gen.center;
        const dy = y - gen.center;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r * r && d2 > prevRadius * prevRadius && !purchased.has(tileKey(x, y))) {
          thawAnim.set(tileKey(x, y), state.time + Math.sqrt(d2) * 0.06);
        }
      }
    }
  }

  // --- resource nodes -------------------------------------------------------
  // state.nodes only stores tiles the player has touched: { hp, respawnAt }.
  function nodeAt(x, y) {
    const def = gen.nodeDefAt(x, y);
    if (!def) return null;
    const key = tileKey(x, y);
    const rec = state.nodes[key];
    if (rec) {
      if (rec.hp <= 0) {
        if (state.time < rec.respawnAt) return { def, x, y, hp: 0, alive: false };
        delete state.nodes[key]; // respawned — back to pristine
      } else {
        return { def, x, y, hp: rec.hp, alive: true };
      }
    }
    return { def, x, y, hp: def.health, alive: true };
  }

  function damageNode(x, y, amount) {
    const node = nodeAt(x, y);
    if (!node || !node.alive) return null;
    const key = tileKey(x, y);
    const hp = node.hp - amount;
    if (hp <= 0) {
      state.nodes[key] = { hp: 0, respawnAt: state.time + node.def.respawn };
      return { def: node.def, depleted: true };
    }
    state.nodes[key] = { hp, respawnAt: 0 };
    return { def: node.def, depleted: false };
  }

  function isWalkable(x, y) {
    const tx = Math.floor(x);
    const ty = Math.floor(y);
    if (!isThawed(tx, ty)) return false;
    return !gen.buildingAt(tx, ty);
  }

  return {
    gen,
    buildings,
    purchased,
    thawAnim,
    heatRadius,
    inHeat,
    isThawed,
    isFrontier,
    expansionCost,
    buyTile,
    thawRing,
    nodeAt,
    damageNode,
    isWalkable,
  };
}
