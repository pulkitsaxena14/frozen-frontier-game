// Content validation: every JSON reference must resolve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildConfig } from './helpers.js';
import { validate } from '../src/engine/config.js';

test('all content JSON cross-references are valid', () => {
  assert.doesNotThrow(() => validate(buildConfig()));
});

test('crafted items are worth more than their inputs', () => {
  const config = buildConfig();
  for (const recipe of config.recipes) {
    const inputValue = recipe.inputs.reduce(
      (s, i) => s + config.itemsById[i.item].value * i.amount, 0
    );
    const outputValue = recipe.outputs.reduce(
      (s, o) => s + config.itemsById[o.item].value * o.amount, 0
    );
    assert.ok(
      outputValue > inputValue,
      `recipe ${recipe.id}: output ${outputValue} should exceed input ${inputValue}`
    );
  }
});

test('every biome resource tier fits the biome tier arc', () => {
  const config = buildConfig();
  for (const biome of config.biomes) {
    for (const r of biome.resources) {
      const res = config.resourcesById[r.id];
      assert.ok(res.tier <= biome.tier + 1, `${r.id} (t${res.tier}) too high for ${biome.id}`);
    }
  }
});
