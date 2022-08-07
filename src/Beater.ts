import { el, RedomComponent, setAttr, mount, unmount } from 'redom';
import { startCase } from 'lodash';

import { Instrument, Kick, Sine, Snare } from './Instrument';
import { instrumentNames, AppSettings, BeaterSettings, BeatQueueItem, InstrumentName } from './constants'

import { sleep } from './utils';

class BeatScheduler {

    private beater: Beater;

    // Each scheduled beat is put into a queue
    // from which it is consumed during animation
    private beatQueue: BeatQueueItem[] = [];

    // Time of the next beat
    private nextBeatTime: number = 0;

    // Number of the next beat (0, 1, ...)
    private nextBeat: number = 0;

    // How much ahead of time a
    // new beat is to be scheduled
    private scheduleAheadTime: number = 0.1;

    constructor(beater: Beater) {
        this.beater = beater;
    }

    scheduleBeat(beatNumber: number, time: number) {
        this.beatQueue.push({ beatNumber, time });
        this.beater.play(time);
    }

    incrementBeat() {
        // 1. Non-zero newBeatCount means the user has requested its change.
        // 2. beatCount may only be changed on completion of a full measure
        //    to avoid problems with timing.
        // 3. The 0th beat signifies the beginning of a new measure,
        //    hence the check
        if(this.beater.settings.newBeatCount > 0 && this.nextBeat == 0) {
            this.beater.settings.currentBeatCount = this.beater.settings.newBeatCount;
            this.beater.settings.newBeatCount = 0;
            this.nextBeat = 0;
        }

        const beatDuration = (
            this.beater.appSettings.measureDuration /
            this.beater.settings.currentBeatCount
        );

        this.nextBeatTime += beatDuration;

        this.nextBeat = (this.nextBeat + 1) % this.beater.settings.currentBeatCount;
    }

    scheduleNewBeats() {

        // Schedule new beats until the last
        // scheduled beat is further in the future
        // than scheduleAheadTime
        while(
            this.nextBeatTime < (
                this.beater.audioContext.currentTime +
                this.scheduleAheadTime
            )
        ) {
            // If the beater is paused, no need to schedule...
            if(!this.beater.isPaused)
                this.scheduleBeat(this.nextBeat, this.nextBeatTime);
            // ...just increment
            this.incrementBeat();
        }
            
    }

    newBeatReady() {

        // -1 is arbitrary; beatTime is supposed to hold
        // the starting time of the upcoming beat
        let beatTime: number = -1;
        const currentTime = this.beater.audioContext.currentTime;

        // Until the queue only contains beats beyond currentTime
        while(this.beatQueue.length > 0 && this.beatQueue[0].time <= currentTime) {
            // ...update currentBeat...
            this.beater.currentBeat = this.beatQueue[0].beatNumber;
            // ...and beatTime...
            beatTime = this.beatQueue[0].time;
            // ...and dequeue
            this.beatQueue.splice(0, 1);
        }

        // 0.03 has been determined experimentally
        // to be more than the upper limit of
        // the margin of error (as in the difference
        // between current time and scheduled time
        // has been always found to be less than this)
        //
        // However, unless this authenticity of this
        // value can be verified, it is probably not
        // a good idea, so...
        //
        // @TODO work on a better implementation
        return currentTime - beatTime < 0.03;

    }

}

class BeatNumberDisplay implements RedomComponent {

    public parent: Beater;

    public el: HTMLElement;

    constructor(currentBeat: number, parent: Beater) {
        this.el = el('div.beat-number', currentBeat);
        // 0 signifies the beginning of a new measure
        if(currentBeat == 0)
            this.el.classList.add('major-beat');
        this.parent = parent;
    }

    async onmount() {
        await sleep(1000);
        unmount(this.parent.el, this);
    }

}

class BeaterSettingsMenu implements RedomComponent {

    public parent: Beater;
    private instrumentInput: HTMLSelectElement;
    private beatCountInput: HTMLInputElement;

    public el: HTMLElement;

    constructor(beater: Beater) {

        this.parent = beater;

        this.el = el('div.beater-settings.hidden',
            this.instrumentInput = el('select.beater-instrument',
                ...instrumentNames.map(instrumentName =>
                    el('option',
                       { value: instrumentName },
                       startCase(instrumentName)
                    )
                )
            ) as HTMLSelectElement,
            this.beatCountInput = el('input', {
                type: 'number',
                min: 1, max: 10,
                value: this.parent.settings.newBeatCount != 0
                    ? this.parent.settings.newBeatCount
                    : this.parent.settings.currentBeatCount
            })
        );

    }

    onmount() {

        this.instrumentInput.addEventListener('change', _ev => {
            const instrumentName = this.instrumentInput.value as InstrumentName;
            this.parent.changeInstrument(instrumentName);
        });

        this.beatCountInput.addEventListener('change', _ev => {
            this.parent.settings.newBeatCount = parseInt(this.beatCountInput.value);
        });

    }

    get hidden() {
        return this.el.classList.contains('hidden');
    }

    show() {
        this.el.classList.remove('hidden');
    }

    hide() {
        this.el.classList.add('hidden');
    }

}

export default class Beater implements RedomComponent {

    public settings: BeaterSettings = {
        currentBeatCount: 4,
        newBeatCount: 0,
        instrumentName: 'kick'
    };

    public appSettings: AppSettings;

    public audioContext: AudioContext;

    private instrument: Instrument;

    public buttonsContainer: HTMLElement;
    private playButton: HTMLElement;
    private playButtonIcon: HTMLElement;
    private settingsButton: HTMLElement;
    private settingsIcon: HTMLElement;
    public settingsMenu: BeaterSettingsMenu;

    public currentBeat = -1;
    public scheduler: BeatScheduler;

    public el: HTMLElement;

    public isPaused: boolean;

    public id: number;
    static newId = 0;

    constructor(audioContext: AudioContext, appSettings: AppSettings) {

        this.audioContext = audioContext;

        this.id = Beater.newId++;

        this.isPaused = true;

        // Pick default instrument
        this.changeInstrument();

        this.appSettings = appSettings;

        this.scheduler = new BeatScheduler(this);

        this.el = el('div.beater',
            this.buttonsContainer = el('div.beater-buttons',
                this.playButton = el('button.btn-beater-play',
                    this.playButtonIcon = el('i.mdi.mdi-play')
                ),
                this.settingsButton = el('button.btn-beater-settings',
                    this.settingsIcon = el('i.mdi.mdi-cog')
                )
            ),
            this.settingsMenu = new BeaterSettingsMenu(this)
        );

        this.el.dataset.id = String(this.id);
        this.el.dataset.paused = String(this.isPaused);

        this.setupListeners();

        // Start animation loop
        requestAnimationFrame( this.animateWhenReady.bind(this) );

    }

    setupListeners() {

        this.playButton.addEventListener('click', _ev => {
            this.togglePaused();
        });

        this.settingsButton.addEventListener('click', _ev => {
            this.settingsMenu.show();
        });

    }

    changeInstrument(instrumentName: InstrumentName = 'kick') {

        this.settings.instrumentName = instrumentName;

        switch(instrumentName) {
            case 'sine':
                this.instrument = new Sine(this.audioContext);
                break;
            case 'snare':
                this.instrument = new Snare(this.audioContext);
                break;
            case 'kick':
            default:
                this.instrument = new Kick(this.audioContext);
                break;
        }

    }

    togglePaused() {

        this.isPaused = !this.isPaused;
        this.el.dataset.paused = String(this.isPaused);

        if(this.isPaused)
            setAttr(this.playButtonIcon, { className: 'mdi mdi-play' });
        else
            setAttr(this.playButtonIcon, { className: 'mdi mdi-pause' });

    }
    
    play(time: number) {
        this.instrument.play(time);
    }

    async pulsate(currentBeat: number) {

        const className = currentBeat == 0
            ? 'major-beat' : 'minor-beat';

        this.buttonsContainer.classList.add(className);
        await sleep(100);
        this.buttonsContainer.classList.remove(className);

    }

    animateWhenReady() {
        if(this.scheduler.newBeatReady()) {
            this.pulsate(this.currentBeat);
            mount(this, new BeatNumberDisplay(this.currentBeat, this));
        }
        requestAnimationFrame(this.animateWhenReady.bind(this));
    }

}

