// Linear quest chain driving the early game. Progress advances via events —
// the quest system never polls other systems.
export function createQuests(ctx) {
  const { state, events, config } = ctx;

  function current() {
    return config.quests[state.quest.index] ?? null;
  }

  function bump(n) {
    const quest = current();
    if (!quest) return;
    state.quest.progress = Math.min(quest.count, state.quest.progress + n);
    events.emit('quest.progress', { quest, progress: state.quest.progress });
    if (state.quest.progress >= quest.count) complete(quest);
  }

  function complete(quest) {
    ctx.economy.addCoins(quest.rewards.coins ?? 0, { countAsEarned: false });
    ctx.progression.addXp(quest.rewards.xp ?? 0);
    state.quest.index += 1;
    state.quest.progress = 0;
    events.emit('quest.completed', { quest, next: current() });
  }

  events.on('item.collected', ({ item, count }) => {
    const q = current();
    if (q?.type === 'collect_item' && q.target === item) bump(count);
  });
  events.on('item.crafted', ({ item, count }) => {
    const q = current();
    if (q?.type === 'craft_item' && q.target === item) bump(count);
  });
  events.on('items.sold', ({ count }) => {
    if (current()?.type === 'sell_items') bump(count);
  });
  events.on('tile.unlocked', () => {
    if (current()?.type === 'expand_tiles') bump(1);
  });
  events.on('upgrade.purchased', ({ id }) => {
    const q = current();
    if (q?.type === 'upgrade' && q.target === id) bump(1);
  });
  events.on('coins.earned', ({ amount }) => {
    if (current()?.type === 'earn_coins') bump(amount);
  });
  events.on('research.completed', () => {
    if (current()?.type === 'research') bump(1);
  });
  events.on('worker.assigned', ({ job }) => {
    if (job && current()?.type === 'assign_worker') bump(1);
  });

  return { current };
}
