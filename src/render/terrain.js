// Terrain rendering with per-chunk offscreen caches. Chunks re-render only
// when a tile inside them thaws; everything else is a cheap drawImage.
import { hash2D } from '../utils/rng.js';

const CACHE_PX = 32; // px per tile inside a chunk cache
const MAX_CACHED = 48; // LRU cap ≈ 48MB worst case; plenty for any viewport

export function createTerrain(config, gen, world, seed) {
  const chunkSize = config.world.chunk;
  const cache = new Map(); // "cx,cy" → canvas

  function chunkOf(x, y) {
    return `${Math.floor(x / chunkSize)},${Math.floor(y / chunkSize)}`;
  }

  function invalidateTile(x, y) {
    cache.delete(chunkOf(x, y));
    // border tiles affect neighbor edge highlights
    cache.delete(chunkOf(x - 1, y));
    cache.delete(chunkOf(x + 1, y));
    cache.delete(chunkOf(x, y - 1));
    cache.delete(chunkOf(x, y + 1));
  }

  function invalidateAll() {
    cache.clear();
  }

  function drawTile(g, x, y) {
    const px = (x % chunkSize + chunkSize) % chunkSize * CACHE_PX;
    const py = (y % chunkSize + chunkSize) % chunkSize * CACHE_PX;
    const biome = gen.biomeAt(x, y);
    const thawed = world.isThawed(x, y);
    g.fillStyle = thawed ? biome.ground.thawed : biome.ground.frozen;
    g.fillRect(px, py, CACHE_PX, CACHE_PX);

    const h = hash2D(seed, x, y, 11);
    if (thawed) {
      // mottled ground + grass tufts
      g.fillStyle = 'rgba(255,255,255,0.07)';
      if (h > 0.5) g.fillRect(px + CACHE_PX * 0.1, py + CACHE_PX * 0.55, CACHE_PX * 0.5, CACHE_PX * 0.3);
      g.fillStyle = 'rgba(20,60,30,0.18)';
      const n = Math.floor(h * 4);
      for (let i = 0; i < n; i++) {
        const gx = px + hash2D(seed, x, y, 20 + i) * CACHE_PX;
        const gy = py + hash2D(seed, x, y, 30 + i) * CACHE_PX;
        g.fillRect(gx, gy, 2, 4);
      }
      // snow-drift rim on edges facing frozen tiles
      g.fillStyle = 'rgba(255,255,255,0.5)';
      const rim = CACHE_PX * 0.14;
      if (!world.isThawed(x, y - 1)) g.fillRect(px, py, CACHE_PX, rim);
      if (!world.isThawed(x, y + 1)) g.fillRect(px, py + CACHE_PX - rim, CACHE_PX, rim);
      if (!world.isThawed(x - 1, y)) g.fillRect(px, py, rim, CACHE_PX);
      if (!world.isThawed(x + 1, y)) g.fillRect(px + CACHE_PX - rim, py, rim, CACHE_PX);
    } else {
      // frost texture: sparkles and faint cracks
      g.fillStyle = 'rgba(255,255,255,0.55)';
      if (h > 0.6) {
        g.fillRect(px + h * CACHE_PX * 0.7, py + hash2D(seed, x, y, 12) * CACHE_PX * 0.7, 2, 2);
      }
      g.fillStyle = 'rgba(120,160,200,0.12)';
      if (h < 0.18) {
        g.fillRect(px + 4, py + CACHE_PX * h * 3, CACHE_PX - 8, 2);
      }
      // subtle tile seam so the grid reads without being loud
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(px, py, CACHE_PX, 1);
      g.fillRect(px, py, 1, CACHE_PX);
    }
  }

  function renderChunk(cx, cy) {
    const canvas = document.createElement('canvas');
    canvas.width = chunkSize * CACHE_PX;
    canvas.height = chunkSize * CACHE_PX;
    const g = canvas.getContext('2d');
    for (let ty = 0; ty < chunkSize; ty++) {
      for (let tx = 0; tx < chunkSize; tx++) {
        drawTile(g, cx * chunkSize + tx, cy * chunkSize + ty);
      }
    }
    return canvas;
  }

  function draw(g, camera) {
    const view = camera.visibleTiles();
    const s = camera.scale();
    const c0x = Math.floor(view.x0 / chunkSize);
    const c0y = Math.floor(view.y0 / chunkSize);
    const c1x = Math.floor(view.x1 / chunkSize);
    const c1y = Math.floor(view.y1 / chunkSize);
    for (let cy = c0y; cy <= c1y; cy++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const key = `${cx},${cy}`;
        let canvas = cache.get(key);
        if (!canvas) {
          canvas = renderChunk(cx, cy);
          cache.set(key, canvas);
          if (cache.size > MAX_CACHED) {
            cache.delete(cache.keys().next().value); // oldest-inserted
          }
        } else {
          // refresh LRU position
          cache.delete(key);
          cache.set(key, canvas);
        }
        const p = camera.toScreen(cx * chunkSize, cy * chunkSize);
        g.drawImage(canvas, p.x, p.y, chunkSize * s + 0.5, chunkSize * s + 0.5);
      }
    }
  }

  return { draw, invalidateTile, invalidateAll };
}
