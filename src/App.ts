import "./styles/index.css";
import { RedomComponent, el } from "redom";
import classNames from "classnames";
import Visualizer from "./components/Visualizer";

class App implements RedomComponent {
    el: HTMLDivElement;
    private classes = {
        img: classNames(["logo", "vanilla"]),
        heading: classNames([
            "text-5xl",
            "mt-8"
        ]),
        container: classNames([
            "flex",
            "flex-col",
            "justify-center",
            "items-center"
        ])
    };
    visualizer: Visualizer;
    timerWorker: Worker;
    constructor() {
        this.el = el(
            "div",
            [
                el("h1", "Polyrhythm Visualizer", { className: this.classes.heading }),
                (this.visualizer = new Visualizer())
            ],
            { className: this.classes.container }
        );
        this.timerWorker = this.setupTimer();
    }
    setupTimer() {
        const timerWorker = new Worker(new URL('./workers/timer.worker.ts', import.meta.url))
        timerWorker.addEventListener('message', _event => {
            for(const ring of this.visualizer.activeRings) {
                ring.scheduler.scheduleNewBeats();
            }
        });
        return timerWorker;
    }
    onmount() {
        this.timerWorker.postMessage('start');
        this.visualizer.init();
    }
}

export default App;
