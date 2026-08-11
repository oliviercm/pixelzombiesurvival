// ============================================
// ENTITY CLASSES
// ============================================

/**
 * Player class - handles movement, health, and weapon management
 */
class Player extends FightingCharacter {
    constructor(x, y) {
        super(x, y, CONFIG.PLAYER_HEALTH, CONFIG.PLAYER_HEALTH, CONFIG.PLAYER_SIZE, CONFIG.PLAYER_SIZE, WEAPONS);
        this.onDeath = () => gameOver();
    }

    update(deltaTime) {
        super.update(deltaTime);

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
            const prevIndex = this.weaponIndex;
            this.weaponIndex = (this.weaponIndex - 1 + this.weapons.length) % this.weapons.length;
            SoundEngine.playChangeWeapon();
            // Pause reload sound on the weapon we just left and accumulate elapsed time
            if (this.weapons[prevIndex].reloading) {
                const elapsed = SoundEngine.getReloadElapsed();
                this.weapons[prevIndex].reloadOffset += elapsed;
                SoundEngine.stopReload();
            }
            // Resume reload sound if the weapon we switched to was reloading
            if (this.weapons[this.weaponIndex].reloading && this.weapons[this.weaponIndex].reloadOffset > 0) {
                SoundEngine.playReload(this.weapons[this.weaponIndex].sound + '-reload', this.weapons[this.weaponIndex].reloadOffset);
            }
        }
        if (keys['KeyE']) {
            keys['KeyE'] = false;
            const prevIndex = this.weaponIndex;
            this.weaponIndex = (this.weaponIndex + 1) % this.weapons.length;
            SoundEngine.playChangeWeapon();
            // Pause reload sound on the weapon we just left and accumulate elapsed time
            if (this.weapons[prevIndex].reloading) {
                const elapsed = SoundEngine.getReloadElapsed();
                this.weapons[prevIndex].reloadOffset += elapsed;
                SoundEngine.stopReload();
            }
            // Resume reload sound if the weapon we switched to was reloading
            if (this.weapons[this.weaponIndex].reloading && this.weapons[this.weaponIndex].reloadOffset > 0) {
                SoundEngine.playReload(this.weapons[this.weaponIndex].sound + '-reload', this.weapons[this.weaponIndex].reloadOffset);
            }
        }

        // Reload - press R
        if (keys[CONFIG.RELOAD_KEY]) {
            keys[CONFIG.RELOAD_KEY] = false;
            this.reload();
        }

        // Update reload timer for the currently equipped weapon only
        const currentWeapon = this.weapons[this.weaponIndex];

        // Shooting - respond to both spacebar and mouse click (blocked while reloading, unless shotgun)
        if (keys['Space'] || game.mouseClick) {
            if (currentWeapon.reloading && currentWeapon.reloadOneAtATime && currentWeapon.currentAmmo > 0) {
                // Cancel reload and fire the remaining shell
                currentWeapon.reloading = false;
                currentWeapon.reloadTimer = 0;
                SoundEngine.stopReload();
                this.shoot();
            } else if (!currentWeapon.reloading) {
                this.shoot();
            }
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
                trail: weapon.trail || null,
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

        // Trigger screen shake
        triggerShake(weapon.shake || 1);

        // Emit shell casing from the weapon
        const shellDef = SHELL_TYPES[weapon.sound];
        if (shellDef) {
            // Shell ejects perpendicular to firing angle, slightly upward
            const ejectAngle = this.facing + Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            const shellOriginX = this.x + Math.cos(this.facing) * 18;
            const shellOriginY = this.y + Math.sin(this.facing) * 18;
            game.particles.push({
                x: shellOriginX,
                y: shellOriginY,
                vx: Math.cos(ejectAngle) * (Math.random() * 2 + 2),
                vy: Math.sin(ejectAngle) * (Math.random() * 2 + 2),
                life: 30000,
                maxLife: 30000,
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

    takeDamage(amount) {
        if (this.invincibleTimer > 0) return false;

        this.health -= amount;
        this.invincibleTimer = 200; // Brief invincibility window

        // Play damage sound
        SoundEngine.playDamage();

        // Show damage number
        spawnDamageNumber(this.x, this.y, amount, '#ff0000');

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


    }
}
