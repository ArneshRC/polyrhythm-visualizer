import { RedomComponent, el, setAttr, setChildren } from "redom";
import classNames from "classnames";
import { mdiPlay, mdiPause, mdiDelete } from "@mdi/js";

import RingSettings from "../services/RingSettings";
import RingState from "../services/RingState";
import Icon from "./Icon";
import { inRange } from "lodash";

interface Coords {
    x: number;
    y: number;
}

class RingSettingsMenu implements RedomComponent {
    private classes = new (class {
        container = classNames([
            "flex",
            "flex-col",
            "rounded-md",
            "p-3",
            "bg-neutral-800",
            "w-28",
            "absolute",
            "gap-2"
        ]);
        ringIdContainer = classNames(["text-center", "text-sm"]);
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
        getPlayPause = (paused: boolean) =>
            classNames([...this.#button], {
                "bg-yellow-200": !paused,
                "bg-blue-300": paused
            });
        delete = classNames([...this.#button, "bg-red-300"]);
        buttonsContainer = classNames(["grid", "grid-cols-2", "gap-2"]);
        beatCountInput = classNames([
            "rounded-md",
            "h-10",
            "font-semibold",
            "text-neutral-400",
            "bg-neutral-700",
            "px-3",
            "focus:outline-none"
        ]);
    })();

    ringId: number;
    ringSettings: RingSettings;
    ringState: RingState;
    position: Coords;

    playPause: HTMLButtonElement;
    buttonsContainer: HTMLDivElement;
    delete: HTMLButtonElement;
    beatCountInput: HTMLInputElement;

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

        this.buttonsContainer = el("div", [this.playPause, this.delete], {
            className: this.classes.buttonsContainer
        });

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

        this.beatCountInput.addEventListener("input", _event => {
            const newBeatCount = parseInt(this.beatCountInput.value);
            if (!inRange(newBeatCount, 1, 9)) return;
            this.beatCountChangeHandler(newBeatCount);
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

    onmount() {
        this.setupHandlers();
    }
}

export default RingSettingsMenu;
