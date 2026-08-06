const http = require('http');
const fs = require('fs');
const path = require('path');
const { watch } = require('fs');
const net = require('net');

const PORT = 8081;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
};

function serveFile(filePath, res) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache',
        });
        res.end(data);
    });
}

function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, '127.0.0.1');
        server.on('listening', () => {
            server.close();
            resolve(false);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

async function startServer() {
    const inUse = await isPortInUse(PORT);
    if (inUse) {
        console.error(`  ❌ Port ${PORT} is already in use.`);
        console.error(`     Stop the other process or change PORT in server.js`);
        process.exit(1);
    }

    const server = http.createServer((req, res) => {
        // Clean the path and resolve to ROOT
        let filePath = path.join(ROOT, req.url === '/' ? 'zombie-game.html' : req.url);

        // Prevent directory traversal
        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        serveFile(filePath, res);
    });

    server.listen(PORT, () => {
        console.log(`\n  🎮 Pixel Zombie Survival`);
        console.log(`  🌐 Server running at http://localhost:${PORT}`);
        console.log(`  🔥 Hot-reload enabled\n`);
    });
}

startServer();

// Watch all files in the project for changes
const watchedDirs = new Set([ROOT]);

function watchDir(dir) {
    try {
        watch(dir, { recursive: true }, (eventType, filename) => {
            if (filename) {
                console.log(`  🔄 Reloaded: ${filename}`);
            }
        });
        watchedDirs.add(dir);
    } catch (e) {
        // watch may fail on some systems, that's OK
    }
}

watchDir(ROOT);

// Also watch the sounds directory explicitly
watchDir(path.join(ROOT, 'sounds'));
