import { audioContext } from "../audio";

export abstract class Instrument {
    abstract play(time?: number): void;
}

export class Kick extends Instrument {
    play(time: number = audioContext.currentTime) {
        const oscillator = new OscillatorNode(audioContext);
        const oscillatorEnvelope = new GainNode(audioContext);

        oscillator.connect(oscillatorEnvelope);
        oscillatorEnvelope.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(150, time);
        oscillatorEnvelope.gain.setValueAtTime(1, time);
        oscillator.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        oscillator.start(time);
        oscillator.stop(time + 0.5);
    }
}

export class Snare extends Instrument {
    private genNoiseBuffer() {
        const bufferSize = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(
            1,
            bufferSize,
            audioContext.sampleRate
        );
        const output = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        return buffer;
    }

    play(time: number = audioContext.currentTime) {
        const noise = new AudioBufferSourceNode(audioContext);
        noise.buffer = this.genNoiseBuffer();

        const noiseFilter = new BiquadFilterNode(audioContext);
        noiseFilter.type = "highpass";
        noiseFilter.frequency.value = 1000;
        noise.connect(noiseFilter);

        const noiseEnvelope = new GainNode(audioContext);
        noiseFilter.connect(noiseEnvelope);

        noiseEnvelope.connect(audioContext.destination);

        const oscillator = new OscillatorNode(audioContext);
        oscillator.type = "triangle";

        const oscillatorEnvelope = new GainNode(audioContext);
        oscillator.connect(oscillatorEnvelope);
        oscillatorEnvelope.connect(audioContext.destination);

        noiseEnvelope.gain.setValueAtTime(0.5, time);
        noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        noise.start(time);

        oscillator.frequency.setValueAtTime(100, time);
        oscillatorEnvelope.gain.setValueAtTime(1.8, time);
        oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        oscillator.start(time);
        oscillator.stop(time + 0.2);
        noise.stop(time + 0.2);
    }
}

export class Sine extends Instrument {
    play(time: number = audioContext.currentTime) {
        const oscillator = new OscillatorNode(audioContext);
        oscillator.type = "sine";

        const oscillatorEnvelope = new GainNode(audioContext);
        oscillator.connect(oscillatorEnvelope);
        oscillatorEnvelope.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(220, time);

        // A bare 220Hz sine at full gain reads much louder than the kick
        // (whose tone drops out of the audible range almost at once) or
        // the snare (whose body decays in 100ms), and hard-stopping it
        // clicks. So give it an attack and a decay of its own.
        oscillatorEnvelope.gain.setValueAtTime(0.001, time);
        oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.3, time + 0.01);
        oscillatorEnvelope.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        oscillator.start(time);
        oscillator.stop(time + 0.2);
    }
}
