import RingSettings from "./RingSettings";
import RingState from "./RingState";
import { appSettings, audioContext } from "./global";

interface BeatQueueItem {
    beatNumber: number;
    time: number;
}

class BeatScheduler {
    // Each scheduled beat is put into this queue
    // from where it is consumed during animation
    private beatQueue: BeatQueueItem[] = [];

    // Time of the next beat
    private nextBeatTime: number = 0;

    // Number of the current beat (0, 1, ...)
    public currentBeat: number = 0;

    // Time of the current beat
    public currentBeatTime: number = 0;

    // Number of the next beat (0, 1, ...)
    private nextBeat: number = 0;

    // State of the associated ring
    private ringState: RingState;

    // Settings of the associated ring
    private ringSettings: RingSettings;

    // How much ahead of time a
    // new beat is to be scheduled
    private scheduleAheadTime: number = 0.1;

    constructor(ringState: RingState, ringSettings: RingSettings) {
        this.ringState = ringState;
        this.ringSettings = ringSettings;
    }

    scheduleBeat(beatNumber: number, time: number) {
        this.beatQueue.push({ beatNumber, time });
    }

    incrementBeat() {
        // 1. beatCountChanged means the user has requested its change.
        // 2. beatCount may only be changed on completion of a full measure
        //    to avoid problems with timing.
        // 3. The 0th beat signifies the beginning of a new measure,
        //    hence the check
        if (this.ringState.beatCountChanged && this.nextBeat == 0) {
            this.ringState.currentBeatCount = this.ringSettings.beatCount,
            this.ringState.beatCountChanged = false;
            this.nextBeat = 0;
        }

        const beatDuration =
            appSettings.measureDuration / this.ringState.currentBeatCount;

        this.nextBeatTime += beatDuration;

        this.nextBeat =
            (this.nextBeat + 1) % this.ringState.currentBeatCount;
    }

    scheduleNewBeats() {
        // Schedule new beats until the last
        // scheduled beat is further in the future
        // than scheduleAheadTime
        while (
            this.nextBeatTime <
            audioContext.currentTime + this.scheduleAheadTime
        ) {
            // If the beater is paused, no need to schedule...
            if (!this.ringState.paused)
                this.scheduleBeat(this.nextBeat, this.nextBeatTime);
            // ...just increment
            this.incrementBeat();
        }
    }

    updateCurrentBeat() {
        const currentTime = audioContext.currentTime;

        // Until the queue only contains beats beyond currentTime
        while (
            this.beatQueue.length > 0 &&
            this.beatQueue[0].time <= currentTime
        ) {
            // ...update currentBeat...
            this.currentBeat = this.beatQueue[0].beatNumber;
            // ...update beatTime...
            this.currentBeatTime = this.beatQueue[0].time;
            // ...dequeue the beat...
            this.beatQueue.splice(0, 1);
            // ...and update state
            this.ringState.beatPlayed = false;
        }
    }
}

export default BeatScheduler;
