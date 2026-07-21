// Toast notifications for game events.
export function createFeedback(ctx) {
  const { events } = ctx;
  const stack = document.getElementById('toast-stack');

  function toast(text, { big = false, ttl = 2600 } = {}) {
    const el = document.createElement('div');
    el.className = `toast${big ? ' big' : ''}`;
    el.textContent = text;
    stack.appendChild(el);
    while (stack.children.length > 4) stack.firstChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 380);
    }, ttl);
  }

  events.on('ui.toast', ({ text }) => toast(text));
  events.on('quest.completed', ({ quest }) =>
    toast(`✅ ${quest.title} — +🪙${quest.rewards.coins}`, { big: true, ttl: 3400 }));
  events.on('level.up', ({ level, bonus }) =>
    toast(`⭐ Level ${level}! Bonus 🪙${bonus}`, { big: true, ttl: 3200 }));
  events.on('inventory.full', () => toast('🎒 Backpack full — sell to Maple!'));
  events.on('upgrade.purchased', ({ id, level }) => {
    const up = ctx.config.upgradesById[id];
    const name = up.levelNames ? up.levelNames[Math.min(level, up.levelNames.length) - 1] : up.name;
    toast(`${up.icon} ${name} — level ${level}!`, { big: true });
  });
  events.on('worker.assigned', ({ job }) =>
    toast(job ? '🧑 Villager put to work!' : '💤 Villager is resting'));
  events.on('research.completed', ({ def }) =>
    toast(`${def.icon} Research complete: ${def.name}!`, { big: true, ttl: 3400 }));
  events.on('tile.unlocked', ({ count }) => {
    if (count === 1) toast('❄️ First tile melted! The frontier shrinks.', { big: true });
  });

  return { toast };
}
