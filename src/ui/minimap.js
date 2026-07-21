// Minimap: biome rings, thawed ground, buildings, player and the quest
// compass target. Static biome base is drawn once; overlays refresh at 2 Hz.
const REFRESH_SECONDS = 0.5;

export function createMinimap(ctx) {
  const { state, config, world } = ctx;
  const canvas = document.getElementById('minimap');
  const size = config.world.size;
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');

  // biome base colors never change — render once
  const base = document.createElement('canvas');
  base.width = size;
  base.height = size;
  const bg = base.getContext('2d');
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      bg.fillStyle = world.gen.biomeAt(x, y).ground.frozen;
      bg.fillRect(x, y, 1, 1);
    }
  }
  bg.fillStyle = 'rgba(11, 27, 51, 0.35)'; // frost dim so thawed land pops
  bg.fillRect(0, 0, size, size);

  let timer = 0;
  let visible = false;

  function toggle() {
    visible = !visible;
    canvas.classList.toggle('hidden', !visible);
    timer = REFRESH_SECONDS; // force immediate redraw on open
  }

  function drawThawedTile(x, y) {
    g.fillStyle = world.gen.biomeAt(x, y).ground.thawed;
    g.fillRect(x, y, 1, 1);
  }

  function update(dt) {
    if (!visible) return;
    timer += dt;
    if (timer < REFRESH_SECONDS) return;
    timer = 0;

    g.drawImage(base, 0, 0);
    // thawed = heat disc + purchased tiles (small sets — cheap to iterate)
    const c = world.gen.center;
    const r = world.heatRadius();
    for (let y = c - r; y <= c + r; y++) {
      for (let x = c - r; x <= c + r; x++) {
        if (world.inHeat(x, y)) drawThawedTile(x, y);
      }
    }
    for (const key of world.purchased) {
      const [x, y] = key.split(',').map(Number);
      drawThawedTile(x, y);
    }
    // buildings
    g.fillStyle = '#ff9d3c';
    for (const b of world.buildings) g.fillRect(b.x - 1, b.y - 1, 3, 3);
    // quest target
    const target = ctx.compass.target();
    if (target) {
      g.strokeStyle = '#ffd24a';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(target.x, target.y, 4, 0, Math.PI * 2);
      g.stroke();
    }
    // player
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(state.player.x, state.player.y, 2.2, 0, Math.PI * 2);
    g.fill();
  }

  return { update, toggle, get visible() { return visible; } };
}
