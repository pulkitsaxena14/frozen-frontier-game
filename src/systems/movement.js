// Player movement with axis-separated collision so the player slides along
// frozen edges and buildings instead of sticking.
const PLAYER_RADIUS = 0.28;

export function createMovement(ctx) {
  const { state, world, input, progression, events } = ctx;
  let stepTimer = 0;

  function canStand(x, y) {
    return (
      world.isWalkable(x - PLAYER_RADIUS, y - PLAYER_RADIUS) &&
      world.isWalkable(x + PLAYER_RADIUS, y - PLAYER_RADIUS) &&
      world.isWalkable(x - PLAYER_RADIUS, y + PLAYER_RADIUS) &&
      world.isWalkable(x + PLAYER_RADIUS, y + PLAYER_RADIUS)
    );
  }

  function update(dt) {
    const axis = input.axis();
    const p = state.player;
    p.moving = axis.x !== 0 || axis.y !== 0;
    if (!p.moving) return;

    const speed = progression.moveSpeed();
    const nx = p.x + axis.x * speed * dt;
    const ny = p.y + axis.y * speed * dt;

    if (canStand(nx, p.y)) p.x = nx;
    if (canStand(p.x, ny)) p.y = ny;

    if (axis.x !== 0) p.facing = axis.x > 0 ? 1 : -1;

    stepTimer -= dt;
    if (stepTimer <= 0) {
      events.emit('player.step', { x: p.x, y: p.y });
      stepTimer = 0.34;
    }
  }

  return { update, canStand };
}
