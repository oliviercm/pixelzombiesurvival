# Code Style — Pixel Zombie Survival

## Naming Conventions

### Variables
| Type | Convention | Example |
|------|-----------|---------|
| Constants | `UPPER_SNAKE_CASE` | `CONFIG.PLAYER_SPEED` |
| Object keys | `camelCase` | `bulletSpeed`, `fireRate` |
| Private fields | `camelCase` (no prefix) | `this.lastAttack` |

### Functions
| Type | Convention | Example |
|------|-----------|---------|
| Module-level | `camelCase` | `spawnZombie()`, `gameLoop()` |
| Class methods | `camelCase` | `player.update()`, `zombie.takeDamage()` |
| Event handlers | `camelCase` | `restartGame()` |

### Classes
| Convention | Example |
|-----------|---------|
| PascalCase | `Player`, `Zombie`, `Pickup` |

### Enums/Constants
| Convention | Example |
|-----------|---------|
| PascalCase object | `ZombieTypes`, `WEAPONS` |

## Code Organization

### Section Headers
Use block comment headers to separate logical sections:

```javascript
// ============================================
// SECTION NAME - Brief Description
// ============================================
```

### Class Structure Pattern
```javascript
/**
 * Brief description of what the class does
 */
class ClassName {
    constructor(x, y) {
        // Initialize properties
    }

    update(deltaTime) {
        // State update logic
    }

    draw(ctx) {
        // Rendering logic
    }

    // Other methods...
}
```

### Data-Driven Design
Define behavior through data objects rather than conditional logic:

```javascript
// DO: Use data objects
const ZombieTypes = {
    normal: {
        speed: 1,
        health: 40,
        colors: { body: '#888888', ... }
    }
};

// In class: read from data
const zombieConfig = ZombieTypes[type];
this.speed = zombieConfig.speed;
```

## Code Patterns

### Delta-Time Movement
All movement is framerate-independent using delta-time scaling:

```javascript
update(deltaTime) {
    const timeScale = deltaTime / 16.67;  // 16.67ms = 60fps
    this.x += velocity * timeScale;
}
```

### Array Mutation Pattern
Remove elements while iterating backwards:

```javascript
for (let i = array.length - 1; i >= 0; i--) {
    if (shouldRemove(item)) {
        array.splice(i, 1);
    }
}
```

### Object Immutability Pattern
Clone objects before modifying:

```javascript
// Clone weapon config into runtime object
this.weapons = WEAPONS.map(w => ({...w, currentAmmo: w.ammo}));
```

### Bounds Checking
Clamp values to valid ranges:

```javascript
// Position bounds
this.x = Math.max(min, Math.min(max, this.x + dx));

// Camera bounds
camera.x = Math.max(0, Math.min(worldWidth - canvasWidth, camera.x));
```

### Short-Circuit Return
Return early from functions:

```javascript
function shoot() {
    if (weapon.currentAmmo <= 0 || now - this.lastShot < weapon.fireRate) return;
    // ... rest of function
}
```

## Error Handling

### Browser Compatibility
Wrap risky APIs in try-catch:

```javascript
try {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.initialized = true;
} catch (e) {
    console.warn('Web Audio API not supported');
}
```

### Fallback Values
Use fallbacks for optional data:

```javascript
const zombieConfig = ZombieTypes[type] || ZombieTypes.normal;
```

### Validation
Check conditions before operations:

```javascript
if (game.zombies.length >= CONFIG.MAX_ZOMBIES) return;
if (distance > 0) { /* avoid division by zero */ }
```

## Canvas Drawing Patterns

### Coordinate Transformation
Always transform world coordinates to screen coordinates:

```javascript
draw(ctx) {
    const screenX = this.x - game.camera.x;
    const screenY = this.y - game.camera.y;
    // ... draw using screenX/screenY
}
```

### Off-Screen Culling
Skip drawing entities outside viewport:

```javascript
if (screenX < -50 || screenX > CONFIG.CANVAS_WIDTH + 50 ||
    screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) {
    return;
}
```

### Alpha Blending
Use `globalAlpha` for transparency effects:

```javascript
ctx.globalAlpha = alpha;
ctx.fillRect(...);
ctx.globalAlpha = 1;  // Reset
```

### Context State Management
Save/restore transform state:

```javascript
ctx.save();
ctx.translate(x, y);
ctx.rotate(angle);
// ... draw
ctx.restore();
```

## Audio Patterns

### Synthesized Sound Generation
```javascript
playNoise(duration, frequency, volume, decay) {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate noise sample
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * decay));
    }
    // ... connect and play
}
```

### Exponential Decay (Tone Envelope)
```javascript
gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
```

## Color Conventions

| Category | Pattern | Examples |
|----------|---------|----------|
| Game UI | `#e94560` (red accent), `#1a1a2e` (dark bg) | Buttons, borders |
| Player | `#4488ff` (blue) | Body color |
| Zombies | Varies by type | Gray, red, yellow |
| Health | Green → Yellow → Red | `#00ff00`, `#ffff00`, `#ff0000` |
| Particles | Type-specific | Blood: `#8B0000`, fire: `#ff6600` |

## Do's and Don'ts

### DO
- Use data-driven design for configurable entities (zombies, weapons)
- Scale all movement by `deltaTime / 16.67` for framerate independence
- Iterate arrays backwards when removing elements
- Clamp camera and positions to world bounds
- Use `ctx.save()`/`ctx.restore()` for transform changes
- Reset `globalAlpha` after transparent drawing

### DON'T
- Use `setInterval` for game loop (use `requestAnimationFrame`)
- Cap deltaTime without also adjusting game time (prevents time jumps)
- Forget to reset `globalAlpha` after transparency operations
- Use hardcoded magic numbers — extract to CONFIG object
- Create AudioContext without user gesture (browser autoplay policy)
