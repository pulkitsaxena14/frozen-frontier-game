// Boot: load config → build systems → run the loop.
// Frame order (per ARCHITECTURE.md): input → movement → harvest → crafting →
// save → particles → UI → render.
import { loadConfig } from './engine/config.js';
import { createEventBus } from './engine/events.js';
import { createInput } from './engine/input.js';
import { createCamera } from './engine/camera.js';
import { createWorldGen } from './world/worldgen.js';
import { createWorld } from './world/world.js';
import { createInventory } from './systems/inventory.js';
import { createEconomy } from './systems/economy.js';
import { createProgression } from './systems/progression.js';
import { createMovement } from './systems/movement.js';
import { createHarvest } from './systems/harvest.js';
import { createCrafting } from './systems/crafting.js';
import { createQuests } from './systems/quests.js';
import { createInteraction } from './systems/interaction.js';
import { createCompass } from './systems/compass.js';
import { createResearch } from './systems/research.js';
import { createVillagers } from './systems/villagers.js';
import { createMinimap } from './ui/minimap.js';
import { createParticles } from './systems/particles.js';
import { createAudio } from './audio/audio.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createPanels } from './ui/panels.js';
import { createFeedback } from './ui/feedback.js';
import { defaultState, loadSave, clearSave, hasSave, attachAutosave } from './save/save.js';

const MAX_DT = 0.05; // clamp long frames (tab switches) so physics stays sane

async function boot() {
  const config = await loadConfig();
  const canvas = document.getElementById('game-canvas');

  function buildGame(state) {
    const ctx = { config, state };
    ctx.events = createEventBus();
    ctx.input = createInput(canvas, ctx.events);
    ctx.camera = createCamera(config.world.size, config.world.tile_px);
    const gen = createWorldGen(config, state.seed);
    ctx.world = createWorld(config, gen, state, ctx.events);
    // Content updates can place buildings where a saved player stood — unstick.
    if (!ctx.world.isWalkable(state.player.x, state.player.y)) {
      state.player.x = gen.center + 1.5;
      state.player.y = gen.center + 1.5;
    }
    ctx.inventory = createInventory(ctx);
    ctx.economy = createEconomy(ctx);
    ctx.progression = createProgression(ctx);
    ctx.movement = createMovement(ctx);
    ctx.harvest = createHarvest(ctx);
    ctx.crafting = createCrafting(ctx);
    ctx.quests = createQuests(ctx);
    ctx.interaction = createInteraction(ctx);
    ctx.compass = createCompass(ctx);
    ctx.research = createResearch(ctx);
    ctx.villagers = createVillagers(ctx);
    ctx.particles = createParticles(ctx);
    ctx.audio = createAudio(ctx);
    ctx.renderer = createRenderer(ctx);
    ctx.hud = createHud(ctx);
    ctx.panels = createPanels(ctx);
    ctx.feedback = createFeedback(ctx);
    ctx.minimap = createMinimap(ctx);
    ctx.autosave = attachAutosave(ctx);
    ctx.events.on('input.map', () => ctx.minimap.toggle());
    document.getElementById('btn-map').addEventListener('click', () => {
      ctx.audio.play('click');
      ctx.minimap.toggle();
    });

    ctx.events.on('input.zoom', ({ factor }) => ctx.camera.zoomBy(factor));
    ctx.events.on('node.depleted', () => ctx.camera.addShake(0.15));
    ctx.events.on('upgrade.purchased', ({ id }) => {
      if (id === 'furnace') ctx.camera.addShake(0.45);
    });
    ctx.camera.x = state.player.x;
    ctx.camera.y = state.player.y;
    return ctx;
  }

  function freshState() {
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const center = config.world.size / 2;
    return defaultState(seed, center + 1.5, center + 1.5);
  }

  const game = buildGame(loadSave() ?? freshState());

  // --- title screen ---------------------------------------------------------
  const title = document.getElementById('title-screen');
  const btnPlay = document.getElementById('btn-play');
  const btnNew = document.getElementById('btn-new-game');
  if (hasSave()) {
    btnPlay.textContent = '▶  Continue';
    btnNew.classList.remove('hidden');
  }

  let running = false;
  function start() {
    game.audio.unlock();
    game.audio.play('click');
    title.classList.add('fading');
    game.hud.show();
    if (!running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  btnPlay.addEventListener('click', start);
  // A full reload gives every module a clean slate (no duplicate DOM listeners).
  btnNew.addEventListener('click', () => {
    game.autosave.disable();
    clearSave();
    location.reload();
  });

  // --- main loop ------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(MAX_DT, (now - last) / 1000);
    last = now;
    const { state } = game;
    state.time += dt;

    game.movement.update(dt);
    game.harvest.update(dt);
    game.crafting.update();
    game.villagers.update(dt);
    game.autosave.update(dt);
    game.particles.update(dt);
    game.minimap.update(dt);
    game.camera.follow(state.player.x, state.player.y, dt);
    game.hud.update(dt);
    game.renderer.render();

    requestAnimationFrame(frame);
  }
}

boot().catch((err) => {
  console.error(err);
  const el = document.querySelector('.title-card');
  if (el) {
    el.innerHTML = `<h1 class="game-title">Frozen<span>Frontier</span></h1>
      <p class="title-tag">Failed to load: ${String(err.message ?? err)}</p>`;
  }
});
