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

  // What a delivery-runner villager may auto-sell: crafted goods only, minus
  // anything an assigned crafter needs as an ingredient.
  function workerSellables() {
    const reserved = new Set();
    for (const w of Object.values(state.workers ?? {})) {
      if (w?.job !== 'craft') continue;
      for (const input of config.recipesById[w.recipe]?.inputs ?? []) reserved.add(input.item);
    }
    return config.items.filter(
      (it) => it.crafted && !reserved.has(it.id) && inventory.count(it.id) > 0
    );
  }

  return { addCoins, spend, demandItemId, sellPrice, sell, workerSellables };
}
