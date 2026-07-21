// Backpack: stacked item counts with a weight-free capacity (total item count).
import { hasResearch } from './research.js';

export function createInventory(ctx) {
  const { state, events, config } = ctx;

  function capacity() {
    return (
      config.world.player.base_capacity +
      state.upgrades.backpack * 10 +
      (hasResearch(state, 'deep_pockets') ? 20 : 0)
    );
  }

  function total() {
    let sum = 0;
    for (const id in state.inventory) sum += state.inventory[id];
    return sum;
  }

  function count(id) {
    return state.inventory[id] ?? 0;
  }

  // Returns how many were actually added (harvesting respects capacity).
  function add(id, n, { ignoreCapacity = false } = {}) {
    const space = ignoreCapacity ? n : Math.max(0, capacity() - total());
    const added = Math.min(n, space);
    if (added > 0) {
      state.inventory[id] = count(id) + added;
      events.emit('inventory.updated');
    }
    return added;
  }

  function remove(id, n) {
    if (count(id) < n) return false;
    state.inventory[id] -= n;
    if (state.inventory[id] <= 0) delete state.inventory[id];
    events.emit('inventory.updated');
    return true;
  }

  function hasAll(inputs) {
    return inputs.every((i) => count(i.item) >= i.amount);
  }

  function isFull() {
    return total() >= capacity();
  }

  return { capacity, total, count, add, remove, hasAll, isFull };
}
