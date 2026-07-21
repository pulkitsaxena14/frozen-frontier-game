// Procedural art for wildlife nodes. Animals idle-wander with a small
// deterministic offset so the world feels alive without a pathfinding system.
import { circle, ellipse, tri, shadow } from './common.js';

export function wanderOffset(t, ph) {
  return {
    x: Math.sin(t * 0.5 + ph) * 0.18,
    y: Math.cos(t * 0.4 + ph * 1.7) * 0.12,
  };
}

export const creatureSprites = {
  rabbit(g, s, t, ph) {
    const hop = Math.abs(Math.sin(t * 3 + ph)) * 0.06;
    shadow(g, s, 0.18, 0.06, 0.24);
    g.save();
    g.translate(0, -hop * s);
    ellipse(g, 0, 0.08 * s, 0.16 * s, 0.13 * s, '#f4f9ff');
    circle(g, 0.1 * s, -0.04 * s, 0.1 * s, '#f4f9ff');
    // ears
    ellipse(g, 0.06 * s, -0.18 * s, 0.03 * s, 0.09 * s, '#f4f9ff');
    ellipse(g, 0.13 * s, -0.19 * s, 0.03 * s, 0.09 * s, '#f4f9ff');
    ellipse(g, 0.13 * s, -0.18 * s, 0.015 * s, 0.06 * s, '#f7c8d4');
    circle(g, 0.14 * s, -0.05 * s, 0.014 * s, '#1a2433');
    circle(g, -0.13 * s, 0.05 * s, 0.05 * s, '#ffffff');
    g.restore();
  },

  polar_bear(g, s, t, ph) {
    const breathe = Math.sin(t * 1.4 + ph) * 0.015;
    shadow(g, s, 0.34, 0.1, 0.3);
    ellipse(g, 0, (0.05 - breathe) * s, 0.32 * s, (0.22 + breathe) * s, '#f2f6fa');
    circle(g, 0.24 * s, -0.12 * s, 0.15 * s, '#f2f6fa');
    circle(g, 0.18 * s, -0.24 * s, 0.045 * s, '#e3e9f0');
    circle(g, 0.3 * s, -0.24 * s, 0.045 * s, '#e3e9f0');
    circle(g, 0.3 * s, -0.1 * s, 0.02 * s, '#1a2433');
    circle(g, 0.36 * s, -0.06 * s, 0.035 * s, '#c9d4e0');
    circle(g, 0.375 * s, -0.065 * s, 0.016 * s, '#33404f');
    for (const px of [-0.18, -0.02, 0.14]) {
      ellipse(g, px * s, 0.26 * s, 0.07 * s, 0.045 * s, '#e3e9f0');
    }
  },

  seal(g, s, t, ph) {
    const wig = Math.sin(t * 2 + ph) * 0.03;
    shadow(g, s, 0.3, 0.08, 0.26);
    ellipse(g, 0, 0.08 * s, 0.3 * s, 0.16 * s, '#aebfd1');
    circle(g, 0.22 * s, -0.02 * s, 0.12 * s, '#bccbdb');
    tri(g, -0.26 * s, 0.08 * s, (-0.38 - wig) * s, -0.04 * s, (-0.38 + wig) * s, 0.18 * s, '#aebfd1');
    circle(g, 0.26 * s, -0.05 * s, 0.018 * s, '#1a2433');
    circle(g, 0.31 * s, 0.01 * s, 0.025 * s, '#8fa3b8');
    // whisker dots
    circle(g, 0.29 * s, 0.05 * s, 0.008 * s, '#5d6f83');
    circle(g, 0.33 * s, 0.05 * s, 0.008 * s, '#5d6f83');
  },

  wolf(g, s, t, ph) {
    const breathe = Math.sin(t * 1.8 + ph) * 0.012;
    shadow(g, s, 0.3, 0.09, 0.28);
    ellipse(g, 0, (0.04 - breathe) * s, 0.26 * s, 0.17 * s, '#8b97ab');
    circle(g, 0.2 * s, -0.14 * s, 0.12 * s, '#9aa7bb');
    tri(g, 0.13 * s, -0.24 * s, 0.1 * s, -0.36 * s, 0.2 * s, -0.26 * s, '#8b97ab');
    tri(g, 0.24 * s, -0.26 * s, 0.24 * s, -0.38 * s, 0.32 * s, -0.26 * s, '#8b97ab');
    circle(g, 0.26 * s, -0.15 * s, 0.018 * s, '#f5c542');
    ellipse(g, 0.32 * s, -0.08 * s, 0.05 * s, 0.035 * s, '#6d7a8c');
    circle(g, 0.35 * s, -0.09 * s, 0.016 * s, '#1a2433');
    ellipse(g, -0.3 * s, -0.02 * s, 0.12 * s, 0.05 * s, '#9aa7bb'); // tail
    ellipse(g, 0, 0.14 * s, 0.2 * s, 0.08 * s, '#dce4ee'); // belly snow dust
  },

  mammoth(g, s, t, ph) {
    const breathe = Math.sin(t * 1.2 + ph) * 0.02;
    shadow(g, s, 0.42, 0.12, 0.34);
    ellipse(g, 0, (0 - breathe) * s, 0.4 * s, (0.3 + breathe) * s, '#9c6f4e');
    ellipse(g, 0, -0.16 * s, 0.38 * s, 0.18 * s, '#b58a63');
    circle(g, 0.32 * s, -0.14 * s, 0.18 * s, '#9c6f4e');
    // trunk
    g.save();
    g.strokeStyle = '#8a5f42';
    g.lineWidth = 0.09 * s;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0.42 * s, -0.06 * s);
    g.quadraticCurveTo(0.52 * s, 0.14 * s, (0.42 + Math.sin(t + ph) * 0.03) * s, 0.3 * s);
    g.stroke();
    // tusks
    g.strokeStyle = '#f2e9d8';
    g.lineWidth = 0.05 * s;
    g.beginPath();
    g.moveTo(0.34 * s, 0.02 * s);
    g.quadraticCurveTo(0.52 * s, 0.06 * s, 0.56 * s, -0.08 * s);
    g.stroke();
    g.restore();
    circle(g, 0.36 * s, -0.2 * s, 0.022 * s, '#1a2433');
    for (const px of [-0.24, -0.06, 0.12]) {
      ellipse(g, px * s, 0.32 * s, 0.09 * s, 0.06 * s, '#8a5f42');
    }
  },
};
