// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    TARGET_FPS: 60,
    PLAYER_SPEED: 2,
    PLAYER_SIZE: 20,
    PLAYER_HEALTH: 100,
    ZOMBIE_SIZE: 20,
    PICKUP_SIZE: 12,
    PICKUP_SPAWN_INTERVAL: 10000,
    PICKUP_LIFETIME: 60000,
    MAX_PICKUPS: 5,
    INITIAL_ZOMBIE_COUNT: 10,
    ZOMBIE_SPAWN_INTERVAL: 5000,
    WAVE_DURATION: 60000,
    INCREASED_ZOMBIES_PER_WAVE: 5,
    MAX_ZOMBIES: 500,
    AMMO_PICKUP_PERCENT: 10,
    HEALTH_PICKUP_PERCENT: 15,
    CURSOR_SIZE: 8,
    ZOMBIE_SPAWN_GROUP_MIN: 2,
    ZOMBIE_SPAWN_GROUP_MAX: 4,
    BARRELS_PER_WAVE_MIN: 1,
    BARRELS_PER_WAVE_MAX: 3,
    BARREL_HEALTH_MIN: 30,
    BARREL_HEALTH_MAX: 50,
    RELOAD_KEY: 'KeyR',
    NPC_HEALTH: 80,
    NPC_SIZE: 20,
    NPC_SPEED: 1.8,
    NPC_MOVE_INTERVAL: 3000,
    NPC_MIN_DISTANCE: 50,
    NPC_MAX_DISTANCE: 150,
    NPC_SPAWN_DISTANCE: 200,
    MAX_NPCS: 0,
};

// ============================================
// ZOMBIE TYPE DEFINITIONS
// Each zombie type is defined as a data object.
// Adding a new type only requires adding an entry here.
// ============================================
const ZombieTypes = {
    normal: {
        name: 'Normal Zombie',
        speed: 1,
        health: 40,
        damage: 20,
        colors: {
            body: '#888888',
            head: '#777777',
            eyes: '#00ff00',
            healthBar: '#888888',
            hitParticle: '#888888',
            deathParticle: '#666666'
        },
        spawnWeight: 50
    },
    demon: {
        name: 'Demon Zombie',
        speed: 1.25,
        health: 60,
        damage: 25,
        colors: {
            body: '#cc0000',
            head: '#aa0000',
            eyes: '#ffffff',
            healthBar: '#ff0000',
            hitParticle: '#cc0000',
            deathParticle: '#aa0000'
        },
        spawnWeight: 15
    },
    fast: {
        name: 'Fast Zombie',
        speed: 1.5,
        health: 30,
        damage: 15,
        colors: {
            body: '#ffff00',
            head: '#ffdd00',
            eyes: '#ff0000',
            healthBar: '#ffff00',
            hitParticle: '#ffff00',
            deathParticle: '#ffdd00'
        },
        spawnWeight: 15
    },
    boomer: {
        name: 'Boomer Zombie',
        speed: 0.75,
        health: 50,
        damage: 15,
        size: 1.4,
        colors: {
            body: '#44aa44',
            head: '#338833',
            eyes: '#ff0000',
            healthBar: '#44aa44',
            hitParticle: '#44aa44',
            deathParticle: '#66cc66'
        },
        spawnWeight: 10
    },
    boss: {
        name: 'Boss Zombie',
        speed: 0.65,
        health: 1000,
        damage: 50,
        size: 2.5,
        colors: {
            body: '#aa6d44',
            head: '#634d23',
            eyes: '#ff0000',
            healthBar: '#ff0000',
            hitParticle: '#aa6d44',
            deathParticle: '#632323'
        },
        spawnWeight: 1
    }
};

// ============================================
// SHELL CASING DEFINITIONS
// Each entry maps a weapon sound to its shell shape and color.
// ============================================
const SHELL_TYPES = {
    glock:    { width: 2, height: 3,  color: '#ffd700' },
    mp5:      { width: 2, height: 3,  color: '#ffd700' },
    ak47:     { width: 2, height: 5,  color: '#ffd700' },
    barretm82:{ width: 2, height: 7,  color: '#ffd700' },
    m249:     { width: 2, height: 5,  color: '#ffd700' },
    minigun:  { width: 2, height: 5,  color: '#ffd700' },
    r870:     { width: 3, height: 5,  color: '#ff4444' },
    aa12: { width: 4, height: 6,  color: '#ff4444' },
    m79:      { width: 5, height: 5,  color: '#b8860b' },
    law:      { width: 20, height: 6, color: '#00570c' }
};

// ============================================
// WEAPON DEFINITIONS
// ============================================
const WEAPONS = [
    {
        name: "Glock Pistol",
        clipSize: 15,
        ammo: 120,
        fireRate: 200,
        reloadTime: 1100,
        bulletSpeed: 10,
        damage: 15,
        bulletCount: 1,
        spread: 0.02,
        color: "#888888",
        bulletSize: 3,
        sound: "glock",
        description: "Reliable sidearm",
        shake: 1.5
    },
    {
        name: "AK-47 Assault Rifle",
        clipSize: 30,
        ammo: 240,
        fireRate: 100,
        reloadTime: 2800,
        bulletSpeed: 12,
        damage: 25,
        bulletCount: 1,
        spread: 0.04,
        color: "#ff6600",
        bulletSize: 3,
        sound: "ak47",
        description: "Automatic rifle",
        shake: 2.0
    },
    {
        name: "MP5 Submachine Gun",
        clipSize: 30,
        ammo: 300,
        fireRate: 50,
        reloadTime: 2000,
        bulletSpeed: 11,
        damage: 18,
        bulletCount: 1,
        spread: 0.05,
        color: "#00ff00",
        bulletSize: 2,
        sound: "mp5",
        description: "High rate of fire",
        shake: 1.0
    },
    {
        name: "Remington 870 Shotgun",
        clipSize: 8,
        ammo: 80,
        fireRate: 500,
        reloadTime: 800,
        bulletSpeed: 10,
        damage: 12,
        bulletCount: 8,
        spread: 0.10,
        color: "#ff0000",
        bulletSize: 2,
        sound: "r870",
        description: "Classic zombie killer",
        reloadOneAtATime: true,
        shake: 5.0
    },
    {
        name: "Barrett M82A1 Sniper",
        clipSize: 10,
        ammo: 40,
        fireRate: 1000,
        reloadTime: 4650,
        bulletSpeed: 25,
        damage: 120,
        bulletCount: 1,
        spread: 0.005,
        color: "#0000ff",
        bulletSize: 4,
        sound: "barretm82",
        description: "Long-range precision",
        shake: 8.0
    },
    {
        name: "M79 Grenade Launcher",
        clipSize: 1,
        ammo: 30,
        fireRate: 1000,
        reloadTime: 2100,
        bulletSpeed: 8,
        damage: 90,
        bulletCount: 1,
        spread: 0.03,
        color: "#888800",
        bulletSize: 6,
        explosionRadius: 75,
        sound: "m79",
        description: "Explosive ordnance",
        shake: 4.0
    },
    {
        name: "AA-12 Assault Shotgun",
        clipSize: 20,
        ammo: 60,
        fireRate: 200,
        reloadTime: 4000,
        bulletSpeed: 10,
        damage: 8,
        bulletCount: 10,
        spread: 0.20,
        color: "#cc6600",
        bulletSize: 2,
        sound: "aa12",
        description: "Close-range devastation",
        shake: 5.0
    },
    {
        name: "M249 Light Machine Gun",
        clipSize: 100,
        ammo: 400,
        fireRate: 75,
        reloadTime: 4600,
        bulletSpeed: 12,
        damage: 20,
        bulletCount: 1,
        spread: 0.06,
        color: "#ffff00",
        bulletSize: 3,
        sound: "m249",
        description: "Sustained fire",
        shake: 2.2
    },
    {
        name: "M72 LAW Rocket Launcher",
        clipSize: 1,
        ammo: 10,
        fireRate: 2000,
        reloadTime: 4500,
        bulletSpeed: 7,
        damage: 300,
        bulletCount: 1,
        spread: 0.02,
        color: "#ff00ff",
        bulletSize: 8,
        explosionRadius: 140,
        trail: {
            color: '#999999',
            life: 1500,
            sizeMin: 3,
            sizeMax: 8,
            speedMin: 0.5,
            speedMax: 2.0
        },
        sound: "law",
        description: "Heavy anti-armor weapon",
        shake: 10.0
    },
    {
        name: "M134 Minigun",
        clipSize: 200,
        ammo: 500,
        fireRate: 40,
        reloadTime: 4800,
        bulletSpeed: 14,
        damage: 4,
        bulletCount: 3,
        spread: 0.1,
        color: "#00ffff",
        bulletSize: 3,
        sound: "minigun",
        description: "Hail of bullets",
        shake: 2.0
    }
];
