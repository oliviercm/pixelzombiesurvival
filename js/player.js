// ============================================
// ENTITY CLASSES
// ============================================

/**
 * Player class - handles movement, health, and weapon management
 */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.health = CONFIG.PLAYER_HEALTH;
        this.maxHealth = CONFIG.PLAYER_HEALTH;
        this.weaponIndex = 0;
        this.weapons = WEAPONS.map(w => ({...w, currentAmmo: w.clipSize, reserveAmmo: w.ammo, reloading: false, reloadTimer: 0}));
        this.lastShot = 0;
        this.invincibleTimer = 0;
        this.facing = 0; // angle in radians
    }

    update(deltaTime) {
        // Movement with WASD (speed is pixels per second)
        const timeScale = deltaTime / 16.67;
        let dx = 0;
        let dy = 0;

        if (keys['KeyW'] || keys['ArrowUp']) dy -= CONFIG.PLAYER_SPEED;
        if (keys['KeyS'] || keys['ArrowDown']) dy += CONFIG.PLAYER_SPEED;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= CONFIG.PLAYER_SPEED;
        if (keys['KeyD'] || keys['ArrowRight']) dx += CONFIG.PLAYER_SPEED;

        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Apply movement scaled by deltaTime
        dx *= timeScale;
        dy *= timeScale;

        // Apply movement with world bounds
        this.x = Math.max(this.width, Math.min(game.worldWidth - this.width, this.x + dx));
        this.y = Math.max(this.height, Math.min(game.worldHeight - this.height, this.y + dy));

        // Update facing direction based on mouse (with offset to correct for size of cursor and crosshair placement)
        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;
        this.facing = Math.atan2(game.mouseY - screenY - (CONFIG.CURSOR_SIZE / 2), game.mouseX - screenX - (CONFIG.CURSOR_SIZE / 2));

        // Handle weapon switching
        if (keys['KeyQ']) {
            keys['KeyQ'] = false; // Reset to prevent rapid cycling
            this.weaponIndex = (this.weaponIndex - 1 + this.weapons.length) % this.weapons.length;
            SoundEngine.playChangeWeapon();
        }
        if (keys['KeyE']) {
            keys['KeyE'] = false;
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            SoundEngine.playChangeWeapon();
        }

        // Reload - press R
        if (keys[CONFIG.RELOAD_KEY]) {
            keys[CONFIG.RELOAD_KEY] = false;
            this.reload();
        }

        // Update reload timer for the currently equipped weapon only
        const currentWeapon = this.weapons[this.weaponIndex];

        // Shooting - respond to both spacebar and mouse click (blocked while reloading)
        if ((keys['Space'] || game.mouseClick) && !currentWeapon.reloading) {
            this.shoot();
        }
        if (currentWeapon.reloading) {
            currentWeapon.reloadTimer -= deltaTime;
            if (currentWeapon.reloadTimer <= 0) {
                currentWeapon.reloadTimer = 0;
                currentWeapon.reloading = false;
                const needed = currentWeapon.clipSize - currentWeapon.currentAmmo;
                const available = Math.min(needed, currentWeapon.reserveAmmo);
                currentWeapon.currentAmmo += available;
                currentWeapon.reserveAmmo -= available;
            }
        }

        // Invincibility timer
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= deltaTime;
        }
    }

    reload() {
        const weapon = this.weapons[this.weaponIndex];
        if (weapon.currentAmmo >= weapon.clipSize) return; // clip already full
        if (weapon.reserveAmmo <= 0) return; // no reserve ammo
        if (weapon.reloading) return; // already reloading
        weapon.reloading = true;
        weapon.reloadTimer = weapon.reloadTime;
    }

    shoot() {
        const weapon = this.weapons[this.weaponIndex];
        const now = Date.now();

        // Check if weapon has clip ammo and cooldown is ready
        if (weapon.currentAmmo <= 0 || now - this.lastShot < weapon.fireRate) return;

        // Deduct ammo
        weapon.currentAmmo--;
        this.lastShot = now;

        // Play weapon-specific shoot sound
        SoundEngine.playShoot(getWeaponType(weapon));

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
                weaponType: getWeaponType(weapon) // for sound context
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
            SoundEngine.playPlayerDeath();
            gameOver();
        }
        return true;
    }

    draw(ctx) {
        // Draw player with invincibility flicker
        if (this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / 50) % 2 === 0) {
            return; // Skip drawing during invincibility flicker
        }

        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;

        // Draw player body (pixel style)
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(screenX - this.width/2, screenY - this.height/2, this.width, this.height);

        // Draw player head
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(screenX - 6, screenY - this.height/2 - 8, 12, 10);

        // Draw gun pointing in facing direction
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.facing);
        ctx.fillStyle = '#666666';
        ctx.fillRect(10, -3, 15, 6);
        ctx.restore();

        // Draw health bar above player
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#333333';
        ctx.fillRect(screenX - 15, screenY - this.height/2 - 18, 30, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
        ctx.fillRect(screenX - 15, screenY - this.height/2 - 18, 30 * healthPercent, 4);

        // Draw reload progress bar (below health bar)
        const currentWeapon = this.weapons[this.weaponIndex];
        if (currentWeapon.reloading) {
            const reloadProgress = 1 - (currentWeapon.reloadTimer / currentWeapon.reloadTime);
            ctx.fillStyle = '#333333';
            ctx.fillRect(screenX - 15, screenY - this.height/2 - 13, 30, 3);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(screenX - 15, screenY - this.height/2 - 13, 30 * reloadProgress, 3);
        }
    }
}
