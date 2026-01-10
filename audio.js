class AudioController {
    constructor() {
        this.ctx = null;
        this.buffers = {};
        this.enabled = false;
    }

    async init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
        this.musicSource = null;
        
        const sounds = ['move', 'rotate', 'clear', 'gameover', 'drop', 'Tetris'];
        for (const sound of sounds) {
            try {
                const response = await fetch(`${sound}.mp3`);
                const arrayBuffer = await response.arrayBuffer();
                this.buffers[sound] = await this.ctx.decodeAudioData(arrayBuffer);
            } catch (e) {
                console.warn(`Failed to load sound: ${sound}`, e);
            }
        }
    }

    play(name) {
        if (!this.enabled || !this.buffers[name]) return;
        
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        source.connect(this.ctx.destination);
        source.start(0);
    }

    playMusic() {
        if (!this.enabled || !this.buffers['Tetris'] || this.musicSource) return;

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        this.musicSource = this.ctx.createBufferSource();
        this.musicSource.buffer = this.buffers['Tetris'];
        this.musicSource.loop = true;
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 0.4; // Lower volume for background music
        
        this.musicSource.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        this.musicSource.start(0);
    }

    stopMusic() {
        if (this.musicSource) {
            this.musicSource.stop();
            this.musicSource = null;
        }
    }
}

export const audio = new AudioController();