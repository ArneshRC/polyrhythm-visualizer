import colors from "tailwindcss/colors";

import { Instrument, Kick } from "./Instrument";
import BeatScheduler from "../services/BeatScheduler";
import { RingColor } from "../constants";

interface RingSettings {
    beatCount: number;
    instrument: Instrument;
}

interface RingState {
    currentBeatCount: number;
    beatPlayed: boolean;
    beatCountChanged: boolean;
    paused: boolean;
}

class Ring {

    // This is used for ids
    static globalCount = 0;

    public settings: RingSettings = {
        beatCount: 4,
        instrument: new Kick()
    };

    public state: RingState = {
        paused: true,
        beatPlayed: false,
        beatCountChanged: false,
        currentBeatCount: this.settings.beatCount
    };

    // Generate an id
    public id = Ring.globalCount++;

    public colorName: RingColor;

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
        return colors[this.colorName][500];
    }

    /**
     * The track color
     */
    get trackColor() {
        return colors[this.colorName][900];
    }

    /**
     * Play the current instrument
     *
     * @param time audioContext timestamp
     */
    play(time?: number) {
        this.settings.instrument.play(time);
    }

    constructor(colorName: RingColor) {
        this.colorName = colorName;
    }
}

export type { RingState, RingSettings };
export default Ring;
