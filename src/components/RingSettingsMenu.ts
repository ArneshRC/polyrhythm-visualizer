import { RedomComponent, el, setAttr, setChildren } from "redom";
import classNames from "classnames";
import { inRange } from "lodash";
import {
    mdiPlay,
    mdiPause,
    mdiDelete,
    mdiChevronUp,
    mdiChevronDown
} from "@mdi/js";

import { RingSettings, RingState } from "../utils/Ring";
import Icon from "./Icon";
import { Coords } from "../constants";
import { EASE, Scene } from "scenejs";
import { sleep } from "../utils";

class RingSettingsMenu implements RedomComponent {
    el: HTMLDivElement;

    private classes = new (class {
        #button = [
            "rounded-md",
            "h-10",
            "text-neutral-900",
            "font-semibold",
            "flex",
            "justify-center",
            "items-center",
            "px-1",
            "transition-all",
            "focus:outline-none"
        ];
        get container() {
            return classNames([
                "flex",
                "flex-col",
                "rounded-md",
                "p-3",
                "bg-neutral-800",
                "w-28",
                "absolute",
                "gap-2",
                "shadow-md"
            ]);
        }
        get ringIdContainer() {
            return classNames(["text-center", "text-sm"]);
        }
        getPlayPause(paused: boolean) {
            return classNames([...this.#button], {
                "bg-yellow-200": !paused,
                "bg-blue-300": paused
            });
        }
        get delete() {
            return classNames([...this.#button, "bg-red-300"]);
        }
        get buttonsContainer() {
            return classNames(["grid", "grid-cols-2", "gap-2"]);
        }
        get beatCountInput() {
            return classNames([
                "rounded-md",
                "h-10",
                "font-semibold",
                "text-neutral-400",
                "bg-neutral-700",
                "px-3",
                "focus:outline-none"
            ]);
        }
        get reorderButton() {
            return classNames([...this.#button, "bg-neutral-300"]);
        }
    })();

    // Properties
    ringId: number;
    ringSettings: RingSettings;
    ringState: RingState;
    position: Coords;

    // Components
    playPauseButton: HTMLButtonElement;
    buttonsContainer: HTMLDivElement;
    deleteButton: HTMLButtonElement;
    beatCountInput: HTMLInputElement;
    moveUpButton: HTMLButtonElement;
    moveDownButton: HTMLButtonElement;

    constructor(
        ringId: number,
        ringState: RingState,
        ringSettings: RingSettings,
        position: Coords
    ) {
        this.ringId = ringId;
        this.ringState = ringState;
        this.ringSettings = ringSettings;
        this.position = position;

        const paused = this.ringState.paused;

        // Play/pause button
        this.playPauseButton = el(
            "button",
            // Set icon based on whether the ring is playing or not
            paused ? [new Icon(mdiPlay)] : [new Icon(mdiPause)],
            {
                className: this.classes.getPlayPause(paused)
            }
        );

        // Delete button
        this.deleteButton = el("button", [new Icon(mdiDelete)], {
            className: this.classes.delete
        });

        // Reorder buttons
        this.moveUpButton = el("button", [new Icon(mdiChevronUp)], {
            className: this.classes.reorderButton
        });
        this.moveDownButton = el("button", [new Icon(mdiChevronDown)], {
            className: this.classes.reorderButton
        });

        // Grid container for buttons
        this.buttonsContainer = el(
            "div",
            [
                this.playPauseButton,
                this.deleteButton,
                this.moveUpButton,
                this.moveDownButton
            ],
            {
                className: this.classes.buttonsContainer
            }
        );

        // Beat count input
        // @TODO Change to +/- buttons
        this.beatCountInput = el("input", {
            className: this.classes.beatCountInput,
            value: this.ringState.currentBeatCount,
            min: 1,
            max: 8
        });

        this.el = el(
            "div",
            [
                el("span", `Ring #${ringId}`, {
                    className: this.classes.ringIdContainer
                }),
                this.buttonsContainer,
                this.beatCountInput
            ],
            {
                id: `ring-settings-${ringId}`,
                className: this.classes.container
            }
        );

        // Set the position of the menu
        // according to click position
        this.el.setAttribute(
            "style",
            `top: calc(50% - (${position.y}px)); left: calc(50% - (${position.x}px));`
        );
    }

    /**
     * Set up event handlers
     */
    setupHandlers() {
        // When the play/pause button is clicked
        this.playPauseButton.addEventListener("click", () => {
            let paused = this.ringState.paused;
            // Toggle paused state
            paused = !paused;
            // Set new paused state
            this.ringState.paused = paused;
            // Change classes
            setAttr(
                this.playPauseButton,
                "className",
                this.classes.getPlayPause(paused)
            );
            // Change icon
            setChildren(
                this.playPauseButton,
                paused ? [new Icon(mdiPlay)] : [new Icon(mdiPause)]
            );
        });

        // When the delete button is clicked
        this.deleteButton.addEventListener("click", () => {
            // Invoke the ring remove handler
            this.ringRemoveHandler();
        });

        // When the beatCountInput is updated
        this.beatCountInput.addEventListener("input", () => {
            // Parse the value
            const newBeatCount = parseInt(this.beatCountInput.value);
            // Check if the value is in range
            if (!inRange(newBeatCount, 1, 9)) return;
            // Invoke the beat count change handler
            this.beatCountChangeHandler(newBeatCount);
        });

        // When the move up button is clicked
        this.moveUpButton.addEventListener("click", () => {
            // Invoke the ring reorder handler with moveUp: true
            this.ringReorderHandler(true);
        });

        // When the move down button is clicked
        this.moveDownButton.addEventListener("click", () => {
            // Invoke the ring reorder handler with moveUp: false
            this.ringReorderHandler(false);
        });
    }

    /**
     * @TODO Animate when the menu is open
     */
    async animateOpen() {
        this.el.classList.add("opening");
        new Scene(
            {
                [`#ring-settings-${this.ringId}`]: {
                    0: {
                        opacity: 0,
                        transform: {
                            translateX: "-40%",
                            translateY: "-40%",
                            scale: 0.2
                        }
                    },
                    0.2: {
                        opacity: 1,
                        transform: {
                            translateX: "0%",
                            translateY: "0%",
                            scale: 1
                        }
                    }
                }
            },
            {
                selector: true,
                fillMode: "forwards",
                iterationCount: 1,
                easing: EASE
            }
        ).playCSS();
        await sleep(200);
        this.el.classList.remove("opening");
    }

    /**
     * @TODO Animate when the menu is closed
     */
    async animateClose() {
        this.el.classList.add("closing");
        const scene = new Scene(
            {
                [`#ring-settings-${this.ringId}.closing`]: {
                    0: {
                        opacity: 1,
                        transform: {
                            translateX: "0%",
                            translateY: "0%",
                            scale: 1
                        }
                    },
                    0.2: {
                        opacity: 0,
                        transform: {
                            translateX: "-40%",
                            translateY: "-40%",
                            scale: 0.2
                        }
                    }
                }
            },
            {
                selector: true,
                fillMode: "forwards",
                iterationCount: 1,
                easing: EASE
            }
        ).playCSS();
        await sleep(200);
        this.el.classList.remove("closing");
        scene.clear();
    }

    private ringRemoveHandler: () => void = () => {};
    set onRingRemove(ringRemoveHandler: () => void) {
        this.ringRemoveHandler = ringRemoveHandler;
    }

    private beatCountChangeHandler: (newBeatCount: number) => void = () => {};
    set onBeatCountChange(
        beatCountChangeHandler: (newBeatCount: number) => void
    ) {
        this.beatCountChangeHandler = beatCountChangeHandler;
    }
    private ringReorderHandler: (moveUp: boolean) => void = () => {};
    set onRingReorder(ringReorderHandler: (moveUp: boolean) => void) {
        this.ringReorderHandler = ringReorderHandler;
    }

    async onmount() {
        this.setupHandlers();
        await this.animateOpen();
    }
}

export default RingSettingsMenu;
