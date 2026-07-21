// Procedural art for harvestable nature/mineral nodes. Context is translated
// to tile center, 1 unit = s px. `t` is game time, `ph` a per-tile phase.
import { circle, ellipse, rrect, tri, shadow, OUTLINE } from './common.js';

function sway(t, ph, amt = 0.03) {
  return Math.sin(t * 1.6 + ph) * amt;
}

function rock(g, s, colors, bumps) {
  shadow(g, s, 0.34, 0.11);
  for (const [x, y, r, c] of bumps) circle(g, x * s, y * s, r * s, c);
  circle(g, -0.1 * s, -0.02 * s, 0.06 * s, colors.shine);
}

export const nodeSprites = {
  ice_tree(g, s, t, ph) {
    const sw = sway(t, ph);
    shadow(g, s);
    rrect(g, -0.06 * s, -0.05 * s, 0.12 * s, 0.36 * s, 0.04 * s, '#7b5233');
    g.save();
    g.rotate(sw);
    tri(g, 0, -0.78 * s, -0.32 * s, -0.05 * s, 0.32 * s, -0.05 * s, '#bfe8f5');
    tri(g, 0, -0.66 * s, -0.26 * s, -0.18 * s, 0.26 * s, -0.18 * s, '#dff4fc');
    circle(g, -0.1 * s, -0.3 * s, 0.045 * s, '#ffffff');
    circle(g, 0.12 * s, -0.5 * s, 0.035 * s, '#ffffff');
    g.restore();
  },

  pine_tree(g, s, t, ph) {
    const sw = sway(t, ph);
    shadow(g, s);
    rrect(g, -0.06 * s, -0.02 * s, 0.12 * s, 0.34 * s, 0.04 * s, '#6b4327');
    g.save();
    g.rotate(sw);
    tri(g, 0, -0.85 * s, -0.34 * s, -0.02 * s, 0.34 * s, -0.02 * s, '#2f7a4f');
    tri(g, 0, -0.72 * s, -0.27 * s, -0.24 * s, 0.27 * s, -0.24 * s, '#3d9663');
    ellipse(g, -0.08 * s, -0.44 * s, 0.1 * s, 0.05 * s, '#eef7ff');
    ellipse(g, 0.1 * s, -0.62 * s, 0.08 * s, 0.04 * s, '#eef7ff');
    g.restore();
  },

  stone_rock(g, s) {
    rock(g, s, { shine: 'rgba(255,255,255,.5)' }, [
      [0.08, 0.08, 0.2, '#8fa3b8'],
      [-0.12, 0.02, 0.22, '#a7bccf'],
      [0.02, -0.1, 0.18, '#c2d4e4'],
    ]);
  },

  berry_bush(g, s, t, ph) {
    shadow(g, s, 0.3, 0.09);
    const b = sway(t, ph, 0.02);
    circle(g, 0, (0.02 + b) * s, 0.28 * s, '#3e7d52');
    circle(g, -0.16 * s, (-0.04 + b) * s, 0.18 * s, '#4f9563');
    circle(g, 0.15 * s, (-0.02 + b) * s, 0.17 * s, '#4f9563');
    for (const [x, y] of [[-0.12, 0.02], [0.05, -0.12], [0.18, 0.06], [-0.02, 0.12]]) {
      circle(g, x * s, (y + b) * s, 0.05 * s, '#7a86ff');
      circle(g, (x - 0.015) * s, (y - 0.015 + b) * s, 0.015 * s, 'rgba(255,255,255,.8)');
    }
  },

  fish_hole(g, s, t, ph) {
    ellipse(g, 0, 0.06 * s, 0.36 * s, 0.24 * s, '#9fd3ee');
    ellipse(g, 0, 0.06 * s, 0.28 * s, 0.17 * s, '#2e6f9e');
    const bob = Math.sin(t * 2.2 + ph) * 0.03;
    ellipse(g, 0.1 * s, (0.04 + bob) * s, 0.08 * s, 0.03 * s, 'rgba(255,255,255,.35)');
    // bobber
    circle(g, -0.06 * s, (0.02 + bob) * s, 0.045 * s, '#ff6b57');
    circle(g, -0.06 * s, (-0.005 + bob) * s, 0.02 * s, '#ffffff');
  },

  ice_crystal(g, s, t, ph) {
    shadow(g, s, 0.28, 0.09);
    const glow = 0.5 + Math.sin(t * 2 + ph) * 0.2;
    g.save();
    g.globalAlpha = glow * 0.35;
    circle(g, 0, -0.2 * s, 0.42 * s, '#9fe8ff');
    g.restore();
    tri(g, 0, -0.62 * s, -0.16 * s, 0.24 * s, 0.16 * s, 0.24 * s, '#bdefff');
    tri(g, -0.2 * s, -0.3 * s, -0.32 * s, 0.24 * s, -0.06 * s, 0.24 * s, '#8fd8f5');
    tri(g, 0.2 * s, -0.34 * s, 0.34 * s, 0.24 * s, 0.08 * s, 0.24 * s, '#8fd8f5');
    tri(g, 0, -0.5 * s, -0.05 * s, -0.1 * s, 0.06 * s, -0.1 * s, 'rgba(255,255,255,.8)');
  },

  mushroom_patch(g, s, t, ph) {
    shadow(g, s, 0.3, 0.08);
    for (const [x, y, r] of [[-0.14, 0.1, 0.13], [0.12, 0.06, 0.16], [0, -0.06, 0.11]]) {
      rrect(g, (x - 0.035) * s, y * s, 0.07 * s, 0.14 * s, 0.03 * s, '#e8dcc8');
      const wob = Math.sin(t * 2 + ph + x * 9) * 0.01;
      ellipse(g, x * s, (y + wob) * s, r * s, r * 0.72 * s, '#d95f68');
      circle(g, (x - r * 0.35) * s, (y - r * 0.3 + wob) * s, 0.028 * s, '#fff');
      circle(g, (x + r * 0.4) * s, (y - r * 0.15 + wob) * s, 0.02 * s, '#fff');
    }
  },

  iron_vein(g, s) {
    rock(g, s, { shine: 'rgba(255,255,255,.4)' }, [
      [0.06, 0.06, 0.22, '#7d8ba0'],
      [-0.12, 0, 0.2, '#95a6bd'],
    ]);
    for (const [x, y] of [[-0.1, -0.06], [0.1, 0.04], [0, 0.12]]) {
      circle(g, x * s, y * s, 0.055 * s, '#c98d5a');
    }
  },

  coal_vein(g, s) {
    rock(g, s, { shine: 'rgba(255,255,255,.25)' }, [
      [0.06, 0.06, 0.22, '#5a6675'],
      [-0.12, 0, 0.2, '#6d7a8c'],
    ]);
    for (const [x, y] of [[-0.08, -0.04], [0.12, 0.06], [-0.02, 0.12]]) {
      circle(g, x * s, y * s, 0.06 * s, '#242a33');
    }
  },

  gold_vein(g, s, t, ph) {
    rock(g, s, { shine: 'rgba(255,255,255,.4)' }, [
      [0.06, 0.06, 0.22, '#8a97ab'],
      [-0.12, 0, 0.2, '#a3b3c8'],
    ]);
    const tw = 0.6 + Math.sin(t * 3 + ph) * 0.4;
    for (const [x, y] of [[-0.1, -0.02], [0.1, 0.02], [0, 0.13]]) {
      circle(g, x * s, y * s, 0.055 * s, '#f5c542');
      g.save();
      g.globalAlpha = tw;
      circle(g, (x + 0.02) * s, (y - 0.02) * s, 0.018 * s, '#fff6d8');
      g.restore();
    }
  },

  crystal_spire(g, s, t, ph) {
    shadow(g, s, 0.3, 0.1);
    const glow = 0.4 + Math.sin(t * 1.8 + ph) * 0.25;
    g.save();
    g.globalAlpha = glow;
    circle(g, 0, -0.3 * s, 0.5 * s, 'rgba(190,140,255,.4)');
    g.restore();
    tri(g, 0, -0.85 * s, -0.18 * s, 0.26 * s, 0.18 * s, 0.26 * s, '#b98cf2');
    tri(g, -0.24 * s, -0.4 * s, -0.38 * s, 0.26 * s, -0.1 * s, 0.26 * s, '#9a6ad9');
    tri(g, 0.24 * s, -0.45 * s, 0.4 * s, 0.26 * s, 0.1 * s, 0.26 * s, '#9a6ad9');
    tri(g, -0.02 * s, -0.7 * s, -0.07 * s, -0.1 * s, 0.05 * s, -0.1 * s, 'rgba(255,255,255,.75)');
  },

  ruin_cache(g, s) {
    shadow(g, s, 0.34, 0.1);
    rrect(g, -0.3 * s, -0.34 * s, 0.14 * s, 0.6 * s, 0.03 * s, '#b9a8c9');
    rrect(g, 0.18 * s, -0.22 * s, 0.14 * s, 0.48 * s, 0.03 * s, '#a794ba');
    rrect(g, -0.34 * s, -0.42 * s, 0.72 * s, 0.12 * s, 0.03 * s, '#cbbcd9', OUTLINE, 0);
    rrect(g, -0.12 * s, 0.02 * s, 0.26 * s, 0.2 * s, 0.04 * s, '#8a6f4b');
    rrect(g, -0.12 * s, 0.02 * s, 0.26 * s, 0.07 * s, 0.03 * s, '#a98a5f');
    circle(g, 0.01 * s, 0.1 * s, 0.03 * s, '#f5c542');
  },

  magic_ice(g, s, t, ph) {
    shadow(g, s, 0.3, 0.09);
    const p = 0.5 + Math.sin(t * 2.4 + ph) * 0.3;
    g.save();
    g.globalAlpha = 0.3 + p * 0.3;
    circle(g, 0, -0.25 * s, 0.5 * s, '#7fd4ff');
    g.restore();
    const spin = t * 0.6 + ph;
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3;
      circle(g, Math.cos(a) * 0.3 * s, (-0.25 + Math.sin(a) * 0.12) * s, 0.05 * s, '#d8f4ff');
    }
    tri(g, 0, -0.7 * s, -0.2 * s, 0.2 * s, 0.2 * s, 0.2 * s, '#a6e6ff');
    tri(g, 0, -0.55 * s, -0.08 * s, 0.05 * s, 0.08 * s, 0.05 * s, 'rgba(255,255,255,.85)');
  },

  obsidian_flow(g, s, t, ph) {
    rock(g, s, { shine: 'rgba(255,120,60,.5)' }, [
      [0.08, 0.06, 0.22, '#2a2733'],
      [-0.12, 0, 0.21, '#3a3547'],
      [0, -0.1, 0.16, '#241f2e'],
    ]);
    const p = 0.5 + Math.sin(t * 2.6 + ph) * 0.5;
    g.save();
    g.globalAlpha = 0.4 + p * 0.5;
    g.strokeStyle = '#ff7b3d';
    g.lineWidth = 0.03 * s;
    g.beginPath();
    g.moveTo(-0.18 * s, 0.12 * s);
    g.lineTo(-0.04 * s, -0.02 * s);
    g.lineTo(0.1 * s, 0.1 * s);
    g.stroke();
    g.restore();
  },

  fire_crystal(g, s, t, ph) {
    shadow(g, s, 0.3, 0.1);
    const p = 0.5 + Math.sin(t * 3 + ph) * 0.4;
    g.save();
    g.globalAlpha = 0.25 + p * 0.35;
    circle(g, 0, -0.3 * s, 0.55 * s, 'rgba(255,140,60,.55)');
    g.restore();
    tri(g, 0, -0.8 * s, -0.2 * s, 0.24 * s, 0.2 * s, 0.24 * s, '#ff9d5c');
    tri(g, -0.24 * s, -0.35 * s, -0.36 * s, 0.24 * s, -0.1 * s, 0.24 * s, '#e0662e');
    tri(g, 0.26 * s, -0.4 * s, 0.38 * s, 0.24 * s, 0.12 * s, 0.24 * s, '#e0662e');
    tri(g, 0, -0.62 * s, -0.06 * s, -0.05 * s, 0.06 * s, -0.05 * s, '#ffe3b0');
  },
};

// Depleted node remnant — a soft mound so the tile doesn't feel empty.
export function drawRemnant(g, s) {
  ellipse(g, 0, 0.16 * s, 0.24 * s, 0.1 * s, 'rgba(255,255,255,0.55)');
  ellipse(g, 0.1 * s, 0.2 * s, 0.12 * s, 0.06 * s, 'rgba(255,255,255,0.4)');
}
