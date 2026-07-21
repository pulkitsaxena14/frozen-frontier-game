// Bottom-sheet panels: merchant, crafting buildings, furnace upgrades,
// inventory and quest log. Content re-renders while open on relevant events.
export function createPanels(ctx) {
  const { state, events, config, inventory, economy, crafting, progression, audio } = ctx;
  const backdrop = document.getElementById('panel-backdrop');
  const titleEl = document.getElementById('panel-title');
  const bodyEl = document.getElementById('panel-body');
  let active = null; // { type, building }

  function open(type, building = null) {
    active = { type, building };
    backdrop.classList.remove('hidden');
    render();
  }

  function close() {
    active = null;
    backdrop.classList.add('hidden');
  }

  document.getElementById('panel-close').addEventListener('click', () => { audio.play('click'); close(); });
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  events.on('input.escape', close);
  events.on('ui.openBuilding', ({ building }) => { audio.play('click'); open(building.id, building); });
  events.on('ui.openPanel', ({ type }) => open(type));
  events.on('ui.openWorker', ({ slot }) => {
    audio.play('click');
    active = { type: 'worker', slot };
    backdrop.classList.remove('hidden');
    render();
  });
  for (const type of ['inventory.updated', 'coins.changed', 'item.crafted', 'quest.completed']) {
    events.on(type, () => { if (active) render(); });
  }
  // animate craft progress bars while a crafting panel is open
  setInterval(() => {
    if (active && (active.type === 'forge' || active.type === 'kitchen') && state.crafts.length) {
      render();
    }
  }, 300);

  const row = (html) => `<div class="row">${html}</div>`;

  function render() {
    if (!active) return;
    switch (active.type) {
      case 'merchant': renderMerchant(); break;
      case 'forge': renderCrafting('forge', '⚒️ Forge'); break;
      case 'kitchen': renderCrafting('kitchen', '🍳 Kitchen'); break;
      case 'furnace': renderUpgrades(); break;
      case 'research': renderResearch(); break;
      case 'worker': renderWorker(); break;
      case 'inventory': renderInventory(); break;
      case 'quests': renderQuests(); break;
      default: close();
    }
  }

  function bind(selector, fn) {
    bodyEl.querySelectorAll(selector).forEach((btn) => btn.addEventListener('click', fn));
  }

  // --- merchant -------------------------------------------------------------
  function renderMerchant() {
    titleEl.textContent = "🛒 Maple's Stall";
    const demandId = economy.demandItemId();
    const owned = config.items.filter((it) => inventory.count(it.id) > 0);
    const demandItem = config.itemsById[demandId];
    let html = `<div class="row demand"><div class="row-icon">${demandItem.icon}</div>
      <div class="row-main"><div class="row-name">Today's demand: ${demandItem.name}<span class="demand-tag">+25%</span></div>
      <div class="row-sub">Maple pays extra for these right now!</div></div></div>`;
    if (owned.length === 0) {
      html += row(`<div class="row-main"><div class="row-name">Backpack is empty</div>
        <div class="row-sub">Harvest resources, then come back to sell.</div></div>`);
    }
    for (const it of owned) {
      const n = inventory.count(it.id);
      const price = economy.sellPrice(it.id);
      const demand = it.id === demandId;
      html += `<div class="row${demand ? ' demand' : ''}"><div class="row-icon">${it.icon}</div>
        <div class="row-main"><div class="row-name">${it.name} ×${n}</div>
        <div class="row-sub"><span class="coin">🪙${price}</span> each${demand ? '<span class="demand-tag">demand</span>' : ''}</div></div>
        <button class="btn btn-primary" data-sell="${it.id}" data-n="1">Sell 1</button>
        <button class="btn btn-primary" data-sell="${it.id}" data-n="${n}">All</button></div>`;
    }
    bodyEl.innerHTML = html;
    bind('[data-sell]', (e) => {
      economy.sell(e.currentTarget.dataset.sell, Number(e.currentTarget.dataset.n));
    });
  }

  // --- crafting -------------------------------------------------------------
  function renderCrafting(buildingId, title) {
    titleEl.textContent = title;
    let html = '';
    const pending = crafting.pendingFor(buildingId);
    for (const job of pending) {
      const recipe = config.recipesById[job.recipe];
      const out = config.itemsById[recipe.outputs[0].item];
      const pct = Math.max(0, Math.min(100, (1 - job.left / job.total) * 100));
      html += row(`<div class="row-icon">${out.icon}</div>
        <div class="row-main"><div class="row-name">Crafting ${out.name}…</div>
        <div class="quest-progress"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#ffb95e,#ff9d3c);border-radius:99px"></div></div></div>`);
    }
    for (const recipe of crafting.recipesFor(buildingId)) {
      const out = config.itemsById[recipe.outputs[0].item];
      const inputs = recipe.inputs
        .map((i) => `${config.itemsById[i.item].icon}${i.amount > 1 ? '×' + i.amount : ''}${inventory.count(i.item) >= i.amount ? '' : '❌'}`)
        .join(' + ');
      const can = crafting.canCraft(recipe.id);
      html += `<div class="row"><div class="row-icon">${out.icon}</div>
        <div class="row-main"><div class="row-name">${out.name}</div>
        <div class="row-sub">${inputs} → worth <span class="coin">🪙${out.value}</span> · ${recipe.time}s</div></div>
        <button class="btn btn-primary" data-craft="${recipe.id}" ${can ? '' : 'disabled'}>Craft</button></div>`;
    }
    bodyEl.innerHTML = html;
    bind('[data-craft]', (e) => {
      if (crafting.start(e.currentTarget.dataset.craft)) render();
    });
  }

  // --- furnace / upgrades ---------------------------------------------------
  function renderUpgrades() {
    titleEl.textContent = '🔥 Furnace & Upgrades';
    let html = '';
    for (const up of config.upgrades) {
      const level = progression.upgradeLevel(up.id);
      const maxed = progression.isMaxed(up.id);
      const cost = progression.upgradeCost(up.id);
      const name = up.levelNames ? up.levelNames[Math.min(level, up.levelNames.length) - 1] ?? up.name : up.name;
      html += `<div class="row"><div class="row-icon">${up.icon}</div>
        <div class="row-main"><div class="row-name">${name} <span class="row-sub">Lv ${level}</span></div>
        <div class="row-sub">${up.description}</div></div>
        ${maxed
          ? '<span class="demand-tag">MAX</span>'
          : `<button class="btn btn-primary" data-upgrade="${up.id}" ${state.coins >= cost ? '' : 'disabled'}>🪙${cost}</button>`}
      </div>`;
    }
    bodyEl.innerHTML = html;
    bind('[data-upgrade]', (e) => {
      if (progression.buyUpgrade(e.currentTarget.dataset.upgrade)) render();
      else audio.play('error');
    });
  }

  // --- research hut ---------------------------------------------------------
  function renderResearch() {
    titleEl.textContent = '🔬 Research Hut';
    let html = '';
    for (const r of ctx.config.research) {
      const done = ctx.research.has(r.id);
      const mats = (r.materials ?? [])
        .map((m) => {
          const it = config.itemsById[m.item];
          const ok = inventory.count(m.item) >= m.amount;
          return `${it.icon}×${m.amount}${ok ? '' : '❌'}`;
        })
        .join(' ');
      html += `<div class="row"><div class="row-icon">${r.icon}</div>
        <div class="row-main"><div class="row-name">${r.name}</div>
        <div class="row-sub">${r.description}<br><span class="coin">🪙${r.cost}</span> + ${mats}</div></div>
        ${done
          ? '<span class="demand-tag">DONE</span>'
          : `<button class="btn btn-primary" data-research="${r.id}" ${ctx.research.canAfford(r.id) ? '' : 'disabled'}>Study</button>`}
      </div>`;
    }
    bodyEl.innerHTML = html;
    bind('[data-research]', (e) => {
      if (ctx.research.buy(e.currentTarget.dataset.research)) render();
      else audio.play('error');
    });
  }

  // --- worker assignment ----------------------------------------------------
  function renderWorker() {
    const slot = active.slot;
    const job = state.workers[slot] ?? null;
    const pct = Math.round(ctx.villagers.efficiency() * 100);
    titleEl.textContent = `🧑‍🔧 Villager ${slot + 1}`;
    const jobLabel = !job
      ? 'Resting'
      : job.job === 'harvest'
        ? 'Harvesting the camp'
        : job.job === 'sell'
          ? 'Running deliveries to Maple'
          : `Crafting ${config.itemsById[config.recipesById[job.recipe]?.outputs[0].item]?.name ?? '…'}`;
    let html = row(`<div class="row-icon">💤</div>
      <div class="row-main"><div class="row-name">Currently: ${jobLabel}</div>
      <div class="row-sub">Workers run at ${pct}% of your efficiency.</div></div>
      ${job ? '<button class="btn btn-primary" data-job="rest">Rest</button>' : ''}`);
    html += row(`<div class="row-icon">🪓</div>
      <div class="row-main"><div class="row-name">Harvest the camp</div>
      <div class="row-sub">Gathers from any node in the warm area.</div></div>
      <button class="btn btn-primary" data-job="harvest" ${job?.job === 'harvest' ? 'disabled' : ''}>Assign</button>`);
    html += row(`<div class="row-icon">🛒</div>
      <div class="row-main"><div class="row-name">Run deliveries to Maple</div>
      <div class="row-sub">Auto-sells crafted goods — skips ingredients your crafters need.</div></div>
      <button class="btn btn-primary" data-job="sell" ${job?.job === 'sell' ? 'disabled' : ''}>Assign</button>`);
    for (const buildingId of ['kitchen', 'forge']) {
      for (const recipe of crafting.recipesFor(buildingId)) {
        const out = config.itemsById[recipe.outputs[0].item];
        const current = job?.job === 'craft' && job.recipe === recipe.id;
        html += row(`<div class="row-icon">${out.icon}</div>
          <div class="row-main"><div class="row-name">${buildingId === 'kitchen' ? '🍳' : '⚒️'} Keep crafting ${out.name}</div>
          <div class="row-sub">Repeats whenever ingredients are available.</div></div>
          <button class="btn btn-primary" data-job="craft" data-building="${buildingId}" data-recipe="${recipe.id}" ${current ? 'disabled' : ''}>Assign</button>`);
      }
    }
    bodyEl.innerHTML = html;
    bind('[data-job]', (e) => {
      const el = e.currentTarget;
      if (el.dataset.job === 'rest') ctx.villagers.assign(slot, null);
      else if (el.dataset.job === 'harvest') ctx.villagers.assign(slot, { job: 'harvest' });
      else if (el.dataset.job === 'sell') ctx.villagers.assign(slot, { job: 'sell' });
      else ctx.villagers.assign(slot, { job: 'craft', building: el.dataset.building, recipe: el.dataset.recipe });
      audio.play('click');
      render();
    });
  }

  // --- inventory ------------------------------------------------------------
  function renderInventory() {
    titleEl.textContent = `🎒 Backpack · ${inventory.total()}/${inventory.capacity()}`;
    const owned = config.items.filter((it) => inventory.count(it.id) > 0);
    bodyEl.innerHTML = owned.length
      ? owned.map((it) => row(`<div class="row-icon">${it.icon}</div>
          <div class="row-main"><div class="row-name">${it.name} ×${inventory.count(it.id)}</div>
          <div class="row-sub">sells for <span class="coin">🪙${economy.sellPrice(it.id)}</span></div></div>`)).join('')
      : row('<div class="row-main"><div class="row-name">Nothing yet</div><div class="row-sub">Hold Space / E near a resource to harvest it.</div></div>');
  }

  // --- quest log ------------------------------------------------------------
  function renderQuests() {
    titleEl.textContent = '📜 Quests';
    let html = '';
    config.quests.forEach((q, i) => {
      const done = i < state.quest.index;
      const current = i === state.quest.index;
      if (!done && !current && i > state.quest.index + 2) return; // tease only a couple ahead
      const icon = done ? '✅' : current ? '⭐' : '🔒';
      const progress = current ? ` · ${state.quest.progress}/${q.count}` : '';
      html += row(`<div class="row-icon">${icon}</div>
        <div class="row-main"><div class="row-name">${q.title}${progress}</div>
        <div class="row-sub">reward: <span class="coin">🪙${q.rewards.coins}</span> + ${q.rewards.xp} XP</div></div>`);
    });
    bodyEl.innerHTML = html;
  }

  return { open, close };
}
