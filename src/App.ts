import { RedomComponent, el, mount, setChildren, text, unmount } from "redom";
import classNames from "classnames";
import { findIndex } from "lodash";

import { appSettings, audioContext } from "./services/global";
import Visualizer from "./components/Visualizer";
import RingAdder from "./components/RingAdder";
import RingSettingsMenu from "./components/RingSettingsMenu";
import { swap } from "./utils";
import { EASE_IN_OUT, Scene } from "scenejs";

class App implements RedomComponent {
    el: HTMLDivElement;

    private classes = new (class {
        get heading() {
            return classNames([
                "text-5xl",
                "mt-8",
                "font-display",
                "text-center"
            ]);
        }
        get description() {
            return classNames(["font-sans", "my-6", "mx-4", "text-base", "text-center"]);
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
    private timerWorker: Worker;

    // Components
    private description: HTMLDivElement;
    private visualizerContainer: HTMLDivElement;
    private visualizer: Visualizer;
    private ringAdder: RingAdder;
    private currentRingSettingsMenu: RingSettingsMenu | null = null;

    constructor() {
        this.visualizer = new Visualizer();
        this.ringAdder = new RingAdder();

        // Contains visualizer and ring adder
        this.visualizerContainer = el(
            "div",
            [this.visualizer, this.ringAdder],
            {
                id: "visualizer-container",
                className: this.classes.visualizerContainer
            }
        );

        this.el = el(
            "div",
            [
                el("h1", "Polyrhythm Visualizer", {
                    id: "heading",
                    className: this.classes.heading
                }),
                (this.description = el(
                    "div",
                    "Click any ring to configure it. Click the '+' button to add a new ring.",
                    {
                        id: "description",
                        className: this.classes.description
                    }
                )),
                this.visualizerContainer
            ],
            { className: this.classes.container }
        );

        this.timerWorker = this.setupTimer();
    }

    /**
     * Close the currently open ring settings menu
     */
    private async closeRingSettingsMenu() {
        // Do nothing if no ring settings menu is open
        if (this.currentRingSettingsMenu == null) return;

        const prevRingSettingsMenu = this.currentRingSettingsMenu;
        this.currentRingSettingsMenu = null;
        await prevRingSettingsMenu.animateClose();
        unmount(this.visualizerContainer, prevRingSettingsMenu);
    }

    private async openRingSettingsMenu(ringId: number, x: number, y: number) {
        // Close the currently open ring settings menu first
        this.closeRingSettingsMenu();

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
            // If number of rings is equal to maxRings
            if (
                this.visualizer.state.activeRings.length <= appSettings.maxRings
            ) {
                // Show the ring adder
                this.ringAdder.show();
                // Accordingly update description
                setChildren(this.description, [
                    text(
                        "Click any ring to configure it. Click the '+' button to add a new ring."
                    )
                ]);
            }
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
    private setupTimer() {
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
        // Start the timer
        this.timerWorker.postMessage("start");

        // Initialize the visualizer
        this.visualizer.init();

        // When ring adder button is clicked
        this.ringAdder.onClick = () => {
            // Add a ring
            this.visualizer.addRing();
            // If maxRings has been reached...
            if (
                this.visualizer.state.activeRings.length >= appSettings.maxRings
            ) {
                // ... hide the ring adder
                this.ringAdder.hide();
                // ... and accordingly update description
                setChildren(this.description, [
                    text("Click any ring to configure it.")
                ]);
            }
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
            // Resume the audioContext if it is suspended.
            // An audioContext can't start without user interaction.
            // Since this audioContext is global, it is started before
            // any user interaction, and ends up in the suspended state.
            if (audioContext.state == "suspended") audioContext.resume();

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

        new Scene(
            {
                "#heading": {
                    0.3: {
                        opacity: 0,
                        transform: {
                            scale: 0,
                            translateY: "10rem"
                        }
                    },
                    1: {
                        opacity: 1,
                        transform: {
                            scale: 1,
                            translateY: "0rem"
                        }
                    }
                },
                "#description": {
                    0.8: {
                        opacity: 0
                    },
                    1.3: {
                        opacity: 1
                    }
                },
                "#visualizer": {
                    0: {
                        opacity: 0,
                        scale: 0.2
                    },
                    0.8: {
                        opacity: 1,
                        scale: 1.1
                    },
                    1: {
                        scale: 0.95
                    },
                    1.3: {
                        scale: 1
                    }
                },
                "#ring-adder": {
                    0.5: {
                        opacity: 0
                    },
                    1: {
                        opacity: 1
                    }
                }
            },
            {
                fillMode: "forwards",
                selector: true,
                easing: EASE_IN_OUT
            }
        ).playCSS();
    }
}

export default App;
