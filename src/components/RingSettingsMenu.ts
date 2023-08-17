import { RedomComponent, el, setAttr, setChildren } from "redom";
import classNames from "classnames";
import {
    mdiPlay,
    mdiPause,
    mdiDelete,
    mdiChevronUp,
    mdiChevronDown
} from "@mdi/js";
import { inRange } from "lodash";

import RingSettings from "../services/RingSettings";
import RingState from "../services/RingState";
import Icon from "./Icon";
import { Coords } from "../constants";

class RingSettingsMenu implements RedomComponent {
    private classes = new (class {
        #button = [
            "rounded-md",
            "h-10",
            "text-neutral-900",
            "font-semibold",
            "flex",
            "justify-start",
            "items-center",
            "px-1",
            "gap-1",
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
                "gap-2"
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

    ringId: number;
    ringSettings: RingSettings;
    ringState: RingState;
    position: Coords;

    playPause: HTMLButtonElement;
    buttonsContainer: HTMLDivElement;
    delete: HTMLButtonElement;
    beatCountInput: HTMLInputElement;
    moveUp: HTMLButtonElement;
    moveDown: HTMLButtonElement;

    el: HTMLDivElement;

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
        this.playPause = el(
            "button",
            paused ? [new Icon(mdiPlay)] : [new Icon(mdiPause)],
            {
                className: this.classes.getPlayPause(paused)
            }
        );
        this.delete = el("button", [new Icon(mdiDelete)], {
            className: this.classes.delete
        });

        this.moveUp = el("button", [new Icon(mdiChevronUp)], {
            className: this.classes.reorderButton
        });
        this.moveDown = el("button", [new Icon(mdiChevronDown)], {
            className: this.classes.reorderButton
        });

        this.buttonsContainer = el(
            "div",
            [this.playPause, this.delete, this.moveUp, this.moveDown],
            {
                className: this.classes.buttonsContainer
            }
        );

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
                className: this.classes.container
            }
        );

        this.el.setAttribute(
            "style",
            `top: calc(50% - (${position.y}px)); left: calc(50% - (${position.x}px));`
        );
    }
    setupHandlers() {
        this.playPause.addEventListener("click", () => {
            let paused = this.ringState.paused;
            paused = !paused;
            this.ringState.paused = paused;
            setAttr(
                this.playPause,
                "className",
                this.classes.getPlayPause(paused)
            );
            setChildren(
                this.playPause,
                paused ? [new Icon(mdiPlay)] : [new Icon(mdiPause)]
            );
        });

        this.delete.addEventListener("click", () => {
            this.ringRemoveHandler();
        });

        this.beatCountInput.addEventListener("input", () => {
            const newBeatCount = parseInt(this.beatCountInput.value);
            if (!inRange(newBeatCount, 1, 9)) return;
            this.beatCountChangeHandler(newBeatCount);
        });

        this.moveUp.addEventListener("click", () => {
            this.ringReorderHandler(true);
        });

        this.moveDown.addEventListener("click", () => {
            this.ringReorderHandler(false);
        });
    }
    async animateClose() {}

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

    onmount() {
        this.setupHandlers();
    }
}

export default RingSettingsMenu;
