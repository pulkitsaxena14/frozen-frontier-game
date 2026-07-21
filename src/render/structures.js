// Buildings and the player. Buildings render slightly larger than one tile —
// they're landmarks. Furnace visuals scale with its upgrade level.
import { circle, ellipse, rrect, tri, shadow } from './common.js';

function flame(g, s, t, size, x = 0, y = 0) {
  const f1 = Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
  const f2 = Math.cos(t * 11) * 0.04;
  g.save();
  g.translate(x * s, y * s);
  tri(g, f1 * s, -size * 1.5 * s, -size * 0.8 * s, 0, size * 0.8 * s, 0, '#ff8c3b');
  tri(g, f2 * s, -size * 1.05 * s, -size * 0.5 * s, 0, size * 0.5 * s, 0, '#ffb95e');
  tri(g, 0, -size * 0.6 * s, -size * 0.26 * s, 0, size * 0.26 * s, 0, '#ffe8b0');
  g.restore();
}

function smoke(g, s, t, x, y) {
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.35 + i * 0.33) % 1;
    g.save();
    g.globalAlpha = (1 - p) * 0.35;
    circle(g, (x + Math.sin(p * 5 + i) * 0.06) * s, (y - p * 0.7) * s, (0.06 + p * 0.09) * s, '#dfe8f2');
    g.restore();
  }
}

function hut(g, s, wall, roof) {
  shadow(g, s, 0.5, 0.14, 0.42);
  rrect(g, -0.42 * s, -0.28 * s, 0.84 * s, 0.66 * s, 0.06 * s, wall);
  tri(g, 0, -0.75 * s, -0.52 * s, -0.22 * s, 0.52 * s, -0.22 * s, roof);
  ellipse(g, -0.2 * s, -0.42 * s, 0.14 * s, 0.06 * s, '#eef7ff'); // snow on roof
}

export const structureSprites = {
  furnace(g, s, t, ph, level = 1) {
    const glow = 0.5 + Math.sin(t * 6) * 0.1 + level * 0.05;
    g.save();
    g.globalAlpha = Math.min(0.55, glow * 0.4);
    circle(g, 0, -0.1 * s, (0.7 + level * 0.08) * s, '#ff9d3c');
    g.restore();

    shadow(g, s, 0.48, 0.14, 0.4);
    // stone bowl, grows chunkier with level
    const w = 0.38 + Math.min(level, 6) * 0.015;
    circle(g, -w * s, 0.18 * s, 0.16 * s, '#8fa3b8');
    circle(g, w * s, 0.18 * s, 0.16 * s, '#8fa3b8');
    circle(g, -w * 0.55 * s, 0.26 * s, 0.17 * s, '#a7bccf');
    circle(g, w * 0.55 * s, 0.26 * s, 0.17 * s, '#a7bccf');
    circle(g, 0, 0.3 * s, 0.18 * s, '#93a8bd');
    // logs
    rrect(g, -0.22 * s, 0.02 * s, 0.44 * s, 0.09 * s, 0.04 * s, '#6b4327');
    rrect(g, -0.16 * s, -0.05 * s, 0.36 * s, 0.09 * s, 0.04 * s, '#7b5233');
    flame(g, s, t, 0.28 + Math.min(level, 8) * 0.03, 0, 0.02);
    if (level >= 3) {
      rrect(g, 0.3 * s, -0.6 * s, 0.14 * s, 0.4 * s, 0.03 * s, '#7d8ba0'); // chimney
      smoke(g, s, t, 0.37, -0.62);
    }
    if (level >= 6) {
      const a = t * 1.2;
      for (let i = 0; i < 3; i++) {
        const ang = a + (i * Math.PI * 2) / 3;
        circle(g, Math.cos(ang) * 0.5 * s, (-0.25 + Math.sin(ang) * 0.2) * s, 0.035 * s, '#9fe8ff');
      }
    }
  },

  forge(g, s, t) {
    hut(g, s, '#7d6754', '#5d6f83');
    rrect(g, -0.16 * s, 0.05 * s, 0.32 * s, 0.2 * s, 0.04 * s, '#3d4654'); // door
    // anvil
    rrect(g, 0.16 * s, 0.16 * s, 0.2 * s, 0.07 * s, 0.02 * s, '#4a5568');
    rrect(g, 0.22 * s, 0.22 * s, 0.08 * s, 0.1 * s, 0.02 * s, '#3d4654');
    const spark = (t * 2) % 1;
    if (spark < 0.15) circle(g, 0.26 * s, 0.12 * s, 0.03 * s, '#ffd24a');
    smoke(g, s, t, 0.3, -0.6);
    rrect(g, 0.24 * s, -0.62 * s, 0.12 * s, 0.36 * s, 0.03 * s, '#6d5442');
    circle(g, -0.02 * s, -0.42 * s, 0.09 * s, '#ffb95e'); // warm window
  },

  kitchen(g, s, t) {
    hut(g, s, '#a3805c', '#c96b4e');
    rrect(g, -0.34 * s, 0.02 * s, 0.24 * s, 0.23 * s, 0.04 * s, '#6d4a33'); // door
    // pot over fire
    ellipse(g, 0.2 * s, 0.24 * s, 0.14 * s, 0.09 * s, '#4a5568');
    flame(g, s, t, 0.1, 0.2, 0.33);
    const bub = Math.sin(t * 4) * 0.01;
    ellipse(g, 0.2 * s, (0.17 + bub) * s, 0.1 * s, 0.03 * s, '#9fd3a0');
    smoke(g, s, t, -0.15, -0.65);
    rrect(g, -0.22 * s, -0.66 * s, 0.13 * s, 0.4 * s, 0.03 * s, '#8a6a4d');
  },

  research(g, s, t, ph) {
    hut(g, s, '#8a7ba8', '#4a5f8a');
    rrect(g, -0.12 * s, 0.08 * s, 0.24 * s, 0.22 * s, 0.04 * s, '#3d4654'); // door
    // bubbling flask on a side table
    rrect(g, 0.2 * s, 0.2 * s, 0.22 * s, 0.09 * s, 0.02 * s, '#6d5442');
    tri(g, 0.31 * s, 0.02 * s, 0.24 * s, 0.2 * s, 0.38 * s, 0.2 * s, '#8fd8f5');
    rrect(g, 0.29 * s, -0.04 * s, 0.04 * s, 0.08 * s, 0.01 * s, '#8fd8f5');
    const p = (t * 0.8 + ph) % 1;
    circle(g, 0.31 * s, (0 - p * 0.25) * s, 0.02 * s * (1 - p), '#d8f4ff');
    // telescope poking from the roof
    g.save();
    g.translate(-0.16 * s, -0.62 * s);
    g.rotate(-0.5 + Math.sin(t * 0.4 + ph) * 0.08);
    rrect(g, 0, -0.03 * s, 0.26 * s, 0.06 * s, 0.03 * s, '#5d6f83');
    g.restore();
    circle(g, 0.12 * s, -0.44 * s, 0.07 * s, '#ffd24a'); // lit round window
  },

  merchant(g, s, t, ph) {
    shadow(g, s, 0.52, 0.14, 0.44);
    // stall counter + posts
    rrect(g, -0.44 * s, 0.06 * s, 0.88 * s, 0.28 * s, 0.05 * s, '#8a6a4d');
    rrect(g, -0.44 * s, 0.02 * s, 0.88 * s, 0.08 * s, 0.03 * s, '#a3805c');
    rrect(g, -0.44 * s, -0.5 * s, 0.06 * s, 0.6 * s, 0.02 * s, '#6d5442');
    rrect(g, 0.38 * s, -0.5 * s, 0.06 * s, 0.6 * s, 0.02 * s, '#6d5442');
    // striped awning
    const bounce = Math.sin(t * 1.3 + ph) * 0.008;
    for (let i = 0; i < 6; i++) {
      const x0 = -0.5 + i * (1 / 6);
      tri(g, (x0 + 1 / 12) * s, (-0.38 + bounce) * s, x0 * s, -0.58 * s, (x0 + 1 / 6) * s, -0.58 * s,
        i % 2 ? '#e8574f' : '#f4efe6');
    }
    rrect(g, -0.5 * s, -0.6 * s, 1.0 * s, 0.06 * s, 0.02 * s, '#c9463e');
    // goods crates
    rrect(g, -0.34 * s, -0.08 * s, 0.2 * s, 0.14 * s, 0.02 * s, '#b58a63');
    circle(g, -0.28 * s, -0.1 * s, 0.05 * s, '#7a86ff');
    circle(g, -0.19 * s, -0.11 * s, 0.05 * s, '#9fd3a0');
    // Maple the merchant
    const bob = Math.sin(t * 2 + ph) * 0.015;
    circle(g, 0.14 * s, (-0.16 + bob) * s, 0.11 * s, '#f2c9a0'); // face
    ellipse(g, 0.14 * s, (-0.26 + bob) * s, 0.13 * s, 0.07 * s, '#c9463e'); // hat
    circle(g, 0.14 * s, (-0.31 + bob) * s, 0.035 * s, '#f4efe6');
    circle(g, 0.1 * s, (-0.16 + bob) * s, 0.013 * s, '#1a2433');
    circle(g, 0.18 * s, (-0.16 + bob) * s, 0.013 * s, '#1a2433');
    g.beginPath();
    g.strokeStyle = '#1a2433';
    g.lineWidth = 0.012 * s;
    g.arc(0.14 * s, (-0.13 + bob) * s, 0.03 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  },
};

// --- villagers: little hooded settlers who wander the thawed camp ----------
const VILLAGER_COLORS = ['#c96b4e', '#7a86ff', '#9fd3a0', '#e8b04f', '#b98cf2', '#e8574f'];

export function drawVillager(g, s, t, v) {
  const color = VILLAGER_COLORS[v.variant % VILLAGER_COLORS.length];
  const bob = v.moving ? Math.abs(Math.sin(t * 8 + v.ph)) * 0.04 : Math.sin(t * 2 + v.ph) * 0.012;
  shadow(g, s, 0.14, 0.05, 0.26);
  g.save();
  g.translate(0, -bob * s);
  ellipse(g, -0.05 * s, 0.24 * s, 0.04 * s, 0.03 * s, '#4a3a30');
  ellipse(g, 0.05 * s, 0.24 * s, 0.04 * s, 0.03 * s, '#4a3a30');
  rrect(g, -0.12 * s, -0.08 * s, 0.24 * s, 0.32 * s, 0.1 * s, color);
  circle(g, 0, -0.2 * s, 0.11 * s, '#f2c9a0');
  g.beginPath();
  g.arc(0, -0.22 * s, 0.125 * s, Math.PI * 0.95, Math.PI * 2.05);
  g.fillStyle = color;
  g.fill();
  circle(g, 0.035 * s, -0.19 * s, 0.012 * s, '#1a2433');
  circle(g, 0.075 * s, -0.19 * s, 0.012 * s, '#1a2433');
  g.restore();
}

// --- player: a kid in a teal parka with an ember-orange scarf --------------
export function drawPlayer(g, s, t, player, harvesting) {
  const bob = player.moving ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 2) * 0.015;
  const dir = player.facing;
  shadow(g, s, 0.2, 0.07, 0.3);
  g.save();
  g.translate(0, -bob * s);
  g.scale(dir, 1);

  // feet
  if (player.moving) {
    const step = Math.sin(t * 12);
    ellipse(g, -0.07 * s + step * 0.04 * s, 0.28 * s, 0.055 * s, 0.035 * s, '#5d4a3a');
    ellipse(g, 0.07 * s - step * 0.04 * s, 0.28 * s, 0.055 * s, 0.035 * s, '#5d4a3a');
  } else {
    ellipse(g, -0.07 * s, 0.28 * s, 0.055 * s, 0.035 * s, '#5d4a3a');
    ellipse(g, 0.07 * s, 0.28 * s, 0.055 * s, 0.035 * s, '#5d4a3a');
  }

  // body (parka)
  rrect(g, -0.16 * s, -0.12 * s, 0.32 * s, 0.4 * s, 0.14 * s, '#3f8f8a');
  rrect(g, -0.05 * s, -0.1 * s, 0.1 * s, 0.36 * s, 0.05 * s, '#357a76'); // zip
  // scarf
  rrect(g, -0.14 * s, -0.14 * s, 0.28 * s, 0.09 * s, 0.045 * s, '#ff9d3c');
  const flap = Math.sin(t * (player.moving ? 10 : 2)) * 0.02;
  rrect(g, -0.2 * s, (-0.1 + flap) * s, 0.09 * s, 0.16 * s, 0.04 * s, '#ff9d3c');

  // head + hood
  circle(g, 0, -0.3 * s, 0.155 * s, '#f2c9a0');
  g.beginPath();
  g.arc(0, -0.32 * s, 0.17 * s, Math.PI * 0.95, Math.PI * 2.05);
  g.fillStyle = '#3f8f8a';
  g.fill();
  circle(g, 0, -0.44 * s, 0.05 * s, '#f4efe6'); // pompom
  // face
  circle(g, 0.05 * s, -0.29 * s, 0.016 * s, '#1a2433');
  circle(g, 0.11 * s, -0.29 * s, 0.016 * s, '#1a2433');
  circle(g, 0.03 * s, -0.24 * s, 0.025 * s, 'rgba(240,130,120,.5)');

  // tool arm
  if (harvesting) {
    const swing = Math.sin(t * 14) * 0.9;
    g.save();
    g.translate(0.14 * s, -0.05 * s);
    g.rotate(-0.6 + swing * 0.55);
    rrect(g, -0.02 * s, -0.3 * s, 0.045 * s, 0.32 * s, 0.02 * s, '#8a6a4d');
    rrect(g, -0.09 * s, -0.34 * s, 0.16 * s, 0.09 * s, 0.03 * s, '#aebfd1');
    g.restore();
  } else {
    ellipse(g, 0.16 * s, 0.06 * s, 0.05 * s, 0.09 * s, '#357a76');
  }
  g.restore();
}
