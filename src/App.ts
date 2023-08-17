import { RedomComponent, el, mount, unmount } from "redom";
import classNames from "classnames";
import Swal from "sweetalert2";
import colors from "tailwindcss/colors";
import { findIndex } from "lodash";

import { audioContext } from "./services/global";
import Visualizer from "./components/Visualizer";
import RingAdder from "./components/RingAdder";
import RingSettingsMenu from "./components/RingSettingsMenu";
import { swap } from "./utils";

class App implements RedomComponent {

    el: HTMLDivElement;

    private classes = new (class {
        get heading() {
            return classNames([
                "text-5xl",
                "my-8",
                "font-display",
                "text-center"
            ]);
        }
        get container() {
            return classNames([
                "flex",
                "flex-col",
                "justify-center",
                "items-center"
            ]);
        }
        get visualizerContainer() {
            return classNames(["relative"]);
        }
    })();

    // Timer worker
    timerWorker: Worker;

    // Components
    visualizerContainer: HTMLDivElement;
    visualizer: Visualizer;
    ringAdder: RingAdder;
    currentRingSettingsMenu: RingSettingsMenu | null = null;

    constructor() {
        this.visualizer = new Visualizer();
        this.ringAdder = new RingAdder();

        // Contains visualizer and ring adder
        this.visualizerContainer = el("div", [
            this.visualizer, this.ringAdder
        ], { className: this.classes.visualizerContainer  });

        this.el = el(
            "div",
            [
                el("h1", "Polyrhythm Visualizer", {
                    className: this.classes.heading
                }),
                this.visualizerContainer
            ],
            { className: this.classes.container }
        );

        this.timerWorker = this.setupTimer();
    }

    /**
     * Close the currently open ring settings menu
     */
    async closeRingSettingsMenu() {

        // Do nothing if no ring settings menu is open
        if (this.currentRingSettingsMenu == null) return;

        await this.currentRingSettingsMenu.animateClose();
        unmount(this.visualizerContainer, this.currentRingSettingsMenu);
        this.currentRingSettingsMenu = null;

    }

    async openRingSettingsMenu(ringId: number, x: number, y: number) {

        // Close the currently open ring settings menu first
        await this.closeRingSettingsMenu();

        const activeRings = this.visualizer.state.activeRings;
        const ringIdx = findIndex(activeRings, { id: ringId });
        const ring = this.visualizer.state.activeRings[ringIdx];

        this.currentRingSettingsMenu = new RingSettingsMenu(
            ringId,
            ring.state,
            ring.settings,
            { x, y }
        );

        this.currentRingSettingsMenu.onBeatCountChange = newBeatCount => {
            // Change the beat count via setter
            ring.beatCount = newBeatCount;
        };

        this.currentRingSettingsMenu.onRingRemove = () => {
            this.visualizer.removeRing(ringId);
            this.closeRingSettingsMenu();
        };

        this.currentRingSettingsMenu.onRingReorder = moveUp => {
            // Need to find ringIdx again because
            // it may have changed after a reorder
            const ringIdx = findIndex(activeRings, ring);

            // Make sure last ring can't be moved up
            // and first ring can't be moved down
            if (
                (moveUp && ringIdx == activeRings.length - 1) ||
                (!moveUp && ringIdx == 0)
            )
                return;

            // Move up or down by swapping
            swap(activeRings, ringIdx, moveUp ? ringIdx + 1 : ringIdx - 1);
        };

        mount(this.visualizerContainer, this.currentRingSettingsMenu);

    }

    /**
     * Setup the timer worker
     */
    setupTimer() {

        const timerWorker = new Worker(
            // Importing in this way enables vite to deal with it
            new URL("./workers/timer.worker.ts", import.meta.url)
        );

        // When a message is received
        timerWorker.addEventListener("message", event => {
            // Check if it is a tick
            if (event.data == "tick") {
                // And accordingly schedule new beats
                for (const ring of this.visualizer.state.activeRings) {
                    ring.scheduler.scheduleNewBeats();
                }
            }
        });

        return timerWorker;

    }

    async onmount() {

        // Greet user
        await Swal.fire({
            icon: "info",
            title: "Welcome",
            text: "This is a rewrite of the original app with a completely new vision. Enjoy!",
            color: colors.neutral[300],
            background: colors.neutral[900],
            iconColor: colors.sky[300],
            confirmButtonColor: colors.blue[500]
        });

        // Workaround. An audioContext can't start without
        // user interaction. Since this audioContext is global, 
        // it is started before any user interaction, and ends
        // up in the suspended state.
        if (audioContext.state == "suspended") audioContext.resume();

        // Start the timer
        this.timerWorker.postMessage("start");

        // Initialize the visualizer
        this.visualizer.init();

        // When ring adder button is clicked
        this.ringAdder.onClick = () => {
            // Add a ring
            this.visualizer.addRing();
        };

        // When a ring is clicked
        this.visualizer.onRingClick = (idx, x, y) => {
            // Get its id
            const ringId = this.visualizer.state.activeRings[idx].id;
            // Open the corresponding settings menu
            this.openRingSettingsMenu(ringId, x, y);
        };

        // When the click is outside the rings
        // somewhere inside the canvas
        this.visualizer.onOutsideClick = () => {
            // Close the currently open settings menu
            this.closeRingSettingsMenu();
        };

        // When the click is anywhere in the document
        document.addEventListener("click", event => {
            if (
                // There must be currently open settings menu
                this.currentRingSettingsMenu != null &&
                // Just to appease typescript
                event.target instanceof Element &&
                // This helps in case the clicked element gets removed
                document.body.contains(event.target) &&
                // The click should not be inside the currently open settings menu
                !this.currentRingSettingsMenu.el.contains(event.target) &&
                // The click should not be inside the visualizer
                // (we've handled this before)
                !this.visualizerContainer.contains(event.target)
            )
                this.closeRingSettingsMenu();
        });
    }
}

export default App;
