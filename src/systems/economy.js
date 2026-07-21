// Coins, selling, and the merchant's rotating demand item.
export function createEconomy(ctx) {
  const { state, events, config, inventory } = ctx;
  const eco = config.economy;
  // Demand rotates deterministically with game time — survives save/load free.
  const sellables = config.items.map((i) => i.id);

  function addCoins(n, { countAsEarned = true } = {}) {
    state.coins += n;
    if (countAsEarned) {
      state.stats.earned += n;
      events.emit('coins.earned', { amount: n });
    }
    events.emit('coins.changed', { coins: state.coins });
  }

  function spend(n) {
    if (state.coins < n) return false;
    state.coins -= n;
    events.emit('coins.changed', { coins: state.coins });
    return true;
  }

  function demandItemId() {
    const idx = Math.floor(state.time / eco.demand_rotate_seconds) % sellables.length;
    return sellables[idx];
  }

  function sellPrice(itemId) {
    const item = config.itemsById[itemId];
    const demand = itemId === demandItemId() ? 1 + eco.demand_bonus : 1;
    const barter = state.research?.includes('barter') ? 1.1 : 1;
    return Math.max(1, Math.floor(item.value * eco.sell_ratio * demand * barter));
  }

  function sell(itemId, n, { worker = false } = {}) {
    const have = inventory.count(itemId);
    const qty = Math.min(have, n);
    if (qty <= 0) return 0;
    inventory.remove(itemId, qty);
    const coins = sellPrice(itemId) * qty;
    addCoins(coins);
    state.stats.sold += qty;
    events.emit('items.sold', { item: itemId, count: qty, coins, worker });
    return coins;
  }

  // Item ids off-limits for workers to auto-sell, full stop: anything an
  // assigned crafter needs as a recipe ingredient — including further
  // upstream, so a crafter making smoked_fish (needs cooked_fish + wood_log)
  // also protects raw_fish, since that's what cooked_fish itself is made
  // from. A hard, unbounded ban is correct here: a crafter can always use
  // more of its ingredients. Upgrades (furnace/tool/etc.) are coins-only so
  // they never reserve anything.
  function reservedInputs() {
    const reserved = new Set();
    const reserveChain = (recipeId, seen = new Set()) => {
      if (seen.has(recipeId)) return; // guard against malformed circular recipes
      seen.add(recipeId);
      for (const input of config.recipesById[recipeId]?.inputs ?? []) {
        reserved.add(input.item);
        const upstream = config.recipes.find((r) => r.outputs.some((o) => o.item === input.item));
        if (upstream) reserveChain(upstream.id, seen);
      }
    };
    for (const w of Object.values(state.workers ?? {})) {
      if (w?.job !== 'craft') continue;
      reserveChain(w.recipe);
    }
    return reserved;
  }

  function isReserved(itemId) {
    return reservedInputs().has(itemId);
  }

  // How much of an item to keep in reserve for not-yet-bought research —
  // summed across every research that still needs it, since research needs
  // are fixed one-time amounts (unlike a crafter's open-ended appetite).
  // Anything beyond this is a genuine surplus, free to sell.
  function researchReserveAmount(itemId) {
    let need = 0;
    for (const r of config.research ?? []) {
      if (state.research?.includes(r.id)) continue; // already bought — no longer needed
      for (const m of r.materials ?? []) if (m.item === itemId) need += m.amount;
    }
    return need;
  }

  // How many of an item a worker may actually sell right now: zero if a
  // crafter needs it (direct or upstream), otherwise whatever's left over
  // after keeping enough for pending research. This must stay bounded
  // rather than a blanket ban — otherwise a backpack that happens to fill
  // with just the handful of item types some research needs (even with zero
  // crafters assigned) leaves a harvester with nothing sellable at all and
  // it sits paused indefinitely instead of just selling the surplus.
  function sellableQty(itemId) {
    if (isReserved(itemId)) return 0;
    return Math.max(0, inventory.count(itemId) - researchReserveAmount(itemId));
  }

  // What a harvester may auto-sell once its backpack is full: raw materials
  // with an actual surplus. Crafted goods are handled separately — a
  // crafter sells its own surplus output.
  function harvesterSellables() {
    return config.items.filter((it) => !it.crafted && sellableQty(it.id) > 0);
  }

  return { addCoins, spend, demandItemId, sellPrice, sell, harvesterSellables, isReserved, sellableQty };
}
