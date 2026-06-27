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
// SETTINGS & PROGRESSION STATE
// ---------------------------------------------------------
let isStateB = false; // false = Ship Red / Ast Cyan. true = inverted.
let redAlpha = 1.0;
let cyanAlpha = 1.0;

let sessionTimeMS = 0;
let highScore = 0;
let bestContrastRatio = "1.0 : 1.0";

// DOM Elements
const toggleBtn = document.getElementById('toggleEyeSwap');
const sliderRed = document.getElementById('redOpacity');
const sliderCyan = document.getElementById('cyanOpacity');
const valRed = document.getElementById('redOpacityVal');
const valCyan = document.getElementById('cyanOpacityVal');

const elHighScore = document.getElementById('highScore');
const elContrastRatio = document.getElementById('contrastRatio');
const elSessionTime = document.getElementById('sessionTime');

// ---------------------------------------------------------
// ENTITIES
// ---------------------------------------------------------
const player = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 40,
    height: 40,
    speed: 0.15 // Relaxed speed
};

const asteroids = [];
let asteroidSpawnTimer = 0;
const ASTEROID_SPAWN_INTERVAL = 3000; // Very infrequent spawns for calm pacing

let score = 0;

// Audio state
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;
        this.masterGain = null;
    }

    init() {
        if (this.isInitialized) return;
        
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        // Master gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.4; // Relaxed overall volume
        
        // Lowpass filter to keep it warm and non-fatiguing
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Warm frequencies
        filter.Q.value = 1;
        
        this.masterGain.connect(filter);
        filter.connect(this.ctx.destination);

        // Relaxing chord (C minor 9 / Open fifth variant: C3, G3, D4, Eb4)
        const frequencies = [130.81, 196.00, 293.66, 311.13];
        
        frequencies.forEach((freq, index) => {
            // Main oscillator for the note
            const osc = this.ctx.createOscillator();
            osc.type = index % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freq;
            
            // Gain node to control this specific oscillator's volume
            const oscGain = this.ctx.createGain();
            // Base volume for this oscillator
            oscGain.gain.value = 0.15; 
            
            // LFO to modulate the gain for a breathing/swell effect
            const lfo = this.ctx.createOscillator();
            lfo.type = 'sine';
            // Very slow, asynchronous LFOs (0.02 to 0.08 Hz)
            lfo.frequency.value = 0.02 + (Math.random() * 0.06);
            
            // LFO controls the gain variation
            const lfoGain = this.ctx.createGain();
            lfoGain.gain.value = 0.1; // Amount of swell variation
            
            lfo.connect(lfoGain);
            lfoGain.connect(oscGain.gain);
            
            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            
            osc.start();
            lfo.start();
        });

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        this.isInitialized = true;
    }
}

const audio = new AudioEngine();

/**
 * Loads progression and config from local storage
 */
function loadProgression() {
    highScore = parseInt(localStorage.getItem('dichoptic_highScore')) || 0;
    sessionTimeMS = parseInt(localStorage.getItem('dichoptic_sessionTime')) || 0;
    bestContrastRatio = localStorage.getItem('dichoptic_bestContrast') || "1.0 : 1.0";
    
    const savedRed = localStorage.getItem('dichoptic_redAlpha');
    if (savedRed !== null) redAlpha = parseFloat(savedRed);
    const savedCyan = localStorage.getItem('dichoptic_cyanAlpha');
    if (savedCyan !== null) cyanAlpha = parseFloat(savedCyan);
    
    const savedSwap = localStorage.getItem('dichoptic_isStateB');
    if (savedSwap !== null) isStateB = savedSwap === 'true';

    // update DOM
    sliderRed.value = redAlpha;
    valRed.innerText = redAlpha.toFixed(2);
    sliderCyan.value = cyanAlpha;
    valCyan.innerText = cyanAlpha.toFixed(2);
    toggleBtn.innerText = isStateB ? "State B: Ship (Cyan) / Ast (Red)" : "State A: Ship (Red) / Ast (Cyan)";
    
    updateProgressionUI();
}

/**
 * Saves progression and config to local storage
 */
function saveProgression() {
    localStorage.setItem('dichoptic_highScore', highScore);
    localStorage.setItem('dichoptic_sessionTime', sessionTimeMS);
    localStorage.setItem('dichoptic_bestContrast', bestContrastRatio);
    localStorage.setItem('dichoptic_redAlpha', redAlpha);
    localStorage.setItem('dichoptic_cyanAlpha', cyanAlpha);
    localStorage.setItem('dichoptic_isStateB', isStateB);
}

/**
 * Updates the progression UI text elements
 */
function updateProgressionUI() {
    elHighScore.innerText = highScore;
    elContrastRatio.innerText = bestContrastRatio;
    
    const totalSeconds = Math.floor(sessionTimeMS / 1000);
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    elSessionTime.innerText = `${m}:${s}`;
}

/**
 * Initializes the game and starts the loop.
 */
function init() {
    loadProgression();

    // UI Listeners
    toggleBtn.addEventListener('click', () => {
        isStateB = !isStateB;
        toggleBtn.innerText = isStateB ? "State B: Ship (Cyan) / Ast (Red)" : "State A: Ship (Red) / Ast (Cyan)";
        saveProgression();
    });

    sliderRed.addEventListener('input', (e) => {
        redAlpha = parseFloat(e.target.value);
        valRed.innerText = redAlpha.toFixed(2);
        saveProgression();
    });

    sliderCyan.addEventListener('input', (e) => {
        cyanAlpha = parseFloat(e.target.value);
        valCyan.innerText = cyanAlpha.toFixed(2);
        saveProgression();
    });

    const btnStart = document.getElementById('btnStart');
    const overlay = document.getElementById('startOverlay');

    btnStart.addEventListener('click', () => {
        audio.init();
        overlay.classList.add('hidden');
        
        // Start game loop if not already running
        if (!gameLoopRunning) {
            gameLoopRunning = true;
            lastTime = performance.now();
            requestAnimationFrame(gameLoop);
        }
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key;
        if (key === 'a' || key === 'A' || key === 'ArrowLeft') keys.left = true;
        if (key === 'd' || key === 'D' || key === 'ArrowRight') keys.right = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key;
        if (key === 'a' || key === 'A' || key === 'ArrowLeft') keys.left = false;
        if (key === 'd' || key === 'D' || key === 'ArrowRight') keys.right = false;
    });

    // We do NOT call requestAnimationFrame here.
    // It's tied to the Start Game button.
}

let gameLoopRunning = false;

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
            speed: 0.03 + Math.random() * 0.03 // Very slow descent
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
            
            if (score > highScore) {
                highScore = score;
                bestContrastRatio = `${redAlpha.toFixed(1)} : ${cyanAlpha.toFixed(1)}`;
                saveProgression();
            }
            updateProgressionUI();

            asteroids.splice(i, 1);
            continue; // Skip the off-screen check since it was removed
        }

        // Clean up asteroids that move off-screen
        if (ast.y - ast.radius > canvas.height) {
            asteroids.splice(i, 1);
        }
    }

    // Update Session Time
    const oldSec = Math.floor(sessionTimeMS / 1000);
    sessionTimeMS += deltaTime;
    const newSec = Math.floor(sessionTimeMS / 1000);
    
    if (newSec > oldSec) {
        updateProgressionUI();
        if (newSec % 5 === 0) {
            saveProgression(); // Save periodically
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

    // Determine colors based on Eye Target Swap state
    const astColor = isStateB ? COLOR_RIGHT_EYE : COLOR_LEFT_EYE;
    const pColor = isStateB ? COLOR_LEFT_EYE : COLOR_RIGHT_EYE;

    // Draw Asteroids
    ctx.globalAlpha = astColor === COLOR_RIGHT_EYE ? redAlpha : cyanAlpha;
    ctx.fillStyle = astColor;
    asteroids.forEach(ast => {
        ctx.beginPath();
        ctx.arc(ast.x, ast.y, ast.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Player Spaceship
    ctx.globalAlpha = pColor === COLOR_RIGHT_EYE ? redAlpha : cyanAlpha;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2); // Nose
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2); // Right wing
    ctx.lineTo(player.x, player.y + player.height / 4); // Engine indent
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2); // Left wing
    ctx.closePath();
    ctx.fill();

    // Reset alpha
    ctx.globalAlpha = 1.0;

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
