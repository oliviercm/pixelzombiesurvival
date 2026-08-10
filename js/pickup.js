/**
 * Pickup class - health and ammo powerups
 */
class Pickup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = CONFIG.PICKUP_SIZE;
        this.life = CONFIG.PICKUP_LIFETIME;
        this.maxLife = CONFIG.PICKUP_LIFETIME;
        this.bobOffset = Math.random() * Math.PI * 2;
        this.bobTime = 0;
        // Randomly assign type: health or ammo
        this.type = Math.random() > 0.7 ? 'health' : 'ammo';
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.bobTime += deltaTime;
        return this.life > 0;
    }

    draw(ctx) {
        const screenX = this.x - game.camera.x;
        const screenY = this.y - game.camera.y;

        // Skip if off screen
        if (screenX < -20 || screenX > CONFIG.CANVAS_WIDTH + 20 ||
            screenY < -20 || screenY > CONFIG.CANVAS_HEIGHT + 20) {
            return;
        }

        // Bobbing animation (framerate independent)
        const bob = Math.sin(this.bobTime / 300 + this.bobOffset) * 3;

        // Fade out when expiring
        const alpha = Math.min(1, this.life / 3000);

        ctx.globalAlpha = alpha;

        if (this.type === 'health') {
            // Draw health pickup - green square with white cross (plus sign)
            const s = this.size;
            const half = s / 2;
            const crossThickness = 4;

            // Green square background
            ctx.fillStyle = '#00cc00';
            ctx.fillRect(screenX - half, screenY - half + bob, s, s);

            // White cross (plus sign) - vertical bar
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(screenX - crossThickness/2, screenY - half + 2 + bob, crossThickness, s - 4);

            // White cross - horizontal bar
            ctx.fillRect(screenX - half + 2, screenY - crossThickness/2 + bob, s - 4, crossThickness);

            // Subtle border for definition
            ctx.strokeStyle = '#006600';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX - half, screenY - half + bob, s, s);
        } else {
            // Draw ammo pickup - rectangle with yellow and orange vertical stripes (bullet look)
            const s = this.size;
            const half = s / 2;
            const stripeWidth = 4;
            const numStripes = Math.floor(s / stripeWidth);

            // Darker background for contrast
            ctx.fillStyle = '#cc8800';
            ctx.fillRect(screenX - half, screenY - half + bob, s, s);

            // Draw alternating yellow and orange vertical stripes
            for (let i = 0; i < numStripes; i++) {
                const stripeX = screenX - half + i * stripeWidth;
                ctx.fillStyle = i % 2 === 0 ? '#ffff00' : '#ff8800';
                ctx.fillRect(stripeX, screenY - half + bob, stripeWidth, s);
            }

            // Subtle border for definition
            ctx.strokeStyle = '#aa6600';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX - half, screenY - half + bob, s, s);
        }

        ctx.globalAlpha = 1;
    }

    collect(player) {
        // Play pickup sound
        SoundEngine.playPickup(this.type);

        if (this.type === 'health') {
            player.health = Math.min(player.maxHealth, player.health + Math.floor(player.maxHealth * CONFIG.HEALTH_PICKUP_PERCENT / 100));
            return true;
        } else {
            // Add 10% of max ammo to reserve for every weapon
            const ammoPerWeapon = Math.floor(CONFIG.AMMO_PICKUP_PERCENT / 100 * 10); // 10%
            player.weapons.forEach(w => {
                w.reserveAmmo += ammoPerWeapon;
            });
            // Cancel reload if one is in progress — fill clip from reserve
            if (player.reloading) {
                player.reloading = false;
                player.reloadTimer = 0;
                const weapon = player.weapons[player.weaponIndex];
                const needed = weapon.clipSize - weapon.currentAmmo;
                const available = Math.min(needed, weapon.reserveAmmo);
                weapon.currentAmmo += available;
                weapon.reserveAmmo -= available;
            }
            return true;
        }
    }
}
