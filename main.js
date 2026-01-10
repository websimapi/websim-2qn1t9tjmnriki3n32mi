import { Tetris } from './tetris.js';
import { audio } from './audio.js';
import { BackgroundEffect } from './background.js';

const canvas = document.getElementById('tetris-canvas');
const bgCanvas = document.getElementById('bg-canvas');
const nextCanvas = document.getElementById('next-canvas');
const holdCanvas = document.getElementById('hold-canvas');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const linesEl = document.getElementById('lines');
const scoreContainer = document.getElementById('score').parentElement;
const overlay = document.getElementById('overlay');
const restartBtn = document.getElementById('restart-btn');
const aiToggle = document.getElementById('ai-toggle');

const bgEffect = new BackgroundEffect(bgCanvas);
let aiMode = false;
let aiTarget = null;
let aiMoveTimer = 0;
const AI_MOVE_INTERVAL = 100; // Speed of AI inputs

// Resize canvases
function resize() {
    const dpr = window.devicePixelRatio || 1;
    
    // Main board
    const boardRect = canvas.getBoundingClientRect();
    canvas.width = boardRect.width * dpr;
    canvas.height = boardRect.height * dpr;
    
    // Preview boards
    [nextCanvas, holdCanvas].forEach(c => {
        const rect = c.getBoundingClientRect();
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
    });

    bgEffect.resize();
}

window.addEventListener('resize', resize);
resize();

const game = new Tetris(canvas, nextCanvas, holdCanvas);

// Controls
async function handleInput(e) {
    if (game.gameOver) return;

    // Start audio context on first interaction
    await audio.init();
    audio.playMusic();

    switch (e.key) {
        case 'ArrowLeft': game.move(-1); break;
        case 'ArrowRight': game.move(1); break;
        case 'ArrowDown': game.drop(); break;
        case 'ArrowUp': game.rotate(); break;
        case ' ': game.hardDrop(); break;
        case 'c': case 'C': game.hold(); break;
    }
}

window.addEventListener('keydown', handleInput);

// Mobile UI bindings
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const btnDown = document.getElementById('btn-down');
const btnUp = document.getElementById('btn-up');
const btnHold = document.getElementById('btn-hold');
const btnDrop = document.getElementById('btn-drop');

const mobileEvents = [
    { el: btnLeft, action: () => game.move(-1) },
    { el: btnRight, action: () => game.move(1) },
    { el: btnDown, action: () => game.drop() },
    { el: btnUp, action: () => game.rotate() },
    { el: btnHold, action: () => game.hold() },
    { el: btnDrop, action: () => game.hardDrop() },
];

mobileEvents.forEach(({ el, action }) => {
    el.addEventListener('touchstart', async (e) => {
        e.preventDefault();
        await audio.init();
        audio.playMusic();
        action();
    });
});

restartBtn.addEventListener('click', () => {
    game.reset();
    overlay.classList.add('hidden');
});

aiToggle.addEventListener('click', async () => {
    await audio.init();
    audio.playMusic();
    
    aiMode = !aiMode;
    aiToggle.classList.toggle('active', aiMode);
    aiToggle.innerText = aiMode ? 'AI MODE: ON' : 'AI MODE: OFF';
    
    if (aiMode) {
        scoreContainer.classList.add('hidden-score');
        aiTarget = null; // Recalculate
    } else {
        scoreContainer.classList.remove('hidden-score');
        game.score = 0;
        scoreEl.innerText = '0';
    }
});

function runAI(deltaTime) {
    if (!aiMode || game.gameOver) return;

    aiMoveTimer += deltaTime;
    if (aiMoveTimer < AI_MOVE_INTERVAL) return;
    aiMoveTimer = 0;

    // Determine target if we don't have one or piece changed
    if (!aiTarget || aiTarget.pieceType !== game.piece.type) {
        const best = game.getBestMove();
        aiTarget = {
            rotation: best.rotation,
            x: best.x,
            pieceType: game.piece.type,
            rotated: 0
        };
    }

    // Execute moves
    if (aiTarget.rotated < aiTarget.rotation) {
        game.rotate();
        aiTarget.rotated++;
    } else if (game.piece.pos.x < aiTarget.x) {
        game.move(1);
    } else if (game.piece.pos.x > aiTarget.x) {
        game.move(-1);
    } else {
        // Positioned correctly, drop
        game.drop();
    }
}

function gameLoop(time) {
    const deltaTime = time - (game.lastTime || time);
    bgEffect.update();
    
    if (aiMode) {
        runAI(deltaTime);
    }
    
    game.update(time);
    
    // Update UI
    if (!aiMode) {
        scoreEl.innerText = game.score;
    }
    levelEl.innerText = game.level;
    linesEl.innerText = game.lines;

    if (game.gameOver) {
        overlay.classList.remove('hidden');
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);