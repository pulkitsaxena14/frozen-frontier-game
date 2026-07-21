// Shared loot rolling for player harvesting and worker automation.
export function createLootRoller(rand) {
  return function rollDrops(def) {
    const drops = [];
    for (const entry of def.drops) {
      if (rand() * 100 <= entry.weight) {
        const qty = entry.min + Math.floor(rand() * (entry.max - entry.min + 1));
        if (qty > 0) drops.push({ item: entry.item, qty });
      }
    }
    // Loot tables always have a guaranteed (weight 100) entry, but guard anyway.
    if (drops.length === 0 && def.drops.length > 0) {
      drops.push({ item: def.drops[0].item, qty: 1 });
    }
    return drops;
  };
}
