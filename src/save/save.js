// Versioned localStorage saves. Save files are untrusted input: parse
// defensively and merge onto defaults so missing fields never crash the game.
const SAVE_KEY = 'frozen_frontier_save';
const SAVE_VERSION = 1;
const AUTOSAVE_SECONDS = 15;

export function defaultState(seed, spawnX, spawnY) {
  return {
    version: SAVE_VERSION,
    seed,
    time: 0,
    coins: 0,
    xp: 0,
    level: 1,
    inventory: {},
    upgrades: { furnace: 1, tool: 1, boots: 0, backpack: 0, magnet: 0 },
    purchasedTiles: [],
    nodes: {},
    crafts: [],
    quest: { index: 0, progress: 0 },
    research: [],
    workers: {},
    stats: { earned: 0, sold: 0, collected: 0, crafted: 0 },
    player: { x: spawnX, y: spawnY, facing: 1, moving: false, harvesting: null },
    settings: { muted: false },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (data.version !== SAVE_VERSION) return migrate(data);
    // Merge onto defaults: additions to the schema never break old saves.
    const base = defaultState(data.seed ?? 1, data.player?.x ?? 64, data.player?.y ?? 64);
    return deepMerge(base, data);
  } catch (err) {
    console.error('[save] failed to load, starting fresh', err);
    return null;
  }
}

function migrate(data) {
  // No older versions exist yet; future schema bumps add steps here.
  console.warn(`[save] unknown save version ${data?.version}, ignoring`);
  return null;
}

function deepMerge(base, over) {
  for (const key in over) {
    const v = over[key];
    if (v && typeof v === 'object' && !Array.isArray(v) && typeof base[key] === 'object' && base[key] !== null && !Array.isArray(base[key])) {
      deepMerge(base[key], v);
    } else if (v !== undefined) {
      base[key] = v;
    }
  }
  return base;
}

export function writeSave(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('[save] write failed', err);
    return false;
  }
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave() {
  return localStorage.getItem(SAVE_KEY) !== null;
}

// Autosave every 15s plus on meaningful events (per GAME_DESIGN.md).
export function attachAutosave(ctx) {
  const { state, events } = ctx;
  let timer = 0;
  let enabled = true;
  const save = () => { if (enabled) writeSave(state); };

  for (const type of ['upgrade.purchased', 'tile.unlocked', 'quest.completed']) {
    events.on(type, save);
  }
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });

  return {
    update(dt) {
      timer += dt;
      if (timer >= AUTOSAVE_SECONDS) {
        timer = 0;
        save();
        events.emit('save.completed');
      }
    },
    // Called right before an intentional clearSave()+reload so the
    // beforeunload/visibilitychange handlers above don't resurrect the
    // save we're about to discard.
    disable() { enabled = false; },
  };
}
