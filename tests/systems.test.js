// Unit tests for the economy/progression math and core system behavior.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig } from './helpers.js';
import { createEventBus } from '../src/engine/events.js';
import { createInventory } from '../src/systems/inventory.js';
import { createEconomy } from '../src/systems/economy.js';
import { createProgression } from '../src/systems/progression.js';
import { createResearch } from '../src/systems/research.js';
import { createCrafting } from '../src/systems/crafting.js';
import { createLootRoller } from '../src/systems/loot.js';
import { defaultState } from '../src/save/save.js';
import { roundCost } from '../src/utils/math.js';
import { hash2D, weightedPick } from '../src/utils/rng.js';

function makeCtx() {
  const ctx = { config: buildConfig(), state: defaultState(12345, 65.5, 65.5) };
  ctx.events = createEventBus();
  ctx.world = { heatRadius: () => 7, thawRing: () => {} }; // stub for upgrades
  ctx.inventory = createInventory(ctx);
  ctx.economy = createEconomy(ctx);
  ctx.progression = createProgression(ctx);
  ctx.research = createResearch(ctx);
  ctx.crafting = createCrafting(ctx);
  return ctx;
}

test('worker crafting applies the efficiency time multiplier', () => {
  const ctx = makeCtx();
  ctx.inventory.add('raw_meat', 2);
  const recipe = ctx.config.recipesById.cooked_meat;
  assert.ok(ctx.crafting.start('cooked_meat', { timeMult: 1 / 0.75, worker: true }));
  const job = ctx.state.crafts[0];
  assert.ok(Math.abs(job.doneAt - recipe.time / 0.75) < 1e-9);
  // player craft for comparison
  assert.ok(ctx.crafting.start('cooked_meat'));
  assert.ok(Math.abs(ctx.state.crafts[1].doneAt - recipe.time) < 1e-9);
});

test('delivery runners sell crafted goods but never crafter ingredients', () => {
  const ctx = makeCtx();
  ctx.inventory.add('cooked_meat', 3, { ignoreCapacity: true });
  ctx.inventory.add('leather', 2, { ignoreCapacity: true });
  ctx.inventory.add('wood_log', 5, { ignoreCapacity: true }); // raw — never auto-sold
  let ids = ctx.economy.workerSellables().map((i) => i.id).sort();
  assert.deepEqual(ids, ['cooked_meat', 'leather']);
  // a crafter working on luxury meals reserves cooked_meat
  ctx.state.workers[0] = { job: 'craft', building: 'kitchen', recipe: 'luxury_meal' };
  ids = ctx.economy.workerSellables().map((i) => i.id);
  assert.deepEqual(ids, ['leather']);
  // worker sales still pay coins and tag the event
  let evt = null;
  ctx.events.on('items.sold', (e) => { evt = e; });
  const coins = ctx.economy.sell('leather', 2, { worker: true });
  assert.ok(coins > 0);
  assert.equal(evt.worker, true);
});

test('loot roller always yields the guaranteed drop', () => {
  const roll = createLootRoller(() => 0.999); // worst rolls
  const def = { drops: [{ item: 'wood_log', weight: 100, min: 1, max: 2 }, { item: 'hide', weight: 10, min: 1, max: 1 }] };
  const drops = roll(def);
  assert.ok(drops.length >= 1);
  assert.equal(drops[0].item, 'wood_log');
});

test('research needs coins + materials, then applies permanent effects', () => {
  const ctx = makeCtx();
  assert.equal(ctx.research.buy('deep_pockets'), false); // can't afford
  ctx.state.coins = 350;
  ctx.inventory.add('leather', 4);
  const capBefore = ctx.inventory.capacity();
  assert.equal(ctx.research.buy('deep_pockets'), true);
  assert.equal(ctx.state.coins, 0);
  assert.equal(ctx.inventory.count('leather'), 0);
  assert.equal(ctx.inventory.capacity(), capBefore + 20);
  assert.equal(ctx.research.buy('deep_pockets'), false); // one-time only
});

test('inventory respects capacity and stacks', () => {
  const ctx = makeCtx();
  assert.equal(ctx.inventory.capacity(), 20);
  assert.equal(ctx.inventory.add('wood_log', 25), 20); // clamped to capacity
  assert.ok(ctx.inventory.isFull());
  assert.equal(ctx.inventory.add('stone', 1), 0);
  ctx.state.upgrades.backpack = 1;
  assert.equal(ctx.inventory.capacity(), 30);
  assert.equal(ctx.inventory.add('stone', 5), 5);
});

test('selling pays 60% of value and demand adds 25%', () => {
  const ctx = makeCtx();
  const wood = ctx.config.itemsById.wood_log;
  const base = Math.floor(wood.value * 0.6);
  ctx.state.time = 0; // demand item = first sellable; not necessarily wood
  const demandId = ctx.economy.demandItemId();
  if (demandId !== 'wood_log') {
    assert.equal(ctx.economy.sellPrice('wood_log'), Math.max(1, base));
  }
  const demandItem = ctx.config.itemsById[demandId];
  assert.equal(
    ctx.economy.sellPrice(demandId),
    Math.max(1, Math.floor(demandItem.value * 0.6 * 1.25))
  );
});

test('sell moves items to coins and emits events', () => {
  const ctx = makeCtx();
  let sold = null;
  ctx.events.on('items.sold', (e) => { sold = e; });
  ctx.inventory.add('hide', 3);
  const coins = ctx.economy.sell('hide', 3);
  assert.ok(coins > 0);
  assert.equal(ctx.state.coins, coins);
  assert.equal(ctx.inventory.count('hide'), 0);
  assert.equal(sold.count, 3);
});

test('upgrade costs follow base × 1.5^level with friendly rounding', () => {
  const ctx = makeCtx();
  assert.equal(ctx.progression.upgradeCost('furnace'), 100);
  ctx.state.coins = 100;
  assert.ok(ctx.progression.buyUpgrade('furnace'));
  assert.equal(ctx.state.upgrades.furnace, 2);
  assert.equal(ctx.state.coins, 0);
  assert.equal(ctx.progression.upgradeCost('furnace'), roundCost(100 * 1.5));
});

test('xp levels follow the 100 × L^1.6 curve', () => {
  const ctx = makeCtx();
  assert.equal(ctx.progression.xpForNextLevel(), 100);
  ctx.progression.addXp(100);
  assert.equal(ctx.state.level, 2);
  assert.ok(ctx.state.coins > 0, 'level-up grants bonus coins');
});

test('world hash is deterministic and weightedPick honors weights', () => {
  assert.equal(hash2D(42, 10, -5, 3), hash2D(42, 10, -5, 3));
  assert.notEqual(hash2D(42, 10, -5, 3), hash2D(43, 10, -5, 3));
  const entries = [{ id: 'a', weight: 1 }, { id: 'b', weight: 99 }];
  assert.equal(weightedPick(entries, 0.005).id, 'a');
  assert.equal(weightedPick(entries, 0.5).id, 'b');
});

test('expansion cost formula: 25 + tiles × 4, rounded', () => {
  const eco = buildConfig().economy;
  const cost = (n) => roundCost(eco.expansion_base + n * eco.expansion_per_tile);
  assert.equal(cost(0), 25);
  assert.equal(cost(10), 65);
  assert.ok(cost(50) > cost(10), 'cost grows with expansion');
});
