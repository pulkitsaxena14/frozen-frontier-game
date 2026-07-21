// Loads and validates all JSON content. The game is data-driven: content
// problems should fail loudly here, before any system runs.
const FILES = ['items', 'resources', 'recipes', 'biomes', 'upgrades', 'quests', 'economy', 'world', 'research'];

export async function loadConfig() {
  const raw = {};
  await Promise.all(
    FILES.map(async (name) => {
      const res = await fetch(`${import.meta.env.BASE_URL}config/${name}.json`);
      if (!res.ok) throw new Error(`[config] failed to load ${name}.json (${res.status})`);
      raw[name] = await res.json();
    })
  );

  const config = {
    items: raw.items.items,
    resources: raw.resources.resources,
    recipes: raw.recipes.recipes,
    biomes: raw.biomes.biomes,
    upgrades: raw.upgrades.upgrades,
    upgradeCostGrowth: raw.upgrades.costGrowth,
    quests: raw.quests.quests,
    research: raw.research.research,
    economy: raw.economy,
    world: raw.world,
    itemsById: {},
    resourcesById: {},
    recipesById: {},
    upgradesById: {},
  };

  for (const it of config.items) config.itemsById[it.id] = it;
  for (const r of config.resources) config.resourcesById[r.id] = r;
  for (const r of config.recipes) config.recipesById[r.id] = r;
  for (const u of config.upgrades) config.upgradesById[u.id] = u;

  validate(config);
  return config;
}

export function validate(config) {
  const errors = [];
  const seen = new Set();
  const dupCheck = (list, kind) => {
    for (const e of list) {
      const key = `${kind}:${e.id}`;
      if (seen.has(key)) errors.push(`duplicate ${kind} id "${e.id}"`);
      seen.add(key);
    }
  };
  dupCheck(config.items, 'item');
  dupCheck(config.resources, 'resource');
  dupCheck(config.recipes, 'recipe');
  dupCheck(config.biomes, 'biome');
  dupCheck(config.quests, 'quest');
  dupCheck(config.research, 'research');

  for (const r of config.research) {
    for (const m of r.materials ?? []) {
      if (!config.itemsById[m.item]) errors.push(`research "${r.id}" needs unknown item "${m.item}"`);
    }
  }

  for (const r of config.resources) {
    for (const d of r.drops) {
      if (!config.itemsById[d.item]) errors.push(`resource "${r.id}" drops unknown item "${d.item}"`);
    }
  }
  for (const rc of config.recipes) {
    for (const io of [...rc.inputs, ...rc.outputs]) {
      if (!config.itemsById[io.item]) errors.push(`recipe "${rc.id}" references unknown item "${io.item}"`);
    }
  }
  for (const b of config.biomes) {
    for (const r of b.resources) {
      if (!config.resourcesById[r.id]) errors.push(`biome "${b.id}" references unknown resource "${r.id}"`);
    }
  }
  for (const q of config.quests) {
    if ((q.type === 'collect_item' || q.type === 'craft_item') && !config.itemsById[q.target]) {
      errors.push(`quest "${q.id}" targets unknown item "${q.target}"`);
    }
    if (q.type === 'upgrade' && !config.upgradesById[q.target]) {
      errors.push(`quest "${q.id}" targets unknown upgrade "${q.target}"`);
    }
  }

  if (errors.length) {
    throw new Error(`[config] validation failed:\n- ${errors.join('\n- ')}`);
  }
}
