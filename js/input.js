// ============================================
// INPUT HANDLING
// ============================================
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Prevent scrolling with game keys
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyR'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ESC key toggles pause
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && game.running) {
        game.paused = !game.paused;
        game.canvas.style.cursor = game.paused ? 'default' : 'none';
        e.preventDefault();
    }
});

// Auto-pause when window loses focus
window.addEventListener('blur', () => {
    if (game.running && !game.paused) {
        game.paused = true;
        game.canvas.style.cursor = 'default';
    }
});

// Mouse tracking for aiming
document.addEventListener('mousemove', (e) => {
    if (game.canvas) {
        const rect = game.canvas.getBoundingClientRect();
        game.mouseX = e.clientX - rect.left;
        game.mouseY = e.clientY - rect.top;
    }
});
