// Crafting queue: inputs are deducted immediately, outputs arrive when the
// timer completes. Queued jobs persist in the save.
export function createCrafting(ctx) {
  const { state, events, config, inventory } = ctx;

  function recipesFor(buildingId) {
    return config.recipes.filter((r) => r.building === buildingId);
  }

  function canCraft(recipeId) {
    const recipe = config.recipesById[recipeId];
    return recipe ? inventory.hasAll(recipe.inputs) : false;
  }

  function start(recipeId, { timeMult = 1, worker = false } = {}) {
    const recipe = config.recipesById[recipeId];
    if (!recipe || !inventory.hasAll(recipe.inputs)) return false;
    for (const input of recipe.inputs) inventory.remove(input.item, input.amount);
    const speed = (state.research?.includes('quick_forge') ? 0.75 : 1) * timeMult;
    state.crafts.push({ recipe: recipeId, doneAt: state.time + recipe.time * speed });
    events.emit('craft.started', { recipe: recipeId, time: recipe.time * speed, worker });
    return true;
  }

  function update() {
    if (state.crafts.length === 0) return;
    const remaining = [];
    for (const job of state.crafts) {
      if (state.time < job.doneAt) { remaining.push(job); continue; }
      const recipe = config.recipesById[job.recipe];
      if (!recipe) continue; // recipe removed from content — drop the job
      for (const out of recipe.outputs) {
        // Crafted goods always fit: crafting usually condenses items, and
        // punishing a full backpack here would eat the deducted inputs.
        inventory.add(out.item, out.amount, { ignoreCapacity: true });
        state.stats.crafted = (state.stats.crafted ?? 0) + out.amount;
        events.emit('item.crafted', { item: out.item, count: out.amount, recipe: recipe.id });
      }
      ctx.progression.addXp(recipe.experience ?? 0);
    }
    state.crafts = remaining;
  }

  function pendingFor(buildingId) {
    return state.crafts
      .filter((j) => config.recipesById[j.recipe]?.building === buildingId)
      .map((j) => ({ ...j, total: config.recipesById[j.recipe].time, left: j.doneAt - state.time }));
  }

  return { recipesFor, canCraft, start, update, pendingFor };
}
