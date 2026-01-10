import { SHAPES, COLORS } from './pieces.js';

class BackgroundPiece {
    constructor(canvasWidth, canvasHeight) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.reset();
        // Start at random Y
        this.y = Math.random() * canvasHeight;
    }

    reset() {
        const types = Object.keys(SHAPES);
        this.type = types[Math.floor(Math.random() * types.length)];
        this.matrix = SHAPES[this.type];
        this.color = COLORS[this.type];
        this.size = Math.random() * 20 + 20;
        this.x = Math.random() * this.canvasWidth;
        this.y = -this.size * 4;
        this.speed = Math.random() * 1 + 0.5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.opacity = Math.random() * 0.2 + 0.1;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        if (this.y > this.canvasHeight + this.size * 4) {
            this.reset();
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;

        const blockSize = this.size;
        this.matrix.forEach((row, rY) => {
            row.forEach((value, rX) => {
                if (value !== 0) {
                    ctx.fillRect(
                        (rX - this.matrix.length / 2) * blockSize,
                        (rY - this.matrix.length / 2) * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
        ctx.restore();
    }
}

export class BackgroundEffect {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.pieces = [];
        this.init();
    }

    init() {
        this.pieces = Array.from({ length: 15 }, () => new BackgroundPiece(this.canvas.width, this.canvas.height));
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.pieces.forEach(p => {
            p.canvasWidth = this.canvas.width;
            p.canvasHeight = this.canvas.height;
        });
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.pieces.forEach(p => {
            p.update();
            p.draw(this.ctx);
        });
    }
}