// Research Hut: one-time permanent upgrades bought with coins + materials
// (never time — per BALANCING.md). Effects are read from state.research by
// the systems they modify, so there are no cross-system dependencies.
export function createResearch(ctx) {
  const { state, events, config, inventory, economy } = ctx;

  function has(id) {
    return state.research.includes(id);
  }

  function canAfford(id) {
    const def = config.research.find((r) => r.id === id);
    if (!def || has(id)) return false;
    if (state.coins < def.cost) return false;
    return (def.materials ?? []).every((m) => inventory.count(m.item) >= m.amount);
  }

  function buy(id) {
    const def = config.research.find((r) => r.id === id);
    if (!def || has(id) || !canAfford(id)) return false;
    if (!economy.spend(def.cost)) return false;
    for (const m of def.materials ?? []) inventory.remove(m.item, m.amount);
    state.research.push(id);
    events.emit('research.completed', { id, def });
    return true;
  }

  return { has, canAfford, buy };
}

// Shared helper so systems can check effects without a research instance.
export function hasResearch(state, id) {
  return Array.isArray(state.research) && state.research.includes(id);
}
