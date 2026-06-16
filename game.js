/**
 * Dichoptic Vision Therapy Space Game - Phase 1
 * Core Canvas Setup & Rendering Loop
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---------------------------------------------------------
// DICHOPTIC COLOR CONSTANTS
// ---------------------------------------------------------
// Left Eye: Cyan (Visible through the Red lens)
const COLOR_LEFT_EYE = '#00FFFF'; 

// Right Eye: Red (Visible through the Cyan lens)
const COLOR_RIGHT_EYE = '#FF0000'; 

// Both Eyes Anchor: Light Gray or White (Visible to both eyes)
// Used for fusion locks and environmental background.
const COLOR_ANCHOR = '#D3D3D3'; 

// State for game loop
let lastTime = 0;

// Input State
const keys = { left: false, right: false };

// ---------------------------------------------------------
// ENTITIES
// ---------------------------------------------------------
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    speed: 0.15, // Relaxed speed
    color: COLOR_RIGHT_EYE // Right eye (Cyan lens)
};

const asteroids = [];
let asteroidSpawnTimer = 0;
const ASTEROID_SPAWN_INTERVAL = 3000; // Very infrequent spawns for calm pacing

let score = 0;

// Audio state
let musicInitialized = false;

/**
 * Initializes the relaxing space music.
 * User interaction is required by browsers to start audio playback.
 */
function initializeSpaceMusic() {
    if (musicInitialized) return;
    
    const bgAudio = document.getElementById('spaceMusic');
    // =========================================================================
    // AUDIO PLACEHOLDER
    // Replace the src below with the local path or URL to your relaxing music.
    // Example: bgAudio.src = './assets/relaxing_music.mp3';
    // =========================================================================
    bgAudio.src = 'path/to/my/relaxing_music.mp3'; 
    bgAudio.volume = 0.4;
    bgAudio.play().then(() => {
        musicInitialized = true;
    }).catch(error => {
        console.log("Audio play failed pending user interaction.", error);
    });
}

/**
 * Initializes the game and starts the loop.
 */
function init() {
    // Add interaction listener for audio
    window.addEventListener('click', initializeSpaceMusic);
    window.addEventListener('keydown', (e) => {
        // Initialize music on first key press too
        initializeSpaceMusic();
        
        const key = e.key;
        if (key === 'a' || key === 'A' || key === 'ArrowLeft') keys.left = true;
        if (key === 'd' || key === 'D' || key === 'ArrowRight') keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key;
        if (key === 'a' || key === 'A' || key === 'ArrowLeft') keys.left = false;
        if (key === 'd' || key === 'D' || key === 'ArrowRight') keys.right = false;
    });

    requestAnimationFrame(gameLoop);
}

/**
 * Main Game Loop (requestAnimationFrame)
 * @param {number} timestamp - Current execution time from rAF
 */
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

/**
 * Check if two circles collide
 */
function checkCollision(circle1, rect2) {
    // Basic bounding box check for simplicity
    const rectLeft = rect2.x - rect2.width / 2;
    const rectRight = rect2.x + rect2.width / 2;
    const rectTop = rect2.y - rect2.height / 2;
    const rectBottom = rect2.y + rect2.height / 2;

    // Find the closest point to the circle within the rectangle
    const closestX = Math.max(rectLeft, Math.min(circle1.x, rectRight));
    const closestY = Math.max(rectTop, Math.min(circle1.y, rectBottom));

    // Calculate the distance between the circle's center and this closest point
    const distanceX = circle1.x - closestX;
    const distanceY = circle1.y - closestY;

    // If the distance is less than the circle's radius, an intersection occurs
    return (distanceX * distanceX + distanceY * distanceY) < (circle1.radius * circle1.radius);
}

/**
 * Update logic
 * @param {number} deltaTime - Time since last frame 
 */
function update(deltaTime) {
    // Update player position
    if (keys.left) {
        player.x -= player.speed * deltaTime;
    }
    if (keys.right) {
        player.x += player.speed * deltaTime;
    }
    
    // Constrain player to canvas bounds
    player.x = Math.max(player.width / 2, Math.min(canvas.width - player.width / 2, player.x));

    // Spawn new asteroids
    asteroidSpawnTimer += deltaTime;
    if (asteroidSpawnTimer >= ASTEROID_SPAWN_INTERVAL) {
        asteroidSpawnTimer = 0;
        asteroids.push({
            x: Math.random() * (canvas.width - 60) + 30, // Random X within canvas
            y: -30,
            radius: 15 + Math.random() * 10, // Slightly smaller asteroids
            speed: 0.03 + Math.random() * 0.03, // Very slow descent
            color: COLOR_LEFT_EYE // Left eye (Red lens)
        });
    }

    // Update existing asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const ast = asteroids[i];
        ast.y += ast.speed * deltaTime;

        // Collision Check
        if (checkCollision(ast, player)) {
            // Collision occurred!
            score++;
            asteroids.splice(i, 1);
            continue; // Skip the off-screen check since it was removed
        }

        // Clean up asteroids that move off-screen
        if (ast.y - ast.radius > canvas.height) {
            asteroids.splice(i, 1);
        }
    }
}

/**
 * Main draw call that renders the frame
 */
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the deep space background fill
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw the binocular fusion anchor layer
    drawStellarGrid();

    // Draw Asteroids (Left Eye - Cyan)
    asteroids.forEach(ast => {
        ctx.fillStyle = ast.color;
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player Spaceship (Right Eye - Red)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2); // Nose
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2); // Right wing
    ctx.lineTo(player.x, player.y + player.height / 4); // Engine indent
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2); // Left wing
    ctx.closePath();
    ctx.fill();

    // Draw Score (Both Eyes Anchor - White/Gray)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 40);
}

/**
 * Draws a static background grid.
 * This grid uses neutral colors so both eyes see it properly.
 * It's vital for anchoring binocular fusion and preventing suppression of one eye.
 */
function drawStellarGrid() {
    ctx.strokeStyle = COLOR_ANCHOR;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2; // Keep it subtle

    const gridSize = 50;

    ctx.beginPath();
    
    // Vertical alignment lines
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }
    // Horizontal alignment lines
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    ctx.globalAlpha = 1.0; // Reset alpha to default
}

// Kick off initialization
init();
