// Builds a real config object from the JSON content files (no fetch needed).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readJson(name) {
  return JSON.parse(readFileSync(join(root, 'public', 'config', `${name}.json`), 'utf8'));
}

export function buildConfig() {
  const raw = Object.fromEntries(
    ['items', 'resources', 'recipes', 'biomes', 'upgrades', 'quests', 'economy', 'world', 'research'].map(
      (n) => [n, readJson(n)]
    )
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
  return config;
}
