import { Piece, SHAPES, COLORS } from './pieces.js';
import { audio } from './audio.js';

export class Tetris {
    constructor(canvas, nextCanvas, holdCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext('2d');
        this.holdCanvas = holdCanvas;
        this.holdCtx = holdCanvas.getContext('2d');

        this.cols = 10;
        this.rows = 20;
        this.grid = this.createGrid();

        this.piece = null;
        this.nextPiece = this.getRandomPiece();
        this.holdPiece = null;
        this.canHold = true;

        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;

        this.dropCounter = 0;
        this.dropInterval = 1000;
        this.lastTime = 0;

        this.reset();
    }

    createGrid() {
        return Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
    }

    getRandomPiece() {
        const pieces = 'IJLOSTZ';
        const type = pieces[Math.floor(Math.random() * pieces.length)];
        return new Piece(type, 0, 0);
    }

    reset() {
        this.grid = this.createGrid();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.dropInterval = 1000;
        this.gameOver = false;
        this.spawnPiece();
    }

    spawnPiece() {
        this.piece = this.nextPiece;
        this.nextPiece = this.getRandomPiece();
        
        // Initial position
        this.piece.pos.x = Math.floor(this.cols / 2) - Math.floor(this.piece.matrix[0].length / 2);
        this.piece.pos.y = 0;

        if (this.collide()) {
            this.gameOver = true;
            audio.play('gameover');
        }
        this.canHold = true;
    }

    hold() {
        if (!this.canHold) return;
        
        const currentType = this.piece.type;
        if (this.holdPiece === null) {
            this.holdPiece = currentType;
            this.spawnPiece();
        } else {
            const nextType = this.holdPiece;
            this.holdPiece = currentType;
            this.piece = new Piece(nextType, 0, 0);
            this.piece.pos.x = Math.floor(this.cols / 2) - Math.floor(this.piece.matrix[0].length / 2);
            this.piece.pos.y = 0;
        }
        
        this.canHold = false;
        audio.play('move');
    }

    collide(piece = this.piece) {
        const { matrix, pos } = piece;
        for (let y = 0; y < matrix.length; y++) {
            for (let x = 0; x < matrix[y].length; x++) {
                if (matrix[y][x] !== 0) {
                    const boardX = x + pos.x;
                    const boardY = y + pos.y;
                    if (boardX < 0 || boardX >= this.cols || boardY >= this.rows || (boardY >= 0 && this.grid[boardY][boardX])) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    merge() {
        this.piece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = y + this.piece.pos.y;
                    const boardX = x + this.piece.pos.x;
                    if (boardY >= 0) {
                        this.grid[boardY][boardX] = this.piece.type;
                    }
                }
            });
        });
    }

    rotate() {
        const oldMatrix = this.piece.matrix;
        this.piece.rotate();
        
        // Wall kick logic (basic)
        let offset = 1;
        while (this.collide()) {
            this.piece.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (Math.abs(offset) > this.piece.matrix[0].length) {
                this.piece.matrix = oldMatrix;
                this.piece.pos.x -= offset; // revert? simplified
                return;
            }
        }
        audio.play('rotate');
    }

    move(dir) {
        this.piece.pos.x += dir;
        if (this.collide()) {
            this.piece.pos.x -= dir;
        } else {
            audio.play('move');
        }
    }

    drop() {
        this.piece.pos.y++;
        if (this.collide()) {
            this.piece.pos.y--;
            this.lock();
        }
        this.dropCounter = 0;
    }

    hardDrop() {
        while (!this.collide()) {
            this.piece.pos.y++;
        }
        this.piece.pos.y--;
        this.lock();
        audio.play('drop');
    }

    lock() {
        this.merge();
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        outer: for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = 0; x < this.cols; x++) {
                if (this.grid[y][x] === 0) continue outer;
            }
            const row = this.grid.splice(y, 1)[0].fill(0);
            this.grid.unshift(row);
            y++;
            linesCleared++;
        }

        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += [0, 100, 300, 500, 800][linesCleared] * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
            audio.play('clear');
        }
    }

    getGhostPos() {
        const ghost = {
            pos: { ...this.piece.pos },
            matrix: this.piece.matrix
        };
        while (!this.collide(ghost)) {
            ghost.pos.y++;
        }
        ghost.pos.y--;
        return ghost.pos;
    }

    drawBlock(ctx, x, y, type, scale, isGhost = false) {
        ctx.fillStyle = isGhost ? COLORS.ghost : COLORS[type];
        ctx.fillRect(x * scale, y * scale, scale, scale);
        
        if (!isGhost) {
            // Bevel effect
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.strokeRect(x * scale + 1, y * scale + 1, scale - 2, scale - 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(x * scale + scale * 0.7, y * scale + scale * 0.7, scale * 0.3, scale * 0.3);
        }
    }

    render() {
        const scale = this.canvas.width / this.cols;
        
        // Clear main board
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        for(let x=0; x<=this.cols; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x*scale, 0);
            this.ctx.lineTo(x*scale, this.canvas.height);
            this.ctx.stroke();
        }
        for(let y=0; y<=this.rows; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y*scale);
            this.ctx.lineTo(this.canvas.width, y*scale);
            this.ctx.stroke();
        }

        // Draw grid
        this.grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(this.ctx, x, y, value, scale);
                }
            });
        });

        if (this.piece && !this.gameOver) {
            // Draw ghost
            const ghostPos = this.getGhostPos();
            this.piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.drawBlock(this.ctx, x + ghostPos.x, y + ghostPos.y, this.piece.type, scale, true);
                    }
                });
            });

            // Draw active piece
            this.piece.matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        this.drawBlock(this.ctx, x + this.piece.pos.x, y + this.piece.pos.y, this.piece.type, scale);
                    }
                });
            });
        }

        this.renderPreview(this.nextCtx, this.nextPiece.type, this.nextCanvas.width);
        this.renderPreview(this.holdCtx, this.holdPiece, this.holdCanvas.width);
    }

    renderPreview(ctx, type, size) {
        ctx.clearRect(0, 0, size, size);
        if (!type) return;
        
        const matrix = SHAPES[type];
        const scale = size / 4;
        const offsetX = (4 - matrix[0].length) / 2;
        const offsetY = (4 - matrix.length) / 2;

        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.drawBlock(ctx, x + offsetX, y + offsetY, type, scale);
                }
            });
        });
    }

    // AI Heuristic logic
    getHeuristicScore(grid) {
        let holes = 0;
        let aggregateHeight = 0;
        let bumpiness = 0;
        let completeLines = 0;

        const heights = Array(this.cols).fill(0);
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (grid[y][x]) {
                    heights[x] = this.rows - y;
                    break;
                }
            }
        }

        aggregateHeight = heights.reduce((a, b) => a + b, 0);

        for (let x = 0; x < this.cols; x++) {
            let foundBlock = false;
            for (let y = 0; y < this.rows; y++) {
                if (grid[y][x]) foundBlock = true;
                else if (foundBlock) holes++;
            }
        }

        for (let x = 0; x < this.cols - 1; x++) {
            bumpiness += Math.abs(heights[x] - heights[x + 1]);
        }

        for (let y = 0; y < this.rows; y++) {
            if (grid[y].every(cell => cell !== 0)) completeLines++;
        }

        return (-0.51 * aggregateHeight) + (0.76 * completeLines) - (0.35 * holes) - (0.18 * bumpiness);
    }

    getBestMove() {
        let bestScore = -Infinity;
        let bestMove = { rotation: 0, x: 0 };

        const originalPiece = {
            matrix: [...this.piece.matrix.map(row => [...row])],
            pos: { ...this.piece.pos }
        };

        // Try all rotations
        for (let r = 0; r < 4; r++) {
            // Try all horizontal positions
            for (let x = -2; x < this.cols + 2; x++) {
                this.piece.pos.x = x;
                this.piece.pos.y = 0;

                if (this.collide()) continue;

                // Drop to bottom
                while (!this.collide()) {
                    this.piece.pos.y++;
                }
                this.piece.pos.y--;

                // Simulate merge
                const tempGrid = this.grid.map(row => [...row]);
                this.piece.matrix.forEach((row, py) => {
                    row.forEach((value, px) => {
                        if (value !== 0) {
                            const boardY = py + this.piece.pos.y;
                            const boardX = px + this.piece.pos.x;
                            if (boardY >= 0 && boardY < this.rows && boardX >= 0 && boardX < this.cols) {
                                tempGrid[boardY][boardX] = this.piece.type;
                            }
                        }
                    });
                });

                const score = this.getHeuristicScore(tempGrid);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { rotation: r, x: x };
                }
            }
            this.piece.rotate();
        }

        // Restore
        this.piece.matrix = originalPiece.matrix;
        this.piece.pos = originalPiece.pos;

        return bestMove;
    }

    update(time = 0) {
        if (this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }

        this.render();
    }
}