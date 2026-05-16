---
date: 2026-05-15
topic: "Explosive Barrels"
status: draft
---

# Explosive Barrels Design Document

## Problem Statement

Add environmental hazard objects (explosive barrels) to the arena that reward players for strategic targeting. Barrels provide crowd control opportunities — a single well-placed shot can clear multiple zombies.

## Constraints

- **Single-file architecture:** All code must fit in `zombie-game.html` (~150 lines added)
- **No external dependencies:** Visuals via canvas drawing, audio via Web Audio API synthesis
- **No movement blocking:** Barrels are passable — players and zombies walk through them
- **Wave-synced spawning:** 1-3 barrels spawn at each wave transition
- **No inheritance:** Follow existing pattern of standalone classes

## Approach

Create a `Barrel` class following the existing entity pattern (Player, Zombie, Pickup). Barrels are passive entities that:
1. Spawn randomly in the arena at wave start
2. Take damage from bullets, zombies, and explosions
3. Explode at 0 health, dealing area damage to nearby entities

**Why this approach:** Minimal code footprint, follows established patterns, enables chain-reaction gameplay without complex systems.

## Architecture

### New Entity Class: Barrel

```
class Barrel {
    constructor(x, y, health)
    update(deltaTime)
    draw(ctx)
    takeDamage(amount)
}
```

**Properties:**
| Property | Type | Value | Description |
|----------|------|-------|-------------|
| x, y | number | spawn position | World coordinates |
| width, height | number | 24 | Barrel dimensions (pixels) |
| health, maxHealth | number | 30-50 | Health pool |
| isExploding | boolean | false | Animation state |
| explosionTimer | number | 0 | Countdown to visual explosion |
| explosionRadius | number | 120 | AoE damage range |
| explosionDamage | number | 25 | AoE damage value |

### New Game State Property

```javascript
let game = {
    // ... existing properties
    barrels: [],  // NEW: Array of Barrel instances
};
```

### New Configuration Constants

```javascript
const CONFIG = {
    // ... existing constants
    BARRELS_PER_WAVE_MIN: 1,
    BARRELS_PER_WAVE_MAX: 3,
    BARREL_HEALTH_MIN: 30,
    BARREL_HEALTH_MAX: 50,
};
```

## Components

### 1. Barrel Class

**Responsibilities:**
- Store position, health, and explosion parameters
- Handle damage intake via `takeDamage()`
- Trigger explosion animation at 0 health
- Render barrel sprite with health-based color variation

**Key behavior:**
- `takeDamage(amount)`: Reduces health, sets `isExploding = true` and `explosionTimer = 300` at 0 health
- `update(deltaTime)`: Decrements `explosionTimer`; when it reaches 0, creates explosion and marks for removal
- `draw(ctx)`: Draws brown rectangle with rope detail; orange flash during explosion

### 2. Spawn Function: `spawnBarrels()`

**Responsibilities:**
- Generate 1-3 barrels at random arena positions
- Assign random health (30-50) to each barrel
- Push barrels to `game.barrels` array

**Placement logic:**
- X: `random(75, worldWidth - 75)`
- Y: `random(75, worldHeight - 75)`
- Called once per wave transition (after zombie/pickup spawning)

### 3. Collision Detection Extensions

**Bullet → Barrel** (in `updateBullets()`):
- Circle-circle distance check
- On hit: `barrel.takeDamage(bullet.damage)`
- If barrel exploding: create explosion, remove bullet

**Zombie → Barrel:** No collision — zombies do not interact with barrels

**Explosion → Barrel** (in `updateExplosions()`):
- Circle-circle distance check
- On hit: `barrel.takeDamage(explosion.damage)`
- If barrel exploding: create **new** explosion (chain reaction)

### 4. Rendering: `drawBarrel(barrel)`

**Layer order:** Between pickups and zombies (layer 4)

**Visual states:**
| State | Color | Description |
|-------|-------|-------------|
| Full health | `#5C3317` | Dark brown barrel |
| < 50% health | `#4A2810` | Darker brown, cracked |
| Exploding | `#FF6600` | Orange flash (300ms) |

**Drawing:**
1. Draw barrel body (rounded rectangle)
2. Draw rope detail (two horizontal lines)
3. If exploding: overlay orange circle with alpha fade

### 5. Game Loop Integration

**Update pass (in `gameLoop()`):**
```javascript
// After entity updates, before render
if (game.barrels) {
    for (let i = game.barrels.length - 1; i >= 0; i--) {
        const barrel = game.barrels[i];
        barrel.update(deltaTime);
        if (barrel.isExploding && barrel.explosionTimer <= 0) {
            game.barrels.splice(i, 1);  // Remove exploded barrel
        }
    }
}
```

**Render pass (in `drawGame()`):**
```javascript
// Between pickups and zombies
if (game.barrels) {
    for (const barrel of game.barrels) {
        drawBarrel(barrel);
    }
}
```

### 6. Wave Transition Integration

**In `gameLoop()` wave completion block:**
```javascript
if (game.zombiesToSpawn <= 0 && game.zombies.length === 0) {
    game.wave++;
    game.zombiesToSpawn = CONFIG.ZOMBIES_PER_WAVE + (game.wave - 1) * 2;
    CONFIG.ZOMBIE_SPAWN_INTERVAL = Math.max(1000, 3000 - game.wave * 100);
    spawnBarrels();  // NEW
}
```

### 7. Explosion Creation Extension

**In `updateExplosions()` — extend zombie damage check:**
```javascript
// After existing explosion-zombie collision:
if (game.barrels) {
    for (const barrel of game.barrels) {
        if (barrel.isExploding) continue;  // Skip already-exploding barrels
        const dx = barrel.x - explosion.x;
        const dy = barrel.y - explosion.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < explosion.radius + barrel.width / 2) {
            barrel.takeDamage(explosion.damage);
            if (barrel.isExploding) {
                createExplosion(barrel.x, barrel.y, barrel.explosionRadius, barrel.explosionDamage);
            }
        }
    }
}
```

## Data Flow

```
Wave Complete
    │
    ▼
spawnBarrels() ──→ game.barrels.push(Barrel)
    │
    ▼
gameLoop() update pass
    │
    ├── updateBullets() ──→ check barrel collision ──→ barrel.takeDamage()
    ├── updateExplosions() ──→ check barrel collision ──→ barrel.takeDamage()
    └── barrel.update() ──→ explosionTimer > 0 ? createExplosion() : null
    │
    ▼
drawGame() render pass
    └── drawBarrel(barrel)
```

## Error Handling

1. **Null safety:** All barrel iteration loops check `game.barrels && game.barrels.length > 0`
2. **Bounds clamping:** Barrel spawn positions clamped to arena bounds + 50px margin
3. **Explosion cleanup:** Explosion objects created by barrels follow same lifecycle rules (300ms lifetime, auto-removed in `updateExplosions()`)
4. **No memory leaks:** Exploded barrels are removed from array; persistent barrels remain until game over

## Testing Strategy

### Manual Testing Checklist

| # | Test | Expected Result |
|---|------|-----------------|
| 1 | Start new game | 1-3 barrels visible in arena |
| 2 | Complete wave | New set of 1-3 barrels spawns |
| 3 | Walk through barrel | Player passes through unimpeded |
| 4 | Shoot barrel | Barrel flashes white, health decreases |
| 5 | Destroy barrel | Barrel explodes with orange flash, then explosion AoE |
| 6 | Shoot nearby zombies | Zombies take explosion damage |
| 7 | Stand near explosion | Player takes explosion damage |
| 8 | Chain reaction | Bullet hits barrel A → explosion hits barrel B → both explode |
| 9 | Zombie walks into barrel | Barrel is unaffected (zombies cannot damage barrels) |
| 10 | Multiple explosions | Each barrel explosion creates independent explosion object |

### Automated Verification (Future)

- Unit test `Barrel.takeDamage()` for correct health reduction
- Unit test `Barrel.update()` for explosion timer countdown
- Integration test: verify `spawnBarrels()` creates 1-3 barrels

## Open Questions

1. **Should barrels persist between playthroughs?** No — `initGame()` already clears `game.barrels = []`
2. **Should zombies get bonus damage from explosions?** Already handled — zombies take `explosion.damage` (25)
3. **Should there be a barrel pickup?** Not in scope for v1
