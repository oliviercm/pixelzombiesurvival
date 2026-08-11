// ============================================
// SHARED BASE CLASS & NPC
// ============================================

/**
 * FightingCharacter - base class for entities that can fight (player and NPCs)
 */
class FightingCharacter {
    constructor(x, y, health, maxHealth, width, height, weaponConfigs) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.health = health;
        this.maxHealth = maxHealth;
        this.weaponIndex = 0;
        this.weapons = weaponConfigs.map(w => ({...w, currentAmmo: w.clipSize, reserveAmmo: w.ammo, reloading: false, reloadTimer: 0, reloadOffset: 0, reloadOneAtATime: w.reloadOneAtATime, lastShot: 0}));
        this.invincibleTimer = 0;
        this.facing = 0;
        this.onDeath = null;
    }

    update(deltaTime) {
        // Update reload timer for the currently equipped weapon
        const currentWeapon = this.weapons[this.weaponIndex];

        if (currentWeapon.reloading) {
            currentWeapon.reloadTimer -= deltaTime;
            if (currentWeapon.reloadTimer <= 0) {
                currentWeapon.reloadTimer = 0;
                if (currentWeapon.reloadOneAtATime) {
                    const canAdd = Math.min(1, currentWeapon.reserveAmmo);
                    currentWeapon.currentAmmo += canAdd;
                    currentWeapon.reserveAmmo -= canAdd;
                    if (currentWeapon.currentAmmo < currentWeapon.clipSize && currentWeapon.reserveAmmo > 0) {
                        currentWeapon.reloadTimer = currentWeapon.reloadTime;
                        SoundEngine.playReload(currentWeapon.sound + '-reload');
                    } else {
                        currentWeapon.reloading = false;
                    }
                } else {
                    const needed = currentWeapon.clipSize - currentWeapon.currentAmmo;
                    const available = Math.min(needed, currentWeapon.reserveAmmo);
                    currentWeapon.currentAmmo += available;
                    currentWeapon.reserveAmmo -= available;
                    currentWeapon.reloading = false;
                }
            }
        }

        // Invincibility timer
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= deltaTime;
        }
    }

    shoot() {
        const weapon = this.weapons[this.weaponIndex];

        // If reloading one-at-a-time and there's a shell in the clip, cancel reload and fire
        if (weapon.reloading && weapon.reloadOneAtATime && weapon.currentAmmo > 0) {
            weapon.reloading = false;
            weapon.reloadTimer = 0;
            SoundEngine.stopReload();
        }

        // Auto-reload when clip is empty
        if (weapon.currentAmmo <= 0) {
            this.reload();
            return;
        }

        // Check if cooldown is ready
        if (game.time - weapon.lastShot < weapon.fireRate) return;

        // Deduct ammo
        weapon.currentAmmo--;
        weapon.lastShot = game.time;

        // Play weapon-specific shoot sound
        SoundEngine.playShoot(weapon.sound);

        // Create bullets based on weapon type
        for (let i = 0; i < weapon.bulletCount; i++) {
            const spreadAngle = (Math.random() - 0.5) * weapon.spread * 2;
            const angle = this.facing + spreadAngle;

            // Create bullet (origin at gun barrel tip)
            const bullet = {
                x: this.x + Math.cos(this.facing) * 25,
                y: this.y + Math.sin(this.facing) * 25,
                vx: Math.cos(angle) * weapon.bulletSpeed,
                vy: Math.sin(angle) * weapon.bulletSpeed,
                damage: weapon.damage,
                size: weapon.bulletSize,
                color: weapon.color,
                life: 3000, // bullets last 3 seconds
                explosionRadius: weapon.explosionRadius || 0,
                isExploding: false,
                sound: weapon.sound // for sound context
            };

            game.bullets.push(bullet);

            // Create muzzle flash particle (at gun barrel tip)
            for (let j = 0; j < 5; j++) {
                game.particles.push({
                    x: bullet.x,
                    y: bullet.y,
                    vx: Math.cos(angle) * (Math.random() * 4 + 2),
                    vy: Math.sin(angle) * (Math.random() * 4 + 2),
                    life: 150,
                    maxLife: 150,
                    color: '#ffff00',
                    size: 4
                });
            }
        }

        // Emit shell casing from the weapon
        const shellDef = SHELL_TYPES[weapon.sound];
        if (shellDef) {
            const ejectAngle = this.facing + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            const shellOriginX = this.x + Math.cos(this.facing) * 18;
            const shellOriginY = this.y + Math.sin(this.facing) * 18;
            game.particles.push({
                x: shellOriginX,
                y: shellOriginY,
                vx: Math.cos(ejectAngle) * (Math.random() * 2 + 2),
                vy: Math.sin(ejectAngle) * (Math.random() * 2 + 2),
                life: 4000,
                maxLife: 4000,
                color: shellDef.color,
                size: 1,
                isShell: true,
                shellWidth: shellDef.width,
                shellHeight: shellDef.height,
                rotation: this.facing + Math.PI / 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2,
                friction: 0.95
            });
        }
    }

    reload() {
        const weapon = this.weapons[this.weaponIndex];
        if (weapon.currentAmmo >= weapon.clipSize) return; // clip already full
        if (weapon.reserveAmmo <= 0) return; // no reserve ammo
        if (weapon.reloading) return; // already reloading
        weapon.reloading = true;
        weapon.reloadTimer = weapon.reloadTime;
        weapon.reloadOffset = 0;
        SoundEngine.playReload(weapon.sound + '-reload');
    }

    takeDamage(amount) {
        if (this.invincibleTimer > 0) return false;

        this.health -= amount;
        this.invincibleTimer = 200; // Brief invincibility window

        // Play damage sound
        SoundEngine.playDamage();

        // Create damage particles
        for (let i = 0; i < 5; i++) {
            game.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 300,
                maxLife: 300,
                color: '#ff0000',
                size: 3
            });
        }

        if (this.health <= 0) {
            if (this.onDeath) {
                this.onDeath();
            }
            return true;
        }
        return false;
    }
}

/**
 * NPC class - friendly AI companion that fights alongside the player
 */
class NPC extends FightingCharacter {
    constructor(x, y) {
        // Pick a random weapon with unlimited ammo
        const randomWeapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
        const weaponConfig = {
            ...randomWeapon,
            ammo: Infinity
        };
        super(x, y, CONFIG.NPC_HEALTH, CONFIG.NPC_HEALTH, CONFIG.NPC_SIZE, CONFIG.NPC_SIZE, [weaponConfig]);

        this.moveTimer = 0;
        this.targetX = x;
        this.targetY = y;
        this.onDeath = () => {
            const idx = game.npcs.indexOf(this);
            if (idx > -1) game.npcs.splice(idx, 1);
        };
    }

    update(deltaTime) {
        super.update(deltaTime);
        const timeScale = deltaTime / 16.67;

        // AI: Move toward target position
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);

        if (distToTarget > 5) {
            this.x += (dx / distToTarget) * CONFIG.NPC_SPEED * timeScale;
            this.y += (dy / distToTarget) * CONFIG.NPC_SPEED * timeScale;
        }

        // Keep within world bounds
        this.x = Math.max(this.width, Math.min(game.worldWidth - this.width, this.x));
        this.y = Math.max(this.height, Math.min(game.worldHeight - this.height, this.y));

        // AI: Pick a new target spot periodically
        this.moveTimer -= deltaTime;
        if (this.moveTimer <= 0) {
            this.pickNewTarget();
            this.moveTimer = CONFIG.NPC_MOVE_INTERVAL;
        }

        // AI: Find nearest zombie and shoot at it
        this.findAndShootAtNearestZombie();
    }

    pickNewTarget() {
        const player = game.player;
        const angle = Math.random() * Math.PI * 2;
        const distance = CONFIG.NPC_MIN_DISTANCE + Math.random() * (CONFIG.NPC_MAX_DISTANCE - CONFIG.NPC_MIN_DISTANCE);
        this.targetX = player.x + Math.cos(angle) * distance;
        this.targetY = player.y + Math.sin(angle) * distance;

        // Clamp to world bounds
        this.targetX = Math.max(this.width, Math.min(game.worldWidth - this.width, this.targetX));
        this.targetY = Math.max(this.height, Math.min(game.worldHeight - this.height, this.targetY));
    }

    findAndShootAtNearestZombie() {
        if (game.zombies.length === 0) return;

        let nearestZombie = null;
        let nearestDist = Infinity;

        for (const zombie of game.zombies) {
            const dzx = zombie.x - this.x;
            const dzy = zombie.y - this.y;
            const dist = Math.sqrt(dzx * dzx + dzy * dzy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestZombie = zombie;
            }
        }

        if (nearestZombie) {
            this.facing = Math.atan2(nearestZombie.y - this.y, nearestZombie.x - this.x);
            this.shoot();
        }
    }

    draw(ctx) {
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 50) % 2 === 0) {
            return; // Skip drawing during invincibility flicker
        }

        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;

        // Draw NPC body (green color to distinguish from player)
        ctx.fillStyle = '#55bb55';
        ctx.fillRect(screenX - this.width/2, screenY - this.height/2, this.width, this.height);

        // Draw NPC head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(screenX - 6, screenY - this.height/2 - 8, 12, 10);

        // Draw gun pointing in facing direction
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.facing);
        ctx.fillStyle = '#666666';
        ctx.fillRect(10, -3, 15, 6);
        ctx.restore();

        // Draw health bar above NPC
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#333333';
        ctx.fillRect(screenX - 15, screenY - this.height/2 - 18, 30, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(screenX - 15, screenY - this.height/2 - 18, 30 * healthPercent, 4);
    }
}
