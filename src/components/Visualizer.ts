import { RedomComponent, el } from "redom";
import colors from "tailwindcss/colors";
import { difference, indexOf, remove, sample, uniq } from "lodash";

import BeatScheduler from "../services/BeatScheduler";
import { ringColors, RingColor } from "../constants";
import RingState from "../services/RingState";
import RingSettings from "../services/RingSettings";
import { appSettings, audioContext } from "../services/global";
import { Kick } from "../Instrument";

class Ring {
    static globalCount = 0;

    public settings: RingSettings = {
        beatCount: 4,
        instrument: new Kick()
    };

    public state: RingState = {
        paused: true,
        beatPlayed: false,
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

    play(time?: number) {
        this.settings.instrument.play(time);
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

    getRingRadius(ringIdx: number) {
        return (ringIdx/2 + 1) * 60;
    }

    private ringClickHandler: (idx: number, x: number, y: number) => void =
        _idx => {};
    private outsideClickHandler: () => void = () => {};

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
        const ring = new Ring(colorName);
        this.activeRings.push(ring);
        return ring;
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

            const r = this.getRingRadius(idx);

            const drawBeaters = () => {
                const beatCount = ring.beatCount;

                for (let i = 0; i < beatCount; i++) {
                    const angle = (i * 2 * Math.PI) / beatCount;
                    const cxi = cx + r * Math.sin(angle);
                    const cyi = cy - r * Math.cos(angle);
                    ctx.beginPath();
                    ctx.moveTo(cxi, cyi);

                    ring.scheduler.updateCurrentBeat();

                    if (!ring.state.paused && ring.scheduler.currentBeat == i) {
                        ctx.fillStyle = colors[ring.colorName][200];
                        ctx.arc(cxi, cyi, 10, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.fillStyle = colors[ring.colorName][900];
                        ctx.font = "15px sans-serif";
                        ctx.fillText(`${i + 1}`, cxi - 4.5, cyi + 5);
                        if (!ring.state.beatPlayed) {
                            ring.play();
                            ring.state.beatPlayed = true;
                        }
                    } else {
                        ctx.fillStyle = colors[ring.colorName][200];
                        ctx.arc(cxi, cyi, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    }

                    ctx.closePath();
                }
            };

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
            drawRing(
                this.activeRings[idx],
                this.activeRings[idx].state.paused ? -Math.PI / 2 : angle
            );
        }

        requestAnimationFrame(this.draw.bind(this));
    }

    attachHoverHandler() {
        this.el.addEventListener("mousemove", event => {
            const w = this.dimensions.width;
            const h = this.dimensions.height;

            const rect = this.el.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const cx = w / 2;
            const cy = h / 2;

            const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            let hovering = false;

            for (let idx = 0; idx < this.activeRings.length; idx++) {
                const rRing = this.getRingRadius(idx);
                const rRingInner = rRing - this.ringTrackThickness / 2;
                const rRingOuter = rRing + this.ringTrackThickness / 2;

                if (r >= rRingInner && r <= rRingOuter) {
                    hovering = true;
                    this.hoveringRingIdx = idx;
                }
            }

            if (hovering) {
                this.el.style.cursor = "pointer";
            } else {
                this.el.style.cursor = "default";
                this.hoveringRingIdx = undefined;
            }
        });
    }

    attachClickHandler() {
        this.el.addEventListener("click", event => {
            const w = this.dimensions.width;
            const h = this.dimensions.height;

            const rect = this.el.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const cx = w / 2;
            const cy = h / 2;

            const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            let clickedRingIdx: number | null = null;

            for (let idx = 0; idx < this.activeRings.length; idx++) {
                const rRing = this.getRingRadius(idx);
                const rRingInner = rRing - this.ringTrackThickness / 2;
                const rRingOuter = rRing + this.ringTrackThickness / 2;

                if (r >= rRingInner && r <= rRingOuter) {
                    clickedRingIdx = idx;
                }
            }

            if (clickedRingIdx == null) {
                this.outsideClickHandler();
            } else {
                this.ringClickHandler(clickedRingIdx, cx - x, cy - y);
            }
        });
    }

    set onRingClick(
        ringClickHandler: (idx: number, x: number, y: number) => void
    ) {
        this.ringClickHandler = ringClickHandler;
    }

    set onOutsideClick(outsideClickHandler: () => void) {
        this.outsideClickHandler = outsideClickHandler;
    }

    async init() {
        requestAnimationFrame(this.draw.bind(this));
        const ring1 = this.addRing();
        const ring2 = this.addRing();
        ring1!.beatCount = 3;
        ring2!.beatCount = 2;
        this.attachHoverHandler();
        this.attachClickHandler();
        (window as any).rings = {
            add: () => this.addRing(),
            all: this.activeRings
        };
    }
}

export default Visualizer;
