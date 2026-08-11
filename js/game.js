// ============================================
// GAME STATE
// ============================================
let game = {
    canvas: null,
    ctx: null,
    running: false,
    paused: false,
    player: null,
    npcs: [],
    bullets: [],
    zombies: [],
    pickups: [],
    particles: [],
    explosions: [],
    barrels: [],
    kills: 0,
    wave: 1,
    zombiesInWave: 0,
    zombiesToSpawn: 0,
    lastZombieSpawn: 0,
    lastPickupSpawn: 0,
    mouseX: 0,
    mouseY: 0,
    mouseClick: false,
    camera: { x: 0, y: 0 },
    shake: { intensity: 0, decay: 0.9 },
    worldWidth: 1800,
    worldHeight: 1200,
    lastFrameTime: 0,
    deltaTime: 0,
    time: 0
};

// ============================================
// GAME FUNCTIONS
// ============================================

/**
 * Initialize the game canvas and state
 */
function initGame() {
    game.canvas = document.getElementById('gameCanvas');
    game.ctx = game.canvas.getContext('2d');
    game.canvas.width = CONFIG.CANVAS_WIDTH;
    game.canvas.height = CONFIG.CANVAS_HEIGHT;

    // Initialize sound engine (must be called after user interaction)
    SoundEngine.init();

    // Reset game state
    game.player = new Player(game.worldWidth / 2, game.worldHeight / 2);
    game.npcs = [];
    game.bullets = [];
    game.zombies = [];
    game.pickups = [];
    game.particles = [];
    game.explosions = [];
    game.barrels = [];
    spawnBarrels();
    game.kills = 0;
    game.wave = 1;
    game.zombiesInWave = 0;
    game.zombiesToSpawn = CONFIG.INITIAL_ZOMBIE_COUNT + CONFIG.INCREASED_ZOMBIES_PER_WAVE * (game.wave - 1);
    game.lastZombieSpawn = game.time;
    game.lastPickupSpawn = game.time;
    game.running = true;
    game.paused = false;
    game.canvas.style.cursor = 'none';

    // Hide screens
    document.getElementById('instructionsScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';

    // Attach mouse event listeners for shooting (must be after canvas exists)
    game.canvas.addEventListener('mousedown', (e) => {
        if (game.running && e.button === 0) { // Left click only
            game.mouseClick = true;
        }
    });

    game.canvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) { // Left button only
            game.mouseClick = false;
        }
    });

    // Prevent context menu on right click
    game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Start game loop
    requestAnimationFrame(gameLoop);
}

/**
 * Spawn a zombie at a random position near the player
 */
function spawnZombie() {
    if (game.zombies.length >= CONFIG.MAX_ZOMBIES) return false;

    // Spawn on a random edge of the arena
    const edge = Math.floor(Math.random() * 4);
    const padding = 20;
    let x, y;

    switch (edge) {
        case 0: // top edge
            x = Math.random() * (game.worldWidth + padding * 2) - padding;
            y = 0 - padding;
            break;
        case 1: // bottom edge
            x = Math.random() * (game.worldWidth + padding * 2) - padding;
            y = game.worldHeight + padding;
            break;
        case 2: // left edge
            x = 0 - padding;
            y = Math.random() * (game.worldHeight + padding * 2) - padding;
            break;
        case 3: // right edge
            x = game.worldWidth + padding;
            y = Math.random() * (game.worldHeight + padding * 2) - padding;
            break;
    }

    // Determine zombie type using integer weight selection from ZombieTypes config
    const zombieTypeNames = Object.keys(ZombieTypes);
    const totalWeight = zombieTypeNames.reduce((sum, t) => sum + ZombieTypes[t].spawnWeight, 0);
    const rand = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    let zombieType = 'normal';

    for (const type of zombieTypeNames) {
        cumulativeWeight += ZombieTypes[type].spawnWeight;
        if (rand < cumulativeWeight) {
            zombieType = type;
            break;
        }
    }
    
    game.zombies.push(new Zombie(x, y, zombieType));
    game.zombiesInWave++;

    return true;
}

/**
 * Spawn a friendly NPC near the player
 */
function spawnNPC() {
    if (game.npcs.length >= CONFIG.MAX_NPCS) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = CONFIG.NPC_SPAWN_DISTANCE;
    const x = game.player.x + Math.cos(angle) * distance;
    const y = game.player.y + Math.sin(angle) * distance;

    const clampedX = Math.max(CONFIG.NPC_SIZE, Math.min(game.worldWidth - CONFIG.NPC_SIZE, x));
    const clampedY = Math.max(CONFIG.NPC_SIZE, Math.min(game.worldHeight - CONFIG.NPC_SIZE, y));

    game.npcs.push(new NPC(clampedX, clampedY));
}

/**
 * Spawn a pickup at a random position
 */
function spawnPickup() {
    if (game.pickups.length >= CONFIG.MAX_PICKUPS) return;

    const x = Math.random() * (game.worldWidth - 100) + 50;
    const y = Math.random() * (game.worldHeight - 100) + 50;
    game.pickups.push(new Pickup(x, y));
}

/**
 * Update camera to follow player
 */
function updateCamera() {
    game.camera.x = game.player.x - CONFIG.CANVAS_WIDTH / 2;
    game.camera.y = game.player.y - CONFIG.CANVAS_HEIGHT / 2;

    // Clamp camera to world bounds
    game.camera.x = Math.max(0, Math.min(game.worldWidth - CONFIG.CANVAS_WIDTH, game.camera.x));
    game.camera.y = Math.max(0, Math.min(game.worldHeight - CONFIG.CANVAS_HEIGHT, game.camera.y));
}

function triggerShake(intensity) {
    game.shake.intensity = game.shake.intensity + intensity;
}

function updateShake() {
    if (game.shake.intensity > 0.1) {
        game.shake.intensity *= game.shake.decay;
    } else {
        game.shake.intensity = 0;
    }
}

/**
 * Draw background grid pattern
 */
function drawBackground() {
    // Dark ground color
    game.ctx.fillStyle = '#2d2d3d';
    game.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw grid lines
    game.ctx.strokeStyle = '#3a3a4a';
    game.ctx.lineWidth = 1;

    const gridSize = 64;
    const startX = -(game.camera.x % gridSize);
    const startY = -(game.camera.y % gridSize);

    for (let x = startX; x < CONFIG.CANVAS_WIDTH; x += gridSize) {
        game.ctx.beginPath();
        game.ctx.moveTo(x, 0);
        game.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
        game.ctx.stroke();
    }

    for (let y = startY; y < CONFIG.CANVAS_HEIGHT; y += gridSize) {
        game.ctx.beginPath();
        game.ctx.moveTo(0, y);
        game.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
        game.ctx.stroke();
    }
}

/**
 * Update and draw bullets
 */
function updateBullets(deltaTime) {
    const timeScale = deltaTime / 16.67;
    for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        bullet.x += bullet.vx * timeScale;
        bullet.y += bullet.vy * timeScale;
        bullet.life -= deltaTime;

        // Particle trail
        if (bullet.trail) {
            const trail = bullet.trail;
            const smokeAngle = Math.atan2(-bullet.vy, -bullet.vx) + (Math.random() - 0.5) * 1.0;
            const smokeSpeed = Math.random() * (trail.speedMax - trail.speedMin) + trail.speedMin;
            game.particles.push({
                x: bullet.x + (Math.random() - 0.5) * 6,
                y: bullet.y + (Math.random() - 0.5) * 6,
                vx: Math.cos(smokeAngle) * smokeSpeed,
                vy: Math.sin(smokeAngle) * smokeSpeed,
                size: Math.random() * (trail.sizeMax - trail.sizeMin) + trail.sizeMin,
                color: trail.color,
                life: trail.life,
                maxLife: trail.life,
                useDecay: true,
                layer: 1
            });
        }

        // Remove expired bullets
        if (bullet.life <= 0) {
            game.bullets.splice(i, 1);
            continue;
        }

        // Check if bullet hit zombie
        let hit = false;
        for (let j = game.zombies.length - 1; j >= 0; j--) {
            const zombie = game.zombies[j];
            const dx = bullet.x - zombie.x;
            const dy = bullet.y - zombie.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < bullet.size + zombie.width / 2) {
                hit = true;
                const killed = zombie.takeDamage(bullet.damage);

                // Play meaty hit sound with weapon context
                SoundEngine.playHit(bullet.sound);

                // Create explosion if applicable
                if (bullet.explosionRadius > 0) {
                    createExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.damage);
                    // Play explosion sound
                    SoundEngine.playExplosion(bullet.explosionRadius);
                }

                if (killed) {
                    game.zombies.splice(j, 1);
                }
                break;
            }
        }

        // Remove bullet if it hit something
        if (hit) {
            game.bullets.splice(i, 1);
            continue;
        }

        // Check if bullet hit barrel
        let barrelHit = false;
        if (game.barrels) {
            for (const barrel of game.barrels) {
                if (barrel.isExploding) continue;
                const dx = bullet.x - barrel.x;
                const dy = bullet.y - barrel.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < bullet.size + Math.max(barrel.width, barrel.height) / 2) {
                    barrelHit = true;
                    barrel.takeDamage(bullet.damage);
                    SoundEngine.playBarrelHit();
                    break;
                }
            }
        }

        if (barrelHit) {
            game.bullets.splice(i, 1);
        }
    }
}

/**
 * Create explosion effect
 */
function createExplosion(x, y, radius, damage) {
    game.explosions.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: radius,
        life: 300,
        maxLife: 300,
        damage: damage,
        startTime: game.time,
        damagedZombies: new Set()
    });

    // Create explosion particles
    for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 / 20) * i;
        game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * (Math.random() * 5 + 2),
            vy: Math.sin(angle) * (Math.random() * 5 + 2),
            life: 400,
            maxLife: 400,
            color: Math.random() > 0.5 ? '#ff6600' : '#ffff00',
            size: Math.random() * 4 + 2
        });
    }

    triggerShake(damage);
}

/**
 * Create blood splatter on the ground (stationary, long-lasting)
 */
function createBloodSplatter(x, y, count = 20) {
    const bloodColors = ['#8B0000', '#990000', '#A00000', '#800000', '#700000', '#660000'];
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const initialSpeed = Math.random() * 3 + 1;
        game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * initialSpeed,
            vy: Math.sin(angle) * initialSpeed,
            life: 30000,
            maxLife: 30000,
            color: bloodColors[Math.floor(Math.random() * bloodColors.length)],
            size: Math.random() * 5 + 2,
            isSplatter: false,
            useDecay: false,
            deceleration: 0.15
        });
    }
}

/**
 * Create boomer explosion effect - damages both player and nearby zombies
 */
function createBoomerExplosion(x, y) {
    const explosionRadius = 100;
    const explosionDamage = 15;
    
    // Create explosion visual effect (green themed)
    game.explosions.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: explosionRadius,
        life: 400,
        maxLife: 400,
        damage: explosionDamage,
        startTime: game.time,
        isBoomer: true,
        color: '#44ff44',
        damagedZombies: new Set()
    });

    // Create green explosion particles
    for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 / 30) * i;
        game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * (Math.random() * 6 + 3),
            vy: Math.sin(angle) * (Math.random() * 6 + 3),
            life: 500,
            maxLife: 500,
            color: Math.random() > 0.5 ? '#44ff44' : '#88ff00',
            size: Math.random() * 5 + 3
        });
    }
    
    // Play explosion sound
    SoundEngine.playExplosion(explosionRadius);

    triggerShake(explosionDamage);
}

/**
 * Update explosions
 */
function updateExplosions(deltaTime) {
    for (let i = game.explosions.length - 1; i >= 0; i--) {
        const explosion = game.explosions[i];
        explosion.life -= deltaTime;
        const lifeRatio = explosion.life / explosion.maxLife;
        explosion.radius = explosion.maxRadius * (1 - lifeRatio);
        explosion.fadeAlpha = lifeRatio;

        // Play explosion sound once when it starts (avoid repeated sounds)
        if (explosion.radius > 0 && !explosion.soundPlayed) {
            explosion.soundPlayed = true;
            SoundEngine.playExplosion(explosion.maxRadius);
        }

        // Apply damage to nearby zombies (once per zombie per explosion)
        if (explosion.radius > 0) {
            for (let j = game.zombies.length - 1; j >= 0; j--) {
                const zombie = game.zombies[j];
                const dx = explosion.x - zombie.x;
                const dy = explosion.y - zombie.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < explosion.radius + zombie.width / 2 && !explosion.damagedZombies.has(zombie)) {
                    explosion.damagedZombies.add(zombie);
                    const killed = zombie.takeDamage(explosion.damage);
                    if (killed) {
                        game.zombies.splice(j, 1);
                    }
                }
            }
        }

        // Boomer explosions also damage the player
        if (explosion.isBoomer && explosion.radius > 0) {
            const dx = explosion.x - game.player.x;
            const dy = explosion.y - game.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < explosion.radius + 10) {
                game.player.takeDamage(explosion.damage);
            }
        }

        // Explosions damage barrels (chain reactions)
        if (explosion.radius > 0 && game.barrels) {
            for (const barrel of game.barrels) {
                if (barrel.isExploding) continue;
                const dx = explosion.x - barrel.x;
                const dy = explosion.y - barrel.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < explosion.radius + Math.max(barrel.width, barrel.height) / 2) {
                    barrel.takeDamage(explosion.damage);
                }
            }
        }

        if (explosion.life <= 0) {
            game.explosions.splice(i, 1);
        }
    }
}

/**
 * Update particles
 */
function updateParticles(deltaTime) {
    const timeScale = deltaTime / 16.67;
    for (let i = game.particles.length - 1; i >= 0; i--) {
        const particle = game.particles[i];
        
        // Splatter particles are stationary - don't move them
        if (!particle.isSplatter) {
            particle.x += particle.vx * timeScale;
            particle.y += particle.vy * timeScale;
            
            // Apply acceleration if present (for blood deceleration)
            if (particle.deceleration !== undefined) {
                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                
                // Decelerate by opposing the direction of motion
                if (speed > 0.01) {
                    const nx = particle.vx / speed;
                    const ny = particle.vy / speed;
                    
                    particle.vx -= nx * particle.deceleration * timeScale;
                    particle.vy -= ny * particle.deceleration * timeScale;
                }
                
                // Check if velocity is near zero - settle into splatter
                if (speed < 0.1) {
                    particle.vx = 0;
                    particle.vy = 0;
                    particle.isSplatter = true;
                }
            } else if (particle.useDecay !== false) {
                // Exponential decay based on deltaTime for framerate independence
                const decayFactor = Math.pow(0.95, deltaTime / 16.67);
                particle.vx *= decayFactor;
                particle.vy *= decayFactor;
            }

            // Shell-specific physics: friction and rotation
            if (particle.isShell) {
                const friction = particle.friction || 0.95;
                const settleThreshold = 0.05;

                // Check if shell has mostly settled
                const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                const rotSpeed = Math.abs(particle.rotationSpeed || 0);

                if (speed < settleThreshold && rotSpeed < 0.01) {
                    // Fully settled — stop all motion and rotation
                    particle.vx = 0;
                    particle.vy = 0;
                    particle.rotationSpeed = 0;
                } else {
                    // Friction on translation (same in all directions)
                    particle.vx *= Math.pow(friction, timeScale);
                    particle.vy *= Math.pow(friction, timeScale);
                    // Friction on rotation
                    particle.rotationSpeed *= Math.pow(friction, timeScale);
                    particle.rotation += (particle.rotationSpeed || 0) * timeScale;
                }
            }
        }
        
        particle.life -= deltaTime;

        if (particle.life <= 0) {
            game.particles.splice(i, 1);
        }
    }
}

/**
 * Update pickups
 */
function updatePickups(deltaTime) {
    for (let i = game.pickups.length - 1; i >= 0; i--) {
        const pickup = game.pickups[i];
        const alive = pickup.update(deltaTime);

        if (!alive) {
            game.pickups.splice(i, 1);
            continue;
        }

        // Check if player collects pickup
        const dx = pickup.x - game.player.x;
        const dy = pickup.y - game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < pickup.size + game.player.width / 2) {
            pickup.collect(game.player);
            game.pickups.splice(i, 1);
        }
    }
}

/**
 * Update UI elements
 */
function updateUI() {
    const player = game.player;
    const weapon = player.weapons[player.weaponIndex];

    // Update HUD
    const hud = document.getElementById('hud');
    hud.innerHTML = `
        <div>HEALTH: ${Math.max(0, Math.floor(player.health))}/${player.maxHealth}</div>
        <div>WAVE: ${game.wave}</div>
        <div>ZOMBIES LEFT: ${game.zombiesToSpawn + game.zombies.length}</div>
    `;

    // Update weapon info
    const weaponInfo = document.getElementById('weaponInfo');
    const isReloading = weapon.reloading;
    const reloadProgress = isReloading ? Math.floor((1 - weapon.reloadTimer / weapon.reloadTime) * 100) : 0;

    let weaponListHTML = `
        <div style="color: ${weapon.color}; font-weight: bold;">${weapon.name}</div>
        <div>AMMO: <span style="color:#fff;">${weapon.currentAmmo}</span>/<span style="color:#aaa;">${weapon.clipSize}</span>  <span style="color:#888;">| RESERVE: ${weapon.reserveAmmo}</span></div>
        ${isReloading ? `<div style="color: #ffaa00; font-size: 12px;">RELOADING ${reloadProgress}%</div><div style="background:#333;width:120px;height:6px;margin:2px 0;display:inline-block;"><div style="background:#ffaa00;width:${reloadProgress}%;height:100%;"></div></div>` : ''}
        <div style="font-size: 11px; color: #aaa;">${weapon.description}</div>
        <div style="font-size: 11px; color: #aaa;">DMG: ${weapon.damage} | RATE: ${1000/weapon.fireRate}/s</div>
        <div style="margin-top: 6px; font-size: 11px; color: #888;">— weapons —</div>
    `;
    player.weapons.forEach((w, i) => {
        const isActive = i === player.weaponIndex;
        weaponListHTML += `<div class="weapon-list-item${isActive ? ' active' : ''}" style="color: ${isActive ? w.color : '#aaa'};">${isActive ? '► ' : '  '}${w.name}</div>`;
    });
    weaponInfo.innerHTML = weaponListHTML;

    // Update kill counter
    document.getElementById('killCounter').textContent = `KILLS: ${game.kills}`;
}

/**
 * Draw all game elements
 */
function drawGame() {
    const ctx = game.ctx;

    // Apply screen shake offset
    if (!game.paused) {
        const shakeX = (Math.random() - 0.5) * 2 * Math.min(game.shake.intensity, 8);
        const shakeY = (Math.random() - 0.5) * 2 * Math.min(game.shake.intensity, 8);
        game.camera.x += shakeX;
        game.camera.y += shakeY;
    }

    // Clear and draw background
    drawBackground();

    // Draw blood splatter and shell casings (underneath everything)
    game.particles.forEach(particle => {
        const screenX = particle.x - game.camera.x;
        const screenY = particle.y - game.camera.y;
        const lifeRatio = particle.life / particle.maxLife;

        if (particle.isSplatter) {
            const splatterAlpha = Math.max(0.3, lifeRatio);
            const displaySize = particle.size * 1.5;
            ctx.globalAlpha = splatterAlpha;
            ctx.fillStyle = particle.color;
            ctx.fillRect(screenX - displaySize/2, screenY - displaySize/2, displaySize, displaySize);
            ctx.globalAlpha = 1;
        } else if (particle.isShell) {
            ctx.globalAlpha = lifeRatio;
            ctx.fillStyle = particle.color;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(particle.rotation);
            const w = particle.shellWidth || 3;
            const h = particle.shellHeight || 6;
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.restore();
            ctx.globalAlpha = 1;
        }
    });

    // Draw pickups
    game.pickups.forEach(pickup => pickup.draw(ctx));

    // Draw barrels
    if (game.barrels) {
        game.barrels.forEach(barrel => barrel.draw(ctx));
    }

    // Draw zombies
    game.zombies.forEach(zombie => zombie.draw(ctx));

    // Draw player
    game.player.draw(ctx);

    // Draw NPCs
    game.npcs.forEach(npc => npc.draw(ctx));

    // Draw low-layer particles (behind bullets)
    game.particles.forEach(particle => {
        if (!particle.isSplatter && !particle.isShell && (particle.layer ?? 2) < 2) {
            const screenX = particle.x - game.camera.x;
            const screenY = particle.y - game.camera.y;
            const lifeRatio = particle.life / particle.maxLife;

            ctx.globalAlpha = lifeRatio;
            ctx.fillStyle = particle.color;
            ctx.fillRect(screenX - particle.size/2, screenY - particle.size/2, particle.size, particle.size);
            ctx.globalAlpha = 1;
        }
    });

    // Draw bullets
    game.bullets.forEach(bullet => {
        const screenX = bullet.x - game.camera.x;
        const screenY = bullet.y - game.camera.y;

        ctx.fillStyle = bullet.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, bullet.size, 0, Math.PI * 2);
        ctx.fill();

        // Bullet trail
        ctx.fillStyle = bullet.color + '44';
        ctx.beginPath();
        ctx.arc(screenX - bullet.vx, screenY - bullet.vy, bullet.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw high-layer particles (on top of everything)
    game.particles.forEach(particle => {
        if (!particle.isSplatter && !particle.isShell && (particle.layer ?? 2) >= 2) {
            const screenX = particle.x - game.camera.x;
            const screenY = particle.y - game.camera.y;
            const lifeRatio = particle.life / particle.maxLife;

            ctx.globalAlpha = lifeRatio;
            ctx.fillStyle = particle.color;
            ctx.fillRect(screenX - particle.size/2, screenY - particle.size/2, particle.size, particle.size);
            ctx.globalAlpha = 1;
        }
    });

    // Draw explosions
    game.explosions.forEach(explosion => {
        const screenX = explosion.x - game.camera.x;
        const screenY = explosion.y - game.camera.y;

        const isBoomer = explosion.isBoomer;
        const alpha = Math.max(0, explosion.fadeAlpha);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = isBoomer ? '#44ff44' : '#ff6600';
        ctx.beginPath();
        ctx.arc(screenX, screenY, explosion.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = isBoomer ? '#88ff00' : '#ffff00';
        ctx.beginPath();
        ctx.arc(screenX, screenY, explosion.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    if (!game.paused) {
        // Draw aiming line from gun barrel to crosshair (fades near crosshair)
        const playerScreenX = game.player.x - game.camera.x;
        const playerScreenY = game.player.y - game.camera.y;
        const gunTipX = playerScreenX + Math.cos(game.player.facing) * 25;
        const gunTipY = playerScreenY + Math.sin(game.player.facing) * 25;
        const cx = game.mouseX - (CONFIG.CURSOR_SIZE / 2);
        const cy = game.mouseY - (CONFIG.CURSOR_SIZE / 2);
        const maxAlpha = 0.1;
        const segments = 30;
        const dx = (cx - gunTipX) / segments;
        const dy = (cy - gunTipY) / segments;
        ctx.lineWidth = 1;
        for (let i = 0; i < segments; i++) {
            const t = i / segments;
            const alpha = maxAlpha * (1 - t); // 0 at crosshair, maxAlpha at gun
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(gunTipX + dx * i, gunTipY + dy * i);
            ctx.lineTo(gunTipX + dx * (i + 1), gunTipY + dy * (i + 1));
            ctx.stroke();
        }

        // Draw crosshair - offset based on CURSOR_SIZE to center on actual cursor hotspot
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, (CONFIG.CURSOR_SIZE * 1.5), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - (CONFIG.CURSOR_SIZE * 2), cy);
        ctx.lineTo(cx + (CONFIG.CURSOR_SIZE * 2), cy);
        ctx.moveTo(cx, cy - (CONFIG.CURSOR_SIZE * 2));
        ctx.lineTo(cx, cy + (CONFIG.CURSOR_SIZE * 2));
        ctx.stroke();

        const currentWeapon = game.player.weapons[game.player.weaponIndex];
        const ammoOffset = CONFIG.CURSOR_SIZE * 3;

        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textBaseline = 'middle';

        // Draw health to the left of the crosshair
        const healthText = `${Math.max(0, Math.floor(game.player.health))}`;
        ctx.textAlign = 'right';
        ctx.fillText(healthText, cx - ammoOffset, cy);

        // Draw ammo count to the right of the crosshair
        const ammoText = `${currentWeapon.currentAmmo}`;
        ctx.textAlign = 'left';
        ctx.fillText(ammoText, cx + ammoOffset, cy);

        // Draw reserve ammo below the clip display
        ctx.font = '12px "Courier New", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(currentWeapon.reserveAmmo, cx + ammoOffset, cy + 12);

        // Draw ammo / reload circle around crosshair
        const circleRadius = CONFIG.CURSOR_SIZE * 2;
        // Background circle (empty)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
        if (currentWeapon.reloading) {
            // Reload progress
            const reloadRatio = 1 - (currentWeapon.reloadTimer / currentWeapon.reloadTime);
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, circleRadius, -Math.PI / 2, -Math.PI / 2 + reloadRatio * Math.PI * 2);
            ctx.stroke();
        } else {
            // Ammo clip fill
            const clipRatio = currentWeapon.currentAmmo / currentWeapon.clipSize;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, circleRadius, -Math.PI / 2, -Math.PI / 2 + clipRatio * Math.PI * 2);
            ctx.stroke();
        }
    }
}

/**
 * Main game loop
 */
function gameLoop(timestamp) {
    if (!game.running) return;

    if (game.lastFrameTime === 0) {
        game.lastFrameTime = timestamp;
    }

    let deltaTime = timestamp - game.lastFrameTime;
    game.lastFrameTime = timestamp;

    if (game.paused) {
        game.deltaTime = 0;
        drawGame();
        drawPauseScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    game.deltaTime = deltaTime;
    game.time += deltaTime;

    // Cap deltaTime to prevent spiral of death on lag spikes
    if (deltaTime > 100) {
        deltaTime = 100;
        game.time -= 100;
    }

    // Update player
    game.player.update(deltaTime);

    // Update NPCs
    game.npcs.forEach(npc => npc.update(deltaTime));

    // Update camera
    updateCamera();

    // Spawn zombies in groups
    if (game.time - game.lastZombieSpawn > CONFIG.ZOMBIE_SPAWN_INTERVAL && game.zombiesToSpawn > 0) {
        const zombieSpawnGroupMin = CONFIG.ZOMBIE_SPAWN_GROUP_MIN + game.wave - 1;
        const zombieSpawnGroupMax = CONFIG.ZOMBIE_SPAWN_GROUP_MAX + game.wave - 1;
        const groupSize = Math.floor(Math.random() * (zombieSpawnGroupMax - zombieSpawnGroupMin + 1)) + zombieSpawnGroupMin;
        const actualSpawn = Math.min(groupSize, game.zombiesToSpawn);
        for (let i = 0; i < actualSpawn; i++) {
            const spawnedZombie = spawnZombie();
            if (spawnedZombie) {
                game.zombiesToSpawn -= 1;
            } else {
                break;
            }
        }
        game.lastZombieSpawn = game.time;
    }

    // Check if wave is complete
    if (game.zombiesToSpawn <= 0 && game.zombies.length === 0) {
        game.wave++;
        game.zombiesToSpawn = CONFIG.INITIAL_ZOMBIE_COUNT + CONFIG.INCREASED_ZOMBIES_PER_WAVE * (game.wave - 1);
        CONFIG.ZOMBIE_SPAWN_INTERVAL = Math.max(1000, 3000 - game.wave * 100);
        spawnBarrels();
        spawnNPC();
    }

    // Spawn pickups
    if (game.time - game.lastPickupSpawn > CONFIG.PICKUP_SPAWN_INTERVAL) {
        spawnPickup();
        game.lastPickupSpawn = game.time;
    }

    // Update entities with deltaTime
    game.zombies.forEach(zombie => zombie.update(deltaTime));
    updateBullets(deltaTime);
    updateExplosions(deltaTime);
    updateParticles(deltaTime);
    updatePickups(deltaTime);

    // Update barrels
    if (game.barrels) {
        for (let i = game.barrels.length - 1; i >= 0; i--) {
            if (!game.barrels[i].update(deltaTime)) {
                game.barrels.splice(i, 1);
            }
        }
    }

    // Draw everything
    drawGame();

    // Update UI
    updateUI();

    // Update shake
    updateShake();

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

/**
 * Handle game over
 */
function gameOver() {
    game.running = false;

    document.getElementById('finalScore').textContent = `Zombies Killed: ${game.kills}`;
    document.getElementById('finalWave').textContent = `Wave Reached: ${game.wave}`;
    document.getElementById('gameOverScreen').style.display = 'flex';
}

/**
 * Restart game
 */
function restartGame() {
    initGame();
}

// ============================================
// EVENT LISTENERS
// ============================================
/**
 * Draw pause screen overlay
 */
function drawPauseScreen() {
    const ctx = game.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.fillStyle = '#e94560';
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = '20px "Courier New", monospace';
    ctx.fillText('Press ESC to resume', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 30);
}

document.getElementById('startBtn').addEventListener('click', initGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);
