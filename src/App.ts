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

    el: HTMLElement;

    constructor() {

        this.audioContext = new AudioContext();

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

        this.setup();

    }

    private setup() {
        this.newBeater.addEventListener('click', () => {
            const beater = this.createBeater();
            this.beaters.push(beater);
            if(this.beaters.length >= this.settings.maxBeaters)
                this.newBeater.hidden = true;
            mount(this.beatersContainer, beater, this.newBeater);
        });
    }

    private createBeater() {
        const beater = new Beater(this.audioContext, this.settings);
        requestAnimationFrame( beater.drawFlashes.bind(beater) );
        return beater;
    }

    private removeBeater(beaterId: number) {
        const beater = this.beaters.splice(
            this.beaters.findIndex(
                beater => beater.id == beaterId
            ), 1
        )[0];

        unmount(this.beatersContainer, beater);

    }

    scheduleBeaters() {
        this.beaters.forEach(beater => beater.scheduler());
    }

    init() {
        this.beaters.forEach(beater =>
            requestAnimationFrame(
                 beater.drawFlashes.bind(beater)
            )
        );
        const timerWorker = new Worker(
            new URL('./timer.worker.ts', import.meta.url)
        );
        timerWorker.addEventListener('message', ev => {
            if(ev.data == 'tick') {
                this.scheduleBeaters();
            }
        });
        this.el.addEventListener('click', ev => {
            if(!(ev.target instanceof HTMLElement)
            || ev.target.closest('div.beater-settings') != null
            || ev.target.closest('button.btn-beater-settings') != null) return;

            this.beaters.forEach(beater => { if(!beater.settingsMenu.hidden) beater.settingsMenu.hide() })
        });
        timerWorker.postMessage('start');
        mount(document.body, this)
    }

}

