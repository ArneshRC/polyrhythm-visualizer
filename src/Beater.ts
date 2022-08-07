import { el, RedomComponent, setAttr, mount, unmount } from 'redom';
import { startCase } from 'lodash';

import { Instrument, Kick, Sine, Snare } from './Instrument';
import { instrumentNames, AppSettings, BeaterSettings, BeatQueueItem, InstrumentName } from './constants'

import { sleep } from './utils';

class BeatNumberDisplay implements RedomComponent {

    private parent: Beater;
    el: HTMLElement;

    constructor(currentBeat: number, parent: Beater) {
        this.el = el('div.beat-number', currentBeat);
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

    private parent: Beater;
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
                value: this.parent.newBeatCount != 0
                    ? this.parent.newBeatCount
                    : this.parent.settings.beatCount
            })
        );

    }

    onmount() {

        this.instrumentInput.addEventListener('change', _ev => {
            const instrumentName = this.instrumentInput.value as InstrumentName;
            this.parent.changeInstrument(instrumentName);
        });

        this.beatCountInput.addEventListener('change', _ev => {
            this.parent.changeBeatCount(parseInt(this.beatCountInput.value));
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
        beatCount: 4,
        instrumentName: 'kick'
    };

    private appSettings: AppSettings;

    private audioContext: AudioContext;

    private instrument: Instrument;

    private buttonsContainer: HTMLElement;
    private playButton: HTMLElement;
    private playButtonIcon: HTMLElement;
    private settingsButton: HTMLElement;
    private settingsIcon: HTMLElement;
    public settingsMenu: BeaterSettingsMenu;


    public el: HTMLElement;

    public isPaused: boolean;

    public id: number;
    static newId = 0;

    private beatQueue: BeatQueueItem[] = [];
    private nextBeatTime: number = 0;
    private nextBeat: number = 0;
    private lastBeatDrawn: number = -1;
    private scheduleAheadTime: number = 0.1;
    public newBeatCount: number = 0;

    constructor(audioContext: AudioContext, appSettings: AppSettings) {

        this.audioContext = audioContext;

        this.settings.instrumentName = 'kick';
        this.instrument = new Kick(this.audioContext);

        this.id = Beater.newId++;

        this.isPaused = true;

        this.appSettings = appSettings;

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

        this.setup();

    }

    setup() {

        this.playButton.addEventListener('click', _ev => {
            this.togglePaused();
        });

        this.settingsButton.addEventListener('click', _ev => {
            this.settingsMenu.show();
        });

    }

    changeInstrument(instrumentName: InstrumentName) {

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

    changeBeatCount(beatCount: number) {
        this.newBeatCount = beatCount;
    }

    togglePaused() {

        this.isPaused = !this.isPaused;
        this.el.dataset.paused = String(this.isPaused);

        if(this.isPaused)
            setAttr(this.playButtonIcon, { className: 'mdi mdi-play' });
        else
            setAttr(this.playButtonIcon, { className: 'mdi mdi-pause' });

    }
    
    scheduleBeat(beatNumber: number, time: number) {
        this.beatQueue.push({ beatNumber, time });
        this.instrument.play(time);
    }

    incrementBeat() {

        if(this.newBeatCount > 0 && this.nextBeat == 0) {
            this.settings.beatCount = this.newBeatCount;
            this.newBeatCount = 0;
            this.nextBeat = 0;
        }

        const beatDuration = this.appSettings.measureDuration / this.settings.beatCount;

        this.nextBeatTime += beatDuration;

        this.nextBeat = (this.nextBeat + 1) % this.settings.beatCount;

    }

    drawFlashes() {
        let currentBeat = this.lastBeatDrawn;
        let beatTime;
        const currentTime = this.audioContext.currentTime;

        while(this.beatQueue.length > 0 && this.beatQueue[0].time < currentTime) {
            currentBeat = this.beatQueue[0].beatNumber;
            beatTime = this.beatQueue[0].time;
            this.beatQueue.splice(0, 1);
        }

        if(this.lastBeatDrawn != currentBeat || beatTime - currentTime < 0.001) {

            this.flash(currentBeat);

            this.lastBeatDrawn = currentBeat;

        }

        requestAnimationFrame(this.drawFlashes.bind(this));

    }

    async flash(currentBeat: number) {

        this.buttonsContainer.classList.add(
            currentBeat == 0
            ? 'major-beat' : 'minor-beat'
        );
        mount(this.el, new BeatNumberDisplay(currentBeat, this));
        await sleep(100);
        this.buttonsContainer.classList.remove(
            currentBeat == 0
            ? 'major-beat' : 'minor-beat'
        )

    }

    scheduler() {

        while(this.nextBeatTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            if(!this.isPaused)
                this.scheduleBeat(this.nextBeat, this.nextBeatTime);
            this.incrementBeat();
        }
            
    }

}

