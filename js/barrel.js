/**
 * Barrel class - explosive environmental hazard
 * Stationary objects that explode when destroyed, damaging nearby zombies and players
 */
class Barrel {
    constructor(x, y, health) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 28;
        this.health = health;
        this.maxHealth = health;
        this.isExploding = false;
        this.explosionTimer = 0;
        this.explosionRadius = 120;
        this.explosionDamage = 25;
    }

    update(deltaTime) {
        if (this.isExploding) {
            this.explosionTimer -= deltaTime;
            if (this.explosionTimer <= 0) {
                return false; // Barrel destroyed
            }
        }
        return true; // Barrel still exists
    }

    takeDamage(amount) {
        this.health -= amount;

        // Create hit particles
        for (let i = 0; i < 3; i++) {
            game.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 200,
                maxLife: 200,
                color: '#ffaa00',
                size: 2
            });
        }

        if (this.health <= 0 && !this.isExploding) {
            this.isExploding = true;
            this.explosionTimer = 300; // 300ms explosion animation

            // Create explosion effect
            createExplosion(this.x, this.y, this.explosionRadius, this.explosionDamage);
            SoundEngine.playExplosion(this.explosionRadius);

            // Create smoke particles
            for (let i = 0; i < 15; i++) {
                const angle = (Math.PI * 2 / 15) * i;
                game.particles.push({
                    x: this.x,
                    y: this.y,
                    vx: Math.cos(angle) * (Math.random() * 4 + 2),
                    vy: Math.sin(angle) * (Math.random() * 4 + 2),
                    life: 600,
                    maxLife: 600,
                    color: '#555555',
                    size: Math.random() * 6 + 4
                });
            }
        }
    }

    draw(ctx) {
        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;

        // Skip if off screen
        if (screenX < -35 || screenX > CONFIG.CANVAS_WIDTH + 35 ||
            screenY < -35 || screenY > CONFIG.CANVAS_HEIGHT + 35) {
            return;
        }

        // Draw explosion flash
        if (this.isExploding) {
            const flashAlpha = this.explosionTimer / 300;
            ctx.globalAlpha = flashAlpha;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        if (!this.isExploding) {
            // Draw barrel body (dark red)
            const healthPercent = this.health / this.maxHealth;
            const barrelColor = healthPercent > 0.5 ? '#8B0000' : '#6B0000';
            ctx.fillStyle = barrelColor;
            ctx.fillRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

            // Draw barrel top (slightly lighter)
            ctx.fillStyle = '#A00000';
            ctx.fillRect(screenX - this.width / 2 + 2, screenY - this.height / 2 + 2, this.width - 4, this.height / 3);

            // Draw rope detail (two horizontal lines)
            ctx.strokeStyle = '#4A0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(screenX - this.width / 2 + 2, screenY - 2);
            ctx.lineTo(screenX + this.width / 2 - 2, screenY - 2);
            ctx.moveTo(screenX - this.width / 2 + 2, screenY + 4);
            ctx.lineTo(screenX + this.width / 2 - 2, screenY + 4);
            ctx.stroke();

            // Draw border
            ctx.strokeStyle = '#3D0000';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX - this.width / 2, screenY - this.height / 2, this.width, this.height);

            // Draw health bar if damaged
            if (healthPercent < 1) {
                const healthBarWidth = 24;
                ctx.fillStyle = '#333333';
                ctx.fillRect(screenX - healthBarWidth / 2, screenY - this.height / 2 - 8, healthBarWidth, 3);
                ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
                ctx.fillRect(screenX - healthBarWidth / 2, screenY - this.height / 2 - 8, healthBarWidth * healthPercent, 3);
            }
        }
    }
}

/**
 * Spawn explosive barrels at random positions in the arena
 * Called at the start of each wave
 */
function spawnBarrels() {
    const count = Math.floor(Math.random() * (CONFIG.BARRELS_PER_WAVE_MAX - CONFIG.BARRELS_PER_WAVE_MIN + 1)) + CONFIG.BARRELS_PER_WAVE_MIN;
    const minHealth = CONFIG.BARREL_HEALTH_MIN;
    const maxHealth = CONFIG.BARREL_HEALTH_MAX;

    for (let i = 0; i < count; i++) {
        // Random position within arena (50px margin from edges)
        const x = Math.random() * (game.worldWidth - 100) + 50;
        const y = Math.random() * (game.worldHeight - 100) + 50;
        const health = Math.floor(Math.random() * (maxHealth - minHealth + 1)) + minHealth;
        game.barrels.push(new Barrel(x, y, health));
    }
}
