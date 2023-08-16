import { RedomComponent, el } from "redom";
import colors from "tailwindcss/colors";
import { difference, indexOf, remove, sample, uniq } from "lodash";

import BeatScheduler from "../services/BeatScheduler";
import { ringColors, RingColor } from "../constants";
import RingState from "../services/RingState";
import RingSettings from "../services/RingSettings";
import { appSettings, audioContext } from "../services/global";

class Ring {
    static globalCount = 0;

    public settings: RingSettings = {
        beatCount: 4,
    };

    public state: RingState = {
        paused: false,
        beatCountChanged: false,
        currentBeatCount: this.settings.beatCount
    };

    public id = Ring.globalCount++;

    public colorName: RingColor;
    public scheduler = new BeatScheduler(this.state, this.settings);

    get paused() {
        return this.state.paused;
    }

    get color() {
        return colors[this.colorName][500];
    }

    get trackColor() {
        return colors[this.colorName][900];
    }

    set paused(_paused: boolean) {
        this.state.paused = _paused;
    }

    get beatCount() {
        return this.state.currentBeatCount;
    }

    set beatCount(_beatCount: number) {
        this.settings.beatCount = _beatCount;
        this.state.beatCountChanged = true;
    }

    constructor(colorName: RingColor) {
        this.colorName = colorName;
    }
}

class Visualizer implements RedomComponent {
    el: HTMLCanvasElement;
    dimensions = {
        width: 480,
        height: 480
    };
    activeRings: Ring[] = [];
    ringThickness = 10;
    ringTrackThickness = 15;
    ringGlowStrength = 10;
    hoveringRingIdx?: number = undefined;
    animation = {
        progress: 0,
        duration: appSettings.measureDuration * 1000,
        done: false
    };

    constructor() {
        this.el = el("canvas", { id: "visualizer", ...this.dimensions });
    }

    addRing(colorName?: RingColor) {
        if (this.activeRings.length >= appSettings.maxRings) return;
        colorName = sample(
            difference(
                ringColors,
                uniq(this.activeRings.map(ring => ring.colorName))
            )
        )!;
        this.activeRings.push(new Ring(colorName));
    }

    removeRing(id: number) {
        remove(this.activeRings, ring => ring.id == id);
    }

    private async draw() {
        const w = this.dimensions.width;
        const h = this.dimensions.height;

        const ctx = this.el.getContext("2d")!;

        const drawRing = async (ring: Ring, angle: number) => {

            const idx = indexOf(this.activeRings, ring);

            const cx = w / 2;
            const cy = h / 2;

            const r =
                (Math.min(w, h) * this.activeRings.length) / 16 +
                (appSettings.maxRings - idx * 3) * 10;

            const drawBeaters = () => {
                const beatCount = ring.beatCount;

                for(let i = 0; i < beatCount; i++) {
                    const angle = i * 2 * Math.PI / beatCount;
                    const cxi = cx + r * Math.sin(angle);
                    const cyi = cy - r * Math.cos(angle);
                    ctx.beginPath();
                    ctx.moveTo(cxi, cyi);

                    ring.scheduler.updateCurrentBeat()
                    const beaterRadius = ring.scheduler.currentBeat == i ? 10 : 5;

                    ctx.arc(cxi, cyi, beaterRadius, 0, 2 * Math.PI);
                    ctx.fillStyle = colors.neutral[200];
                    ctx.fill();
                    ctx.closePath();
                }
            }

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, 2 * Math.PI);
            if (this.hoveringRingIdx == idx) {
                ctx.shadowColor = ring.color;
                ctx.shadowBlur = this.ringGlowStrength;
            }
            ctx.strokeStyle = ring.trackColor;
            ctx.lineWidth = this.ringTrackThickness;
            ctx.stroke();
            ctx.closePath();

            ctx.beginPath();
            ctx.arc(cx, cy, r, -Math.PI / 2, angle);
            ctx.shadowColor = "";
            ctx.shadowBlur = 0;
            ctx.lineWidth = this.ringThickness;
            ctx.strokeStyle = ring.color;
            ctx.stroke();
            ctx.closePath();

            drawBeaters();

        };

        this.animation.progress =
            ((audioContext.currentTime * 1000) / this.animation.duration) % 1;

        // Next frame
        ctx.clearRect(0, 0, w, h);

        const angle = -0.5 * Math.PI + this.animation.progress * 2 * Math.PI;

        for (let idx = 0; idx < this.activeRings.length; idx++) {
            drawRing(this.activeRings[idx], angle);
        }

        requestAnimationFrame(this.draw.bind(this));
    }

    async init() {
        requestAnimationFrame(this.draw.bind(this));
        this.addRing();
        this.addRing();
    }
}

export default Visualizer;
