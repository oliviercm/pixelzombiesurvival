# Pixel Zombie Survival

A single-file HTML5 canvas zombie survival game. Survive waves of zombies using 10 different weapons in a pixel-art styled arena.

## Features

- **10 Weapons**: From Glock pistol to RPG launcher, each with unique stats
- **4 Zombie Types**: Normal (gray), Demon (red, fast), Fast (yellow, swift), Boomer (green, explodes on death)
- **Wave System**: Escalating difficulty with more zombies per wave
- **Pickup System**: Health (green) and ammo (yellow) powerups
- **Particle Effects**: Blood splatter, muzzle flash, explosions
- **Synthesized Audio**: Gunshots, impacts, damage sounds (no external assets)
- **Pixel Art Style**: Crisp-edged rendering with grid background

## Controls

| Key | Action |
|-----|--------|
| WASD / Arrow Keys | Move |
| Mouse | Aim |
| Left Click / Spacebar | Shoot |
| Q / E | Switch weapons |

## Getting Started

Simply open `zombie-game.html` in any modern web browser. No build step or server required.

## Project Structure

```
zomb/
├── zombie-game.html    # Complete game (HTML + CSS + JS)
├── ARCHITECTURE.md     # System architecture documentation
├── CODE_STYLE.md       # Coding conventions and patterns
├── README.md           # This file
├── LICENSE             # MIT license
└── .gitignore          # Git ignore rules
```

## Configuration

Tweak game balance by editing the `CONFIG` object near the top of `zombie-game.html`:

- `PLAYER_SPEED` - Movement speed
- `ZOMBIE_SPAWN_INTERVAL` - How often zombies spawn
- `WAVE_DURATION` - Time before next wave (unused in current loop)
- `MAX_ZOMBIES` - Maximum concurrent zombies

Add new zombie types by adding entries to the `ZombieTypes` object.
Add new weapons by adding entries to the `WEAPONS` array.

## Tech

- HTML5 Canvas 2D
- Vanilla JavaScript (ES6+ classes)
- Web Audio API
- Zero dependencies

## License

MIT — See [LICENSE](LICENSE) file.
