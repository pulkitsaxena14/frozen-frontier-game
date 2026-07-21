// Deterministic hashing — world generation must be reproducible from seed alone.
// 2D integer hash → [0, 1). Same seed + coordinates always yield the same value.
export function hash2D(seed, x, y, salt = 0) {
  let h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (salt * 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Mutable PRNG for non-worldgen randomness (loot rolls, particles).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick an entry from [{weight, ...}] using a 0..1 roll.
export function weightedPick(entries, roll) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = roll * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}
