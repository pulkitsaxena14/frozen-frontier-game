// HUD: coins, level/XP, backpack, quest tracker, contextual hint bubble.
// Reads state; never owns it.
import { dist } from '../utils/math.js';

export function createHud(ctx) {
  const { state, events, config, world, progression, inventory, audio } = ctx;
  const el = {
    hud: document.getElementById('hud'),
    coins: document.getElementById('coin-count'),
    coinPill: document.getElementById('coin-pill'),
    level: document.getElementById('level-num'),
    levelPill: document.getElementById('level-pill'),
    xpFill: document.getElementById('xp-fill'),
    bag: document.getElementById('bag-count'),
    bagPill: document.getElementById('bag-pill'),
    questTitle: document.getElementById('quest-title'),
    questFill: document.getElementById('quest-fill'),
    questTracker: document.getElementById('quest-tracker'),
    hint: document.getElementById('hint-bubble'),
    btnSound: document.getElementById('btn-sound'),
  };
  let shownCoins = 0;
  let hintText = '';
  let hintTimer = 0;

  const bump = (pill) => {
    pill.classList.remove('bump');
    void pill.offsetWidth; // restart animation
    pill.classList.add('bump');
  };

  events.on('coins.changed', () => bump(el.coinPill));
  events.on('inventory.updated', () => bump(el.bagPill));
  events.on('level.up', () => bump(el.levelPill));
  events.on('quest.completed', () => {
    el.questTracker.classList.remove('pop');
    void el.questTracker.offsetWidth;
    el.questTracker.classList.add('pop');
  });

  el.btnSound.addEventListener('click', () => {
    audio.setMuted(!state.settings.muted);
    el.btnSound.textContent = state.settings.muted ? '🔇' : '🔊';
    audio.play('click');
  });
  document.getElementById('btn-bag').addEventListener('click', () => {
    audio.play('click');
    events.emit('ui.openPanel', { type: 'inventory' });
  });
  document.getElementById('btn-quests').addEventListener('click', () => {
    audio.play('click');
    events.emit('ui.openPanel', { type: 'quests' });
  });

  function show() {
    el.hud.classList.remove('hidden');
    el.btnSound.textContent = state.settings.muted ? '🔇' : '🔊';
  }

  function pickHint() {
    const p = state.player;
    // priority: near building > harvestable > frontier nearby
    for (const b of world.buildings) {
      if (dist(p.x, p.y, b.x + 0.5, b.y + 0.5) < 2.4) {
        return `${b.icon} Tap or press F — ${b.name}`;
      }
    }
    for (const v of ctx.villagers.list()) {
      if (!ctx.villagers.jobOf(v) && dist(p.x, p.y, v.x, v.y) < 2) {
        return '🧑 Tap the villager to assign work';
      }
    }
    if (state.player.harvesting) return '';
    const target = ctx.harvest.findTarget();
    if (target) return `✋ Hold Space / E to harvest ${target.def.name}`;
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    for (let y = cy - 2; y <= cy + 2; y++) {
      for (let x = cx - 2; x <= cx + 2; x++) {
        if (world.isFrontier(x, y)) return `❄️ Tap a dashed tile to melt it — 🪙${world.expansionCost()}`;
      }
    }
    return '';
  }

  function update(dt) {
    // count-up animation for coins
    if (shownCoins !== state.coins) {
      const diff = state.coins - shownCoins;
      const step = diff * Math.min(1, dt * 8);
      shownCoins += Math.abs(step) < 1 ? Math.sign(diff) : Math.round(step);
      el.coins.textContent = shownCoins.toLocaleString();
    }
    el.level.textContent = state.level;
    el.xpFill.style.width = `${Math.min(100, (state.xp / progression.xpForNextLevel()) * 100)}%`;
    el.bag.textContent = `${inventory.total()}/${inventory.capacity()}`;

    const quest = config.quests[state.quest.index];
    if (quest) {
      el.questTitle.textContent = `${quest.title} · ${state.quest.progress}/${quest.count}`;
      el.questFill.style.width = `${(state.quest.progress / quest.count) * 100}%`;
    } else {
      el.questTitle.textContent = '🏆 Frontier tamed — keep exploring!';
      el.questFill.style.width = '100%';
    }

    hintTimer -= dt;
    if (hintTimer <= 0) {
      hintTimer = 0.25;
      const next = pickHint();
      if (next !== hintText) {
        hintText = next;
        el.hint.textContent = next;
        el.hint.classList.toggle('hidden', next === '');
      }
    }
  }

  return { show, update };
}
