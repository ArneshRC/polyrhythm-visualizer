import { RedomComponent, el, mount, unmount } from "redom";
import classNames from "classnames";
import Swal from "sweetalert2";
import colors from "tailwindcss/colors";

import { audioContext } from "./services/global";
import Visualizer from "./components/Visualizer";
import RingAdder from "./components/RingAdder";
import RingSettingsMenu from "./components/RingSettingsMenu";

class App implements RedomComponent {
    el: HTMLDivElement;
    private classes = {
        heading: classNames(["text-5xl", "mt-8", "font-display"]),
        container: classNames([
            "flex",
            "flex-col",
            "justify-center",
            "items-center"
        ]),
        visualizerContainer: classNames(["relative"])
    };
    timerWorker: Worker;

    visualizerContainer: HTMLDivElement;
    visualizer: Visualizer;
    ringAdder: RingAdder;
    currentRingSettingsMenu: RingSettingsMenu | null = null;
    constructor() {
        this.el = el(
            "div",
            [
                el("h1", "Polyrhythm Visualizer", {
                    className: this.classes.heading
                }),
                (this.visualizerContainer = el(
                    "div",
                    [
                        (this.visualizer = new Visualizer()),
                        (this.ringAdder = new RingAdder())
                    ],
                    { className: this.classes.visualizerContainer }
                ))
            ],
            { className: this.classes.container }
        );
        this.timerWorker = this.setupTimer();
    }

    async closeSettingsMenu() {
        if (this.currentRingSettingsMenu == null) return;
        await this.currentRingSettingsMenu.animateClose();
        unmount(this.visualizerContainer, this.currentRingSettingsMenu);
        this.currentRingSettingsMenu = null;
    }

    async openSettingsMenu(ringIdx: number, x: number, y: number) {
        await this.closeSettingsMenu();
        const ring = this.visualizer.activeRings[ringIdx];
        const ringId = ring.id;
        this.currentRingSettingsMenu = new RingSettingsMenu(
            ringId,
            ring.state,
            ring.settings,
            { x, y }
        );
        this.currentRingSettingsMenu.onBeatCountChange = newBeatCount => {
            ring.beatCount = newBeatCount;
        };
        this.currentRingSettingsMenu.onRingRemove = () => {
            this.visualizer.removeRing(ringId);
            this.closeSettingsMenu();
        };
        mount(this.visualizerContainer, this.currentRingSettingsMenu);
    }

    setupTimer() {
        const timerWorker = new Worker(
            new URL("./workers/timer.worker.ts", import.meta.url)
        );
        timerWorker.addEventListener("message", event => {
            if (event.data == "tick") {
                for (const ring of this.visualizer.activeRings) {
                    ring.scheduler.scheduleNewBeats();
                }
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
        this.ringAdder.onClick = () => {
            this.visualizer.addRing();
        };
        this.visualizer.onRingClick = (idx, x, y) => {
            this.openSettingsMenu(idx, x, y);
        };
        this.visualizer.onOutsideClick = () => {
            this.closeSettingsMenu();
        };
        document.addEventListener("click", event => {
            event.stopPropagation();
            if (
                this.currentRingSettingsMenu != null &&
                event.target instanceof Element &&
                document.body.contains(event.target) &&
                !this.currentRingSettingsMenu.el.contains(event.target) &&
                !this.visualizerContainer.contains(event.target)
            )
                this.closeSettingsMenu();
        });
    }
}

export default App;
