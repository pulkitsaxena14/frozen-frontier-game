// Deterministic world generation: seed + coordinates always produce the same
// world. Biomes form wobbly rings of increasing tier around the starter camp.
import { hash2D, weightedPick } from '../utils/rng.js';

// Guaranteed starter nodes so the first minute always teaches the loop
// (chop → hunt → pick), regardless of seed.
const STARTER_NODES = [
  { id: 'ice_tree', dx: -3, dy: 2 },
  { id: 'ice_tree', dx: 2, dy: 2 },
  { id: 'stone_rock', dx: -5, dy: -1 },
  { id: 'berry_bush', dx: 5, dy: 1 },
  { id: 'rabbit', dx: -2, dy: 5 },
  { id: 'polar_bear', dx: 5, dy: -4 },
];
const STARTER_RADIUS = 7;

export function createWorldGen(config, seed) {
  const size = config.world.size;
  const center = size / 2;

  const buildingTiles = new Map();
  for (const b of config.world.buildings) {
    buildingTiles.set(`${center + b.dx},${center + b.dy}`, b);
  }
  const starterTiles = new Map();
  for (const n of STARTER_NODES) {
    starterTiles.set(`${center + n.dx},${center + n.dy}`, n.id);
  }

  function biomeAt(x, y) {
    const dx = x - center;
    const dy = y - center;
    const d = Math.hypot(dx, dy);
    // Wobble ring borders so biome edges feel organic, not circular.
    const angle = Math.atan2(dy, dx);
    const wobble =
      Math.sin(angle * 3 + seed % 100) * 2.2 + Math.sin(angle * 7 + seed % 31) * 1.3;
    const wd = d + wobble;
    for (const biome of config.biomes) {
      if (wd <= biome.maxDist) return biome;
    }
    return config.biomes[config.biomes.length - 1];
  }

  // Static content of a tile. Returns null or a resource definition.
  function nodeDefAt(x, y) {
    const key = `${x},${y}`;
    if (buildingTiles.has(key)) return null;

    const dx = x - center;
    const dy = y - center;
    const inStarter = Math.hypot(dx, dy) <= STARTER_RADIUS;
    if (inStarter) {
      const starterId = starterTiles.get(key);
      return starterId ? config.resourcesById[starterId] : null;
    }

    // Keep a breathing ring right outside camp so buildings stay approachable.
    for (const bKey of buildingTiles.keys()) {
      const [bx, by] = bKey.split(',').map(Number);
      if (Math.abs(x - bx) <= 1 && Math.abs(y - by) <= 1) return null;
    }

    const biome = biomeAt(x, y);
    const roll = hash2D(seed, x, y, 1);
    // Clustering: neighbors sharing a coarse cell boost density so resources
    // appear in patches rather than uniform noise.
    const clusterBoost = hash2D(seed, x >> 2, y >> 2, 2) > 0.55 ? 1.9 : 0.55;
    if (roll >= biome.density * clusterBoost) return null;

    const pick = weightedPick(biome.resources, hash2D(seed, x, y, 3));
    return config.resourcesById[pick.id] ?? null;
  }

  function buildingAt(x, y) {
    return buildingTiles.get(`${x},${y}`) ?? null;
  }

  return { size, center, biomeAt, nodeDefAt, buildingAt, buildingTiles };
}
