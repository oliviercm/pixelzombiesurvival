# Architecture — Pixel Zombie Survival

## Overview

A single-file HTML5 canvas zombie survival game. The player navigates a 1800×1200 arena, fighting waves of zombies with 10 different weapons. Features include multiple zombie types, weapon switching, health/ammo pickups, particle effects, and synthesized audio.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Rendering | HTML5 Canvas 2D |
| Logic | Vanilla JavaScript (ES6+ classes) |
| Audio | Web Audio API (synthesized) |
| Styling | Embedded CSS (pixel art aesthetic) |
| Format | Single `.html` file |

## File Structure

```
zomb/
├── zombie-game.html    # Everything: HTML + CSS + JS (1,880 lines)
├── ARCHITECTURE.md     # This file
├── CODE_STYLE.md       # Coding conventions
├── README.md           # Project overview
├── LICENSE             # MIT license
├── .gitignore          # Git ignore rules
└── .git/               # Version control
```

## Code Organization (Inside `zombie-game.html`)

The file is organized into **13 logical sections** using comment headers:

```
┌─────────────────────────────────────────────────┐
│ 1. CSS STYLES                                   │  (Lines 7-177)
│    - Reset, canvas, HUD, overlays, buttons      │
├─────────────────────────────────────────────────┤
│ 2. HTML STRUCTURE                               │  (Lines 179-222)
│    - Canvas, HUD divs, game over screen         │
├─────────────────────────────────────────────────┤
│ 3. GAME CONFIGURATION                           │  (Lines 231-253)
│    - Constants: sizes, speeds, intervals        │
├─────────────────────────────────────────────────┤
│ 4. ZOMBIE TYPE DEFINITIONS                      │  (Lines 259-323)
│    - Data-driven: normal, demon, fast, boomer    │
├─────────────────────────────────────────────────┤
│ 5. WEAPON DEFINITIONS                           │  (Lines 311-444)
│    - Array of 10 weapons with stats             │
├─────────────────────────────────────────────────┤
│ 6. GAME STATE                                   │  (Lines 449-475)
│    - Global mutable state object                │
├─────────────────────────────────────────────────┤
│ 7. SOUND ENGINE                                 │  (Lines 480-590)
│    - Web Audio API wrapper, synthesized SFX     │
├─────────────────────────────────────────────────┤
│ 8. INPUT HANDLING                               │  (Lines 595-617)
│    - Keyboard + mouse event listeners           │
├─────────────────────────────────────────────────┤
│ 9. ENTITY CLASSES                               │  (Lines 834-1162)
│    - Player class (movement, shooting, health)  │
│    - Zombie class (AI, damage, rendering)       │
│    - Pickup class (health/ammo powerups)        │
├─────────────────────────────────────────────────┤
│ 10. GAME FUNCTIONS                              │  (Lines 1241-1857)
│     - initGame(), spawnZombie(), spawnPickup()  │
│     - updateBullets(), updateParticles()        │
│     - drawBackground(), drawGame()              │
│     - gameLoop() - main requestAnimationFrame   │
│     - gameOver(), restartGame()                 │
├─────────────────────────────────────────────────┤
│ 11. EVENT LISTENERS                             │  (Lines 1588-1593)
│     - Start/restart button clicks               │
└─────────────────────────────────────────────────┘
```

## Core Architecture

### Game Loop Pattern

```
requestAnimationFrame (gameLoop)
    │
    ├── Calculate deltaTime (capped at 100ms)
    ├── Update: player, zombies, bullets, particles
    ├── Spawn: zombies (in groups), pickups
    ├── Check: wave completion
    ├── Render: background, entities, particles, UI
    └── Loop
```

### Data Flow

```
Input (keyboard/mouse)
    │
    ▼
Player.update() ──▶ Player.shoot() ──▶ SoundEngine.playShoot()
    │                    │
    │                    ▼
    │               game.bullets[]
    │
    ▼
Update Physics ──▶ Bullet-Zombie collision ──▶ Zombie.takeDamage()
    │                       │
   │                       ▼
     │                  Zombie death? ──▶ createBloodSplatter() + createBoomerExplosion() (if boomer)
    │                       │
    │                       ▼
    │                  game.kills++
    │
    ▼
Wave Check ──▶ If all zombies dead ──▶ game.wave++
    │
    ▼
Render ──▶ Camera follow player ──▶ Draw all entities
```

### Entity Lifecycle

```
SPAWN ──▶ UPDATE ──▶ RENDER
  │          │           │
  │     ┌────┼────┐     │
  ▼    Attack │  Collision
  │          │    │      │
  ▼          ▼    ▼      │
 REMOVE ◄─── HIT ◄──────┘
 (health=0) (dead)
```

## Key Components

### Zombie System
- **Data-driven types**: `ZombieTypes` object defines stats; `Zombie` class reads them
- **Spawning**: Groups of 3-5 zombies at arena edges
- **AI**: Simple seek behavior toward player position
- **Explosions**: Boomer zombies detonate on death, damaging nearby zombies AND the player

### Weapon System
- **10 weapons** defined as data objects
- **Two categories**: Direct-fire (bullets) and explosive (RPG/LAW)
- **Ammo management**: Finite ammo per weapon, pickups restore all

### Audio System
- **Web Audio API** with synthesized sounds (no external assets)
- **Noise-based**: Gunshots, impacts
- **Tone-based**: Damage feedback
- **Lazy init**: AudioContext created on first user interaction (browser policy)

### Rendering
- **Camera system**: Follows player, clamped to world bounds
- **Pixel art style**: `image-rendering: pixelated`
- **Particle system**: Uniform particle class for all effects
- **Off-screen culling**: Entities skip drawing when outside viewport

## Configuration

| Parameter | Location | Purpose |
|-----------|----------|---------|
| Game constants | `CONFIG` object | Tuning speeds, sizes, intervals |
| Zombie stats | `ZombieTypes` object | Adding new zombie types |
| Weapon stats | `WEAPONS` array | Adding new weapons |
| Visual colors | Inline in classes | Theming |
