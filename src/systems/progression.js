// XP, levels and permanent upgrades (furnace, tools, boots, backpack, magnet).
import { roundCost } from '../utils/math.js';

// Upgrades that exist from the start (level shown to player starts here).
const START_LEVELS = { furnace: 1, tool: 1 };

export function createProgression(ctx) {
  const { state, events, config, world } = ctx;

  function xpForNextLevel() {
    return Math.round(config.economy.xp_curve_base * state.level ** config.economy.xp_curve_exp);
  }

  function addXp(n) {
    state.xp += n;
    events.emit('xp.gained', { amount: n });
    while (state.xp >= xpForNextLevel()) {
      state.xp -= xpForNextLevel();
      state.level += 1;
      const bonus = 25 * state.level;
      ctx.economy.addCoins(bonus, { countAsEarned: false });
      events.emit('level.up', { level: state.level, bonus });
    }
  }

  function upgradeLevel(id) {
    return state.upgrades[id] ?? 0;
  }

  function upgradeCost(id) {
    const def = config.upgradesById[id];
    const bought = upgradeLevel(id) - (START_LEVELS[id] ?? 0);
    return roundCost(def.baseCost * config.upgradeCostGrowth ** bought);
  }

  function isMaxed(id) {
    return upgradeLevel(id) >= config.upgradesById[id].maxLevel;
  }

  function buyUpgrade(id) {
    if (isMaxed(id)) return false;
    const cost = upgradeCost(id);
    if (!ctx.economy.spend(cost)) return false;
    const prevHeat = world.heatRadius();
    state.upgrades[id] = upgradeLevel(id) + 1;
    if (id === 'furnace') world.thawRing(prevHeat);
    events.emit('upgrade.purchased', { id, level: state.upgrades[id], cost });
    return true;
  }

  // --- derived player stats -------------------------------------------------
  function toolMultiplier() {
    const def = config.upgradesById.tool;
    return def.multipliers[Math.min(state.upgrades.tool, def.multipliers.length) - 1];
  }
  function moveSpeed() {
    const research = state.research?.includes('warm_soles') ? 1.1 : 1;
    return config.world.player.speed_tiles * (1 + state.upgrades.boots * 0.1) * research;
  }
  function magnetRadius() {
    return config.world.player.base_magnet + state.upgrades.magnet * 0.5;
  }

  return {
    addXp,
    xpForNextLevel,
    upgradeLevel,
    upgradeCost,
    isMaxed,
    buyUpgrade,
    toolMultiplier,
    moveSpeed,
    magnetRadius,
  };
}
