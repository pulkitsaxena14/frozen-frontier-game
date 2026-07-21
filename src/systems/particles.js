// Pooled particles: world-space bursts/float-text, screen-space snow, coin
// flights and confetti. Purely cosmetic — never touches game state.
const MAX_PARTICLES = 600;
const SNOW_COUNT = 70;

const CATEGORY_COLORS = {
  material: '#c9a071', food: '#ff9d9d', ore: '#aebfd1',
  fuel: '#6d7a8c', magic: '#c39df5',
};

export function createParticles(ctx) {
  const { events, config, state } = ctx;
  const world = []; // {wx, wy, vx, vy, ttl, life, size, color, text, gravity}
  const screen = []; // {sx, sy, vx, vy, ttl, life, size, color, mode}
  const snow = [];
  let viewW = 1;
  let viewH = 1;

  function spawnWorld(p) {
    if (world.length < MAX_PARTICLES) world.push(p);
  }
  function spawnScreen(p) {
    if (screen.length < MAX_PARTICLES) screen.push(p);
  }

  function burst(wx, wy, color, n = 8, speed = 2.2) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      spawnWorld({
        wx, wy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.2,
        ttl: 0.7, life: 0.7, size: 0.05 + Math.random() * 0.05,
        color, gravity: 6,
      });
    }
  }

  function floatText(wx, wy, text, color = '#ffffff') {
    spawnWorld({ wx, wy, vx: 0, vy: -1.1, ttl: 1.1, life: 1.1, size: 0.34, color, text, gravity: 0 });
  }

  function coinFly(n = 5) {
    const pill = document.getElementById('coin-pill')?.getBoundingClientRect();
    const tx = pill ? pill.left + pill.width / 2 : 60;
    const ty = pill ? pill.top + pill.height / 2 : 30;
    for (let i = 0; i < Math.min(n, 12); i++) {
      spawnScreen({
        sx: viewW / 2 + (Math.random() - 0.5) * 120,
        sy: viewH * 0.6 + (Math.random() - 0.5) * 60,
        tx, ty, delay: i * 0.05, p: 0, mode: 'coin', ttl: 1, life: 1,
      });
    }
  }

  function confetti(n = 26) {
    const colors = ['#ff9d3c', '#7ee08a', '#7a86ff', '#ffd24a', '#bfe3ff'];
    for (let i = 0; i < n; i++) {
      spawnScreen({
        sx: viewW / 2, sy: viewH * 0.35,
        vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 380 - 60,
        ttl: 1.6, life: 1.6, size: 5 + Math.random() * 5,
        color: colors[i % colors.length], mode: 'confetti', spin: Math.random() * 6,
      });
    }
  }

  // --- event wiring ---------------------------------------------------------
  events.on('node.hit', ({ x, y, def, drops, crit }) => {
    const cat = config.itemsById[def.drops[0]?.item]?.category;
    burst(x + 0.5, y + 0.35, CATEGORY_COLORS[cat] ?? '#dfe8f2', crit ? 14 : 6);
    let dy = 0;
    if (crit) {
      floatText(x + 0.5, y - 0.55, '✨ CRIT', '#ffd24a');
      dy += 0.34;
    }
    for (const d of drops) {
      const item = config.itemsById[d.item];
      floatText(x + 0.5, y - 0.2 - dy, `+${d.qty} ${item.icon}`, '#eef7ff');
      dy += 0.34;
    }
  });
  events.on('research.completed', () => confetti(24));
  events.on('node.depleted', ({ x, y }) => burst(x + 0.5, y + 0.3, '#ffffff', 14, 3));
  events.on('tile.unlocked', ({ x, y }) => burst(x + 0.5, y + 0.5, '#9fe8ff', 12, 2.6));
  events.on('items.sold', ({ coins, worker }) => {
    if (!worker) coinFly(Math.min(10, 3 + Math.floor(coins / 20)));
  });
  events.on('level.up', () => confetti(34));
  events.on('quest.completed', () => confetti(22));
  events.on('upgrade.purchased', ({ id }) => {
    if (id === 'furnace') {
      const c = ctx.world.gen.center;
      burst(c + 0.5, c + 0.5, '#ffb95e', 24, 4);
    }
  });

  function ensureSnow() {
    while (snow.length < SNOW_COUNT) {
      snow.push({
        x: Math.random() * viewW, y: Math.random() * viewH,
        v: 18 + Math.random() * 30, drift: Math.random() * 2, size: 1 + Math.random() * 2.2,
      });
    }
  }

  function update(dt) {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    ensureSnow();
    for (const f of snow) {
      f.y += f.v * dt;
      f.x += Math.sin(state.time * f.drift + f.v) * 12 * dt;
      if (f.y > viewH + 4) { f.y = -4; f.x = Math.random() * viewW; }
    }
    for (let i = world.length - 1; i >= 0; i--) {
      const p = world[i];
      p.ttl -= dt;
      if (p.ttl <= 0) { world.splice(i, 1); continue; }
      p.vy += (p.gravity ?? 0) * dt;
      p.wx += p.vx * dt;
      p.wy += p.vy * dt;
    }
    for (let i = screen.length - 1; i >= 0; i--) {
      const p = screen[i];
      if (p.mode === 'coin') {
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.p += dt * 1.8;
        if (p.p >= 1) screen.splice(i, 1);
        continue;
      }
      p.ttl -= dt;
      if (p.ttl <= 0) { screen.splice(i, 1); continue; }
      p.vy += 620 * dt;
      p.sx += p.vx * dt;
      p.sy += p.vy * dt;
    }
  }

  function drawWorld(g, camera) {
    const s = camera.scale();
    for (const p of world) {
      const sp = camera.toScreen(p.wx, p.wy);
      const a = Math.max(0, p.ttl / p.life);
      g.globalAlpha = a;
      if (p.text) {
        g.font = `800 ${p.size * s * 0.55}px Nunito, sans-serif`;
        g.textAlign = 'center';
        g.fillStyle = p.color;
        g.strokeStyle = 'rgba(10,22,40,.65)';
        g.lineWidth = 3;
        g.strokeText(p.text, sp.x, sp.y);
        g.fillText(p.text, sp.x, sp.y);
      } else {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(sp.x, sp.y, p.size * s * a, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function drawScreen(g) {
    g.fillStyle = 'rgba(238, 247, 255, 0.75)';
    for (const f of snow) {
      g.globalAlpha = 0.35 + (f.size - 1) * 0.2;
      g.beginPath();
      g.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      g.fill();
    }
    for (const p of screen) {
      if (p.mode === 'coin') {
        if (p.delay > 0) continue;
        const e = 1 - (1 - p.p) ** 2;
        const x = p.sx + (p.tx - p.sx) * e;
        const y = p.sy + (p.ty - p.sy) * e - Math.sin(p.p * Math.PI) * 60;
        g.globalAlpha = 1;
        g.font = '16px sans-serif';
        g.textAlign = 'center';
        g.fillText('🪙', x, y);
      } else {
        g.globalAlpha = Math.max(0, p.ttl / p.life);
        g.save();
        g.translate(p.sx, p.sy);
        g.rotate((p.spin ?? 0) * p.ttl * 4);
        g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        g.restore();
      }
    }
    g.globalAlpha = 1;
  }

  return { update, drawWorld, drawScreen, burst, floatText, coinFly, confetti };
}
