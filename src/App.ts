import { el, mount, unmount, RedomComponent } from 'redom';

import Beater from './Beater';
import { text, AppSettings } from './constants'

export default class App implements RedomComponent {

    private settings: AppSettings = {
        measureDuration: 2,
        maxBeaters: 6
    }

    private audioContext: AudioContext;

    private beatersContainer: HTMLElement;
    private beaters: Beater[];
    private newBeater: HTMLElement;

    private timerWorker: Worker;

    el: HTMLElement;

    constructor() {

        this.audioContext = new AudioContext();

        // Initializing with 2 beaters
        this.beaters = Array(2)
            .fill(() => this.createBeater())
            .map(f => f());

        this.el = el('div.app.main-container',
            el('h1#app-name', text.appName),
            this.beatersContainer = el('div#beaters-container',
                ...this.beaters,
                this.newBeater = el('button#new-beater',
                    el('i.mdi.mdi-plus-thick')
                )
            )
        );

        this.setupListeners();
        this.setupTimer();

    }

    setupListeners() {

        // Handle clicks on "new beater" button
        this.newBeater.addEventListener('click', () => {
            const beater = this.createBeater();
            this.beaters.push(beater);
            if(this.beaters.length >= this.settings.maxBeaters)
                this.newBeater.hidden = true;
            mount(this.beatersContainer, beater, this.newBeater);
        });

        // Clicking anywhere in the app...
        this.el.addEventListener('click', ev => {
            if(!(ev.target instanceof HTMLElement)
                // ...except beater settings menu...
            ||  ev.target.closest('div.beater-settings') != null
                // ...and beater settings button...
            ||  ev.target.closest('button.btn-beater-settings') != null
            ) return;

            // should hide ALL the open settings menus
            this.beaters.forEach(beater => {
                if(!beater.settingsMenu.hidden)
                    beater.settingsMenu.hide()
            });
        });

    }

    setupTimer() {

        // Importing like this enables webpack to deal with it
        this.timerWorker = new Worker(
            new URL('./timer.worker.ts', import.meta.url)
        );
        
        this.timerWorker.addEventListener('message', ev => {
            // If TICK is received from timer
            if(ev.data == 'tick') {
                // Call schedulers for all beaters
                this.beaters.forEach(
                    beater => beater.scheduler.scheduleNewBeats()
                );
            }
        });

    }

    createBeater() {
        return new Beater(this.audioContext, this.settings);
    }

    removeBeater(beaterId: number) {
        const beater = this.beaters.splice(
            this.beaters.findIndex(
                beater => beater.id == beaterId
            ), 1
        )[0];

        unmount(this.beatersContainer, beater);

    }

    init() {
        this.timerWorker.postMessage('start');
        mount(document.body, this)
    }

}

