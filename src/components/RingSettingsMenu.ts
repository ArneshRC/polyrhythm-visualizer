import { RedomComponent, el, text, setAttr, setChildren } from "redom";
import classNames from "classnames";
import {
    mdiPlay,
    mdiPause,
    mdiDelete,
    mdiChevronUp,
    mdiChevronDown,
    mdiPlus,
    mdiMinus
} from "@mdi/js";

import { RingSettings, RingState } from "../utils/Ring";
import Icon from "./Icon";
import { Coords, RingColor, instrumentNames, ringColors } from "../constants";
import { EASE, Scene } from "scenejs";
import { sleep } from "../utils";
import { visualizerState } from "../services/global";
import { capitalize, findIndex, indexOf } from "lodash";
import { Kick, Sine, Snare } from "../utils/Instrument";

class RingSettingsMenu implements RedomComponent {
    el: HTMLDivElement;

    private classes = new (class {
        #button = [
            "rounded-md",
            "h-10",
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
                "w-40",
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
            return classNames(["grid", "grid-cols-3", "gap-2"]);
        }
        get reorderButton() {
            return classNames([...this.#button, "bg-neutral-300"]);
        }
        get beatCountButton() {
            return classNames([...this.#button, "bg-slate-300"]);
        }
        get beatCountDisplay() {
            return classNames([
                ...this.#button,
                "bg-neutral-700",
                "text-neutral-400",
                "col-span-2"
            ]);
        }
        get ringIdxDisplay() {
            return classNames([
                ...this.#button,
                "bg-neutral-700",
                "text-neutral-400"
            ]);
        }
        get instrumentButton() {
            return classNames([
                ...this.#button,
                "bg-emerald-200",
                "text-neutral-800",
                "col-span-2"
            ]);
        }
        getColorButton(color: RingColor) {
            return classNames([...this.#button], {
                "bg-red-600": color == "red",
                "bg-sky-600": color == "sky",
                "bg-blue-600": color == "blue",
                "bg-green-600": color == "green",
                "bg-yellow-600": color == "yellow",
                "bg-purple-600": color == "purple"
            });
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
    moveUpButton: HTMLButtonElement;
    moveDownButton: HTMLButtonElement;
    incBeatCountButton: HTMLButtonElement;
    decBeatCountButton: HTMLButtonElement;
    beatCountDisplay: HTMLDivElement;
    ringIdxDisplay: HTMLDivElement;
    instrumentButton: HTMLButtonElement;
    colorButton: HTMLButtonElement;

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

        // Beat count modification buttons
        this.incBeatCountButton = el("button", [new Icon(mdiPlus)], {
            className: this.classes.beatCountButton
        });
        this.decBeatCountButton = el("button", [new Icon(mdiMinus)], {
            className: this.classes.beatCountButton
        });

        this.beatCountDisplay = el(
            "div",
            [text(this.ringSettings.beatCount.toString())],
            {
                className: this.classes.beatCountDisplay
            }
        );

        this.ringIdxDisplay = el(
            "div",
            [
                text(
                    (
                        1 +
                        findIndex(visualizerState.activeRings, {
                            id: this.ringId
                        })
                    ).toString()
                )
            ],
            {
                className: this.classes.ringIdxDisplay
            }
        );

        this.instrumentButton = el(
            "button",
            [capitalize(this.ringSettings.instrumentName)],
            {
                className: this.classes.instrumentButton
            }
        );

        this.colorButton = el("button", {
            className: this.classes.getColorButton(this.ringSettings.colorName)
        });

        // Grid container for buttons
        this.buttonsContainer = el(
            "div",
            [
                this.playPauseButton,
                this.deleteButton,
                this.moveUpButton,
                this.incBeatCountButton,
                this.decBeatCountButton,
                this.moveDownButton,
                this.beatCountDisplay,
                this.ringIdxDisplay,
                this.instrumentButton,
                this.colorButton
            ],
            {
                className: this.classes.buttonsContainer
            }
        );

        this.el = el(
            "div",
            [
                el("span", `Ring #${ringId}`, {
                    className: this.classes.ringIdContainer
                }),
                this.buttonsContainer
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

        this.deleteButton.addEventListener("click", () => {
            this.ringRemoveHandler();
        });

        this.moveUpButton.addEventListener("click", () => {
            this.ringReorderHandler(true);
            // Update ring index display
            this.ringIdxDisplay.textContent = (
                1 + findIndex(visualizerState.activeRings, { id: this.ringId })
            ).toString();
        });

        this.moveDownButton.addEventListener("click", () => {
            this.ringReorderHandler(false);
            // Update ring index display
            this.ringIdxDisplay.textContent = (
                1 + findIndex(visualizerState.activeRings, { id: this.ringId })
            ).toString();
        });

        this.incBeatCountButton.addEventListener("click", () => {
            // Check that the value doesn't exceed max
            if (this.ringSettings.beatCount >= 8) return;
            // And update
            this.beatCountChangeHandler(this.ringSettings.beatCount + 1);
            this.beatCountDisplay.textContent =
                this.ringSettings.beatCount.toString();
        });

        this.decBeatCountButton.addEventListener("click", () => {
            // Check that the value is at least 2
            if (this.ringSettings.beatCount <= 1) return;
            // And update
            this.beatCountChangeHandler(this.ringSettings.beatCount - 1);
            this.beatCountDisplay.textContent =
                this.ringSettings.beatCount.toString();
        });

        this.instrumentButton.addEventListener("click", () => {
            const currentInstrument = this.ringSettings.instrumentName;
            const nextInstrument =
                instrumentNames[
                    (indexOf(instrumentNames, currentInstrument) + 1) %
                        instrumentNames.length
                ];
            this.ringSettings.instrumentName = nextInstrument;
            switch (nextInstrument) {
                case "kick":
                    this.ringState.instrument = new Kick();
                    break;
                case "snare":
                    this.ringState.instrument = new Snare();
                    break;
                case "sine":
                    this.ringState.instrument = new Sine();
                    break;
                default:
                    break;
            }
            this.instrumentButton.textContent = capitalize(
                this.ringSettings.instrumentName
            );
        });

        this.colorButton.addEventListener("click", () => {
            const currentColor = this.ringSettings.colorName;
            const nextColor =
                ringColors[
                    (indexOf(ringColors, currentColor) + 1) % ringColors.length
                ];
            this.ringSettings.colorName = nextColor;
            setAttr(this.colorButton, {
                className: this.classes.getColorButton(nextColor)
            });
        });
    }

    /**
     * Animate when the menu is open
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
     * Animate when the menu is closed
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
