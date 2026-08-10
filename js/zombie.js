/**
 * Zombie class - AI enemy that chases the player
 */
class Zombie {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        
        // Get zombie type configuration
        const zombieConfig = ZombieTypes[type] || ZombieTypes.normal;
        
        // Apply size from configuration (boomer is larger)
        if (zombieConfig.size) {
            this.width = CONFIG.ZOMBIE_SIZE * zombieConfig.size;
            this.height = CONFIG.ZOMBIE_SIZE * zombieConfig.size;
        } else {
            this.width = CONFIG.ZOMBIE_SIZE;
            this.height = CONFIG.ZOMBIE_SIZE;
        }
        
        // Apply stats from configuration
        this.speed = zombieConfig.speed;
        const healthVariation = 0.8 + Math.random() * 0.4;
        this.health = Math.round(zombieConfig.health * healthVariation);
        this.maxHealth = this.health;
        this.damage = zombieConfig.damage;
        this.colors = zombieConfig.colors;
        
        this.hitTimer = 0;
        this.attackCooldown = 1000;
        this.lastAttack = 0;
    }

    update(deltaTime) {
        // Find closest target (player or NPC)
        let closestTarget = game.player;
        let closestDist = Math.sqrt((game.player.x - this.x) ** 2 + (game.player.y - this.y) ** 2);

        for (const npc of game.npcs) {
            const dist = Math.sqrt((npc.x - this.x) ** 2 + (npc.y - this.y) ** 2);
            if (dist < closestDist) {
                closestDist = dist;
                closestTarget = npc;
            }
        }

        // Move toward closest target (speed is pixels per second)
        const timeScale = deltaTime / 16.67;
        const dx = closestTarget.x - this.x;
        const dy = closestTarget.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * timeScale;
            this.y += (dy / distance) * this.speed * timeScale;
        }

        // Prevent clipping into the target
        const minDist = (closestTarget.width + this.width) / 2;
        if (distance < minDist && distance > 0) {
            const nx = dx / distance;
            const ny = dy / distance;
            this.x = closestTarget.x - nx * minDist;
            this.y = closestTarget.y - ny * minDist;
        }

        // Attack target if close enough
        if (distance < 25) {
            const now = Date.now();
            if (now - this.lastAttack > this.attackCooldown) {
                if (closestTarget.takeDamage(this.damage)) {
                    this.lastAttack = now;
                }
            }
        }

        // Hit flash timer
        if (this.hitTimer > 0) {
            this.hitTimer -= deltaTime;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitTimer = 100;

        // Create hit particles
        for (let i = 0; i < 3; i++) {
            game.particles.push({
                x: this.x,
                y: this.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 200,
                maxLife: 200,
                color: this.colors.hitParticle,
                size: 2
            });
        }

        if (this.health <= 0) {
            // Create death particles (color based on zombie type)
            for (let i = 0; i < 10; i++) {
                game.particles.push({
                    x: this.x,
                    y: this.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 500,
                    maxLife: 500,
                    color: this.colors.deathParticle,
                    size: 3
                });
            }
            
            // Create blood splatter on the ground (stationary, long-lasting)
            createBloodSplatter(this.x, this.y, 20);
            
            // Boomer explodes on death - damages nearby zombies and player
            if (this.type === 'boomer') {
                createBoomerExplosion(this.x, this.y);
            }
            
            // Play zombie death sound
            SoundEngine.playZombieDeath();
            
            game.kills++;
            return true; // Zombie died
        }
        return false; // Zombie survived
    }

    draw(ctx) {
        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;

        // Skip if off screen
        if (screenX < -50 || screenX > CONFIG.CANVAS_WIDTH + 50 ||
            screenY < -50 || screenY > CONFIG.CANVAS_HEIGHT + 50) {
            return;
        }

        // Draw zombie body (color based on type)
        const bodyColor = this.hitTimer > 0 ? '#ffffff' : this.colors.body;
        ctx.fillStyle = bodyColor;
        ctx.fillRect(screenX - this.width/2, screenY - this.height/2, this.width, this.height);

        // Draw zombie head
        const headColor = this.hitTimer > 0 ? '#ffffff' : this.colors.head;
        ctx.fillStyle = headColor;
        ctx.fillRect(screenX - 7, screenY - this.height/2 - 10, 14, 12);

        // Draw eyes
        ctx.fillStyle = this.colors.eyes;
        ctx.fillRect(screenX - 5, screenY - this.height/2 - 7, 3, 3);
        ctx.fillRect(screenX + 2, screenY - this.height/2 - 7, 3, 3);

        // Draw health bar
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = '#333333';
        ctx.fillRect(screenX - 12, screenY - this.height/2 - 16, 24, 3);
        ctx.fillStyle = this.colors.healthBar;
        ctx.fillRect(screenX - 12, screenY - this.height/2 - 16, 24 * healthPercent, 3);
    }
}
