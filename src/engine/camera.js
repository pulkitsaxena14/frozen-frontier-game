// Smooth-follow camera with zoom and shake. World units are tiles.
import { clamp, lerp } from '../utils/math.js';

const FOLLOW_RATE = 6; // higher = snappier follow
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;

export function createCamera(worldSize, tilePx) {
  const cam = {
    x: worldSize / 2,
    y: worldSize / 2,
    zoom: 0.85,
    shake: 0,
    viewW: 1,
    viewH: 1,

    resize(w, h) {
      cam.viewW = w;
      cam.viewH = h;
    },

    follow(tx, ty, dt) {
      const t = 1 - Math.exp(-FOLLOW_RATE * dt);
      cam.x = lerp(cam.x, tx, t);
      cam.y = lerp(cam.y, ty, t);
      cam.shake = Math.max(0, cam.shake - dt * 3);
      // one jitter per frame so the whole scene shakes together
      cam.jx = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 12 : 0;
      cam.jy = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 12 : 0;
    },

    zoomBy(factor) {
      cam.zoom = clamp(cam.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    },

    addShake(amount) {
      cam.shake = Math.min(1, cam.shake + amount);
    },

    // tile units → screen pixels
    scale() {
      return tilePx * cam.zoom;
    },
    toScreen(wx, wy) {
      const s = cam.scale();
      return {
        x: (wx - cam.x) * s + cam.viewW / 2 + (cam.jx ?? 0),
        y: (wy - cam.y) * s + cam.viewH / 2 + (cam.jy ?? 0),
      };
    },
    toWorld(sx, sy) {
      const s = cam.scale();
      return {
        x: (sx - cam.viewW / 2) / s + cam.x,
        y: (sy - cam.viewH / 2) / s + cam.y,
      };
    },
    // visible tile bounds (inclusive), padded by one tile
    visibleTiles() {
      const s = cam.scale();
      const halfW = cam.viewW / 2 / s;
      const halfH = cam.viewH / 2 / s;
      return {
        x0: Math.max(0, Math.floor(cam.x - halfW) - 1),
        y0: Math.max(0, Math.floor(cam.y - halfH) - 1),
        x1: Math.min(worldSize - 1, Math.ceil(cam.x + halfW) + 1),
        y1: Math.min(worldSize - 1, Math.ceil(cam.y + halfH) + 1),
      };
    },
  };
  return cam;
}
