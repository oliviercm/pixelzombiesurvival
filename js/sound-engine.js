// ============================================
// SOUND ENGINE - Web Audio API
// ============================================
const SoundEngine = {
    audioContext: null,
    initialized: false,
    sounds: {},

    // Initialize the AudioContext and preload weapon sounds
    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
        this.preloadSounds();
    },

    // Preload all WAV files into AudioBuffers
    async preloadSounds() {
        const soundFiles = {
            glock: 'sounds/glock-fire.wav',
            'glock-reload': 'sounds/glock-reload.wav',
            ak47: 'sounds/ak47-fire.wav',
            'ak47-reload': 'sounds/ak47-reload.wav',
            mp5: 'sounds/mp5-fire.wav',
            'mp5-reload': 'sounds/mp5-reload.wav',
            r870: 'sounds/r870-fire.wav',
            'r870-reload': 'sounds/r870-reload.wav',
            barretm82: 'sounds/barretm82-fire.wav',
            'barretm82-reload': 'sounds/barretm82-reload.wav',
            m79: 'sounds/m79-fire.wav',
            'm79-reload': 'sounds/m79-reload.wav',
            mossberg: 'sounds/mossberg-fire.wav',
            'mossberg-reload': 'sounds/mossberg-reload.wav',
            law: 'sounds/law-fire.wav',
            'law-reload': 'sounds/law-reload.wav',
            m249: 'sounds/m249-fire.wav',
            'm249-reload': 'sounds/m249-reload.wav',
            minigun: 'sounds/minigun-fire.wav',
            'minigun-reload': 'sounds/minigun-reload.wav',
            zombiehit: 'sounds/zombiehit.wav',
            zombiehit2: 'sounds/zombiehit2.wav',
            zombiehit3: 'sounds/zombiehit3.wav',
            zombiedeath: 'sounds/zombiedeath.wav',
            playerhit: 'sounds/playerhit.wav',
            playerdeath: 'sounds/playerdeath.wav',
            barrelExplosion: 'sounds/barrel-explosion.wav',
            rocketExplosion: 'sounds/rocket-explosion.wav',
            pickupammo: 'sounds/pickupammo.wav',
            pickuphealth: 'sounds/pickuphealth.wav',
            changeweapon: 'sounds/changeweapon.wav'
        };

        for (const [type, url] of Object.entries(soundFiles)) {
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.sounds[type] = audioBuffer;
                console.log(`Loaded sound: ${type}`);
            } catch (e) {
                console.warn(`Failed to load sound: ${type} (${url})`, e);
            }
        }
    },

    // Resume AudioContext if suspended (browser policy)
    resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    },

    // ============================================
    // WEAPON SHOOT SOUNDS
    // ============================================

    // Play a preloaded audio buffer as a one-shot sound
    playBuffer(buffer, volume = 1.0) {
        if (!this.audioContext || !buffer) return;
        this.resume();

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.start();
    },

    // Weapon-specific gunshot sounds - plays preloaded WAV file by path
    playShoot(soundPath) {
        const buffer = this.sounds[soundPath];
        if (buffer) {
            this.playBuffer(buffer, 0.4);
        } else {
            console.warn(`No sound loaded for: ${soundPath}`);
        }
    },

    // ============================================
    // IMPACT & DAMAGE SOUNDS
    // ============================================

    // Zombie hit sound - randomized among three variants
    playHit(weaponType = 'rifle') {
        const variants = ['zombiehit', 'zombiehit2', 'zombiehit3'];
        const variant = variants[Math.floor(Math.random() * variants.length)];
        const buffer = this.sounds[variant];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // Zombie death sound
    playZombieDeath() {
        const buffer = this.sounds['zombiedeath'];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // Player taking damage
    playDamage() {
        const buffer = this.sounds['playerhit'];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // ============================================
    // PLAYER DEATH SOUND
    // ============================================

    // Player death sound
    playPlayerDeath() {
        const buffer = this.sounds['playerdeath'];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // ============================================
    // EXPLOSION SOUNDS
    // ============================================

    // Explosion sound - barrel (small) or rocket (large)
    playExplosion(radius) {
        const isLarge = radius >= 80;
        const key = isLarge ? 'rocketExplosion' : 'barrelExplosion';
        const buffer = this.sounds[key];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // ============================================
    // PICKUP SOUNDS
    // ============================================

    // Pickup collected - type-specific sound
    playPickup(type = 'ammo') {
        const key = type === 'health' ? 'pickuphealth' : 'pickupammo';
        const buffer = this.sounds[key];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    },

    // ============================================
    // WEAPON RELOAD SOUND
    // ============================================

    // Play weapon-specific reload sound
    playReload(soundPath) {
        const buffer = this.sounds[soundPath];
        if (buffer) {
            this.playBuffer(buffer, 0.4);
        } else {
            console.warn(`No sound loaded for: ${soundPath}`);
        }
    },

    // ============================================
    // WEAPON CHANGE SOUND
    // ============================================

    // Weapon change sound
    playChangeWeapon() {
        const buffer = this.sounds['changeweapon'];
        if (buffer) {
            this.playBuffer(buffer, 1.0);
        }
    }
};
