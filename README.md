# ❄️ Frozen Frontier

A cozy browser survival/expansion game: melt the ice, harvest resources, craft goods, sell to Maple, upgrade the furnace, and push the frontier outward — one satisfying tile at a time.

Play it live at: https://pulkitsaxena14.github.io/frozen-frontier-game/

## Play locally

```bash
npm install
npm run dev      # → http://localhost:5173
```

Production build: `npm run build` (output in `dist/`, fully static — host anywhere).
Tests: `npm test` (Node's built-in test runner, no extra deps).

## Controls

| Input | Action |
|---|---|
| **WASD / arrows** | Move |
| **Hold Space / E** (or hold mouse) | Harvest the nearest resource |
| **F** or tap/click a building | Open Forge / Kitchen / Merchant / Furnace |
| **Click/tap a dashed frontier tile** | Buy & melt it |
| **Wheel / pinch** | Zoom |
| Touch: virtual joystick + ✋ button | Mobile controls |

## The loop

Harvest → carry → process (Kitchen/Forge, ×2–×5 value) → sell (60% of value, +25% on the daily demand item) → upgrade (furnace melts a wider circle; tools, boots, backpack, magnet) → expand (cost `25 + tiles×4`) → discover higher-tier biomes: Snow Plains → Frozen Lake → Pine Forest → Mountains → Ancient Ruins → Volcanic Rift.

Saves live in localStorage (versioned, autosaved every 15 s and on milestones).

## Architecture

- **Data-driven**: all content in `public/config/*.json` (items, resources, recipes, biomes, quests, upgrades, economy, world). Validated at boot.
- **`src/engine/`** — event bus, input normalization, camera, config loader.
- **`src/world/`** — deterministic seeded generation (biome rings, clustered nodes) + runtime tile/thaw state.
- **`src/systems/`** — movement, harvest, inventory, crafting, economy, quests, interaction, progression, particles.
- **`src/render/`** — Canvas 2D with per-chunk terrain caches; all art is procedural (no image assets).
- **`src/audio/`** — all SFX/ambience/music synthesized with WebAudio (no audio assets).
- **`src/ui/`** — DOM HUD, bottom-sheet panels, toasts.

Zero runtime dependencies, zero binary assets — all visuals are procedural Canvas 2D and all sound is synthesized with WebAudio.
