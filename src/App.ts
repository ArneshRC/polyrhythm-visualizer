import "./styles/index.css";
import { RedomComponent, el } from "redom";
import classNames from "classnames";
import Visualizer from "./components/Visualizer";
import Swal from "sweetalert2";
import colors from "tailwindcss/colors";
import { audioContext } from "./services/global";

class App implements RedomComponent {
    el: HTMLDivElement;
    private classes = {
        heading: classNames(["text-5xl", "mt-8", "font-display"]),
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
                el("h1", "Polyrhythm Visualizer", {
                    className: this.classes.heading
                }),
                (this.visualizer = new Visualizer())
            ],
            { className: this.classes.container }
        );
        this.timerWorker = this.setupTimer();
    }
    setupTimer() {
        const timerWorker = new Worker(
            new URL("./workers/timer.worker.ts", import.meta.url)
        );
        timerWorker.addEventListener("message", _event => {
            for (const ring of this.visualizer.activeRings) {
                ring.scheduler.scheduleNewBeats();
            }
        });
        return timerWorker;
    }

    async onmount() {
        await Swal.fire({
            icon: "info",
            title: "Welcome",
            text: "This is a rewrite of the original app with a completely new vision. Enjoy!",
            color: colors.neutral[300],
            background: colors.neutral[900],
            iconColor: colors.sky[300],
            confirmButtonColor: colors.blue[500]
        });
        if (audioContext.state == "suspended") audioContext.resume();
        this.timerWorker.postMessage("start");
        this.visualizer.init();
    }
}

export default App;
