import colors from "tailwindcss/colors";

import { Instrument, Kick, Sine, Snare } from "./Instrument";
import BeatScheduler from "../services/BeatScheduler";
import { InstrumentName, RingColor } from "../constants";

interface RingState {
    currentBeatCount: number;
    beatPlayed: boolean;
    beatCountChanged: boolean;
    instrument: Instrument;
    paused: boolean;
}

interface RingSettings {
    beatCount: number;
    instrumentName: InstrumentName;
    colorName: RingColor;
}

class Ring {
    // This is used for ids
    static globalCount = 0;

    public settings: RingSettings = {
        beatCount: 4,
        instrumentName: "kick",
        colorName: "blue"
    };

    public state: RingState = {
        paused: true,
        beatPlayed: false,
        instrument: new Kick(),
        beatCountChanged: false,
        currentBeatCount: this.settings.beatCount
    };

    // Generate an id
    public id = Ring.globalCount++;

    public scheduler = new BeatScheduler(this.state, this.settings);

    /**
     * Whether the ring is paused
     */
    get paused() {
        return this.state.paused;
    }

    /**
     * To set whether the ring is paused
     */
    set paused(_paused: boolean) {
        this.state.paused = _paused;
    }

    /**
     * The current beat count
     */
    get beatCount() {
        return this.state.currentBeatCount;
    }

    /**
     * Set the current beat count
     */
    set beatCount(_beatCount: number) {
        this.settings.beatCount = _beatCount;
        // To let the scheduler know that
        // the beat count has changed
        this.state.beatCountChanged = true;
    }

    /**
     * The ring color
     */
    get color() {
        return colors[this.settings.colorName][500];
    }

    /**
     * The track color
     */
    get trackColor() {
        return colors[this.settings.colorName][900];
    }

    get instrument() {
        return this.settings.instrumentName;
    }

    set instrument(instrumentName: InstrumentName) {
        this.settings.instrumentName = instrumentName;
        switch (instrumentName) {
            case "kick":
                this.state.instrument = new Kick();
                break;
            case "snare":
                this.state.instrument = new Snare();
                break;
            case "sine":
                this.state.instrument = new Sine();
                break;
            default:
                break;
        }
    }
    /**
     * Play the current instrument
     *
     * @param time audioContext timestamp
     */
    play(time?: number) {
        this.state.instrument.play(time);
    }

    constructor(colorName: RingColor) {
        this.settings.colorName = colorName;
    }
}

export type { RingState, RingSettings };
export default Ring;
