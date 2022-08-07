export abstract class Instrument {

    context: AudioContext;
    oscillator: OscillatorNode;
    oscillatorEnvelope: GainNode;

    constructor(context: AudioContext) {
        this.context = context;
    }

    protected abstract setup(): void;
    abstract play(time?: number): void;

}

export class Kick extends Instrument {

    protected setup() {
        this.oscillator = new OscillatorNode(this.context)
        this.oscillatorEnvelope = new GainNode(this.context)
        this.oscillator.connect(this.oscillatorEnvelope);
        this.oscillatorEnvelope.connect(this.context.destination)
    }

    play(time?: number) {

        if(typeof time == 'undefined')
            time = this.context.currentTime;

        this.setup();
        this.oscillator.frequency.setValueAtTime(150, time);
        this.oscillatorEnvelope.gain.setValueAtTime(1, time);
        this.oscillator.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        this.oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
        this.oscillator.start(time);
        this.oscillator.stop(time + 0.5);
    }

}

export class Snare extends Instrument {

    noise: AudioBufferSourceNode;
    noiseEnvelope: GainNode;

    private genNoiseBuffer() {
        const bufferSize = this.context.sampleRate;
        const buffer = this.context.createBuffer(
            1, bufferSize, this.context.sampleRate
        );
        const output = buffer.getChannelData(0);

        for (var i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    };

    protected setup() {

        this.noise = new AudioBufferSourceNode(this.context);
        this.noise.buffer = this.genNoiseBuffer();

        const noiseFilter = new BiquadFilterNode(this.context);
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        this.noise.connect(noiseFilter);

        this.noiseEnvelope = new GainNode(this.context);
        noiseFilter.connect(this.noiseEnvelope);

        this.noiseEnvelope.connect(this.context.destination);

        this.oscillator = new OscillatorNode(this.context);
        this.oscillator.type = 'triangle';

        this.oscillatorEnvelope = new GainNode(this.context)
        this.oscillator.connect(this.oscillatorEnvelope);
        this.oscillatorEnvelope.connect(this.context.destination);

    }

    play(time?: number) {

        if(typeof time == 'undefined')
            time = this.context.currentTime;

        this.setup();

        this.noiseEnvelope.gain.setValueAtTime(0.5, time);
        this.noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        this.noise.start(time)

        this.oscillator.frequency.setValueAtTime(100, time);
        this.oscillatorEnvelope.gain.setValueAtTime(1.8, time);
        this.oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        this.oscillator.start(time)

        this.oscillator.stop(time + 0.2);
        this.noise.stop(time + 0.2);

    };

 }

export class Sine extends Instrument {

    protected setup() {

        this.oscillator = new OscillatorNode(this.context);
        this.oscillator.type = 'sine';

        this.oscillatorEnvelope = new GainNode(this.context)
        this.oscillator.connect(this.oscillatorEnvelope);
        this.oscillatorEnvelope.connect(this.context.destination);

    }

    play(time?: number) {

        if(typeof time == 'undefined')
            time = this.context.currentTime;

        this.setup();

        this.oscillator.frequency.setValueAtTime(220, time);

        this.oscillator.start(time)
        this.oscillator.stop(time + 0.2);

    };

 }

