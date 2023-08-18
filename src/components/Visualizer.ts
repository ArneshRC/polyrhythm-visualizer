import { RedomComponent, el, setAttr } from "redom";
import { difference, findIndex, remove, sample } from "lodash";
import colors from "tailwindcss/colors";

import { ringColors, RingColor } from "../constants";
import { appSettings, audioContext } from "../services/global";
import Ring from "../utils/Ring";

interface VisualizerState {
    activeRings: Ring[];
    hoveringRingIdx?: number;
    animation: {
        progress: number;
        duration: number;
        done: boolean;
    };
}

class Visualizer implements RedomComponent {
    el: HTMLCanvasElement;

    /**
     * Dimensions of the canvas
     */
    private dimensions = new (class {
        /**
         * The canvas should be a square
         * at all times, so size is all
         * that matters
         */
        size = 400;
        get width() {
            return this.size;
        }
        get height() {
            return this.size;
        }
        /**
         * Responsive unit
         */
        get unit() {
            return Math.min(this.width, this.height) / 400;
        }
    })();

    /**
     * Current visualizer state
     */
    public state: VisualizerState = {
        activeRings: [],
        hoveringRingIdx: undefined,
        animation: {
            progress: 0,
            duration: appSettings.measureDuration * 1000,
            done: false
        }
    };

    get ringThickness() {
        return 10 * this.dimensions.unit;
    }
    get ringTrackThickness() {
        return 15 * this.dimensions.unit;
    }
    get ringGlowStrength() {
        return 10 * this.dimensions.unit;
    }
    getRingRadius(ringIdx: number) {
        return (ringIdx / 2 + 1) * 60 * this.dimensions.unit;
    }

    constructor() {
        this.el = el("canvas", {
            id: "visualizer",
            width: this.dimensions.width,
            height: this.dimensions.height
        });
        this.setupHandlers();
    }

    /**
     * Set up event handlers
     */
    setupHandlers() {
        // Handle resize
        window.addEventListener("resize", () => {
            // Subtracting 10 because of a scrollbar issue
            const w = document.documentElement.clientWidth - 10;
            if ((w >= 400 && this.dimensions.width < 400) || w < 400) {
                this.dimensions.size = Math.min(w, 400);
                setAttr(this, {
                    width: this.dimensions.width,
                    height: this.dimensions.height
                });
            }
        });
    }

    /**
     * Add a new ring
     *
     * @param colorName Name of the ring's theme color (random if unspecified)
     */
    addRing(colorName?: RingColor) {
        // No more than `appSettings.maxRings` rings allowed
        if (this.state.activeRings.length >= appSettings.maxRings) return;
        // Randomly select a color...
        colorName = sample(
            difference(
                // ... from the list of colors
                ringColors,
                // ... except those which are currently active
                this.state.activeRings.map(ring => ring.settings.colorName)
            )
        )!;

        const ring = new Ring(colorName);
        this.state.activeRings.push(ring);
        return ring;
    }

    /**
     * Remove a ring, given its id
     *
     * @param id The id of the ring to be removed
     */
    removeRing(id: number) {
        remove(this.state.activeRings, ring => ring.id == id);
    }

    /**
     * Draw function for the main animation loop
     */
    private draw() {
        const w = this.dimensions.width;
        const h = this.dimensions.height;

        const ctx = this.el.getContext("2d")!;

        /**
         * Draw a ring at a given angle and its track
         *
         * @param ring The ring to draw
         * @param angle The angle which the ring has completed
         */
        const drawRing = (ring: Ring, angle: number) => {
            const idx = findIndex(this.state.activeRings, ring);

            // Center of canvas
            const cx = w / 2;
            const cy = h / 2;

            // Radius of current ring
            const r = this.getRingRadius(idx);

            /**
             * Draw the beaters at equally spaced intervals
             */
            const drawBeaters = () => {
                // Number of beaters = beatCount
                const beatCount = ring.beatCount;

                for (let i = 0; i < beatCount; i++) {
                    // Angle of the beater w.r.t. center
                    // of screen and vertical axis;
                    // 0 means at the top of the ring
                    const angle = (i * 2 * Math.PI) / beatCount;

                    // Center of current beater's circle
                    const cxi = cx + r * Math.sin(angle);
                    const cyi = cy - r * Math.cos(angle);

                    ctx.beginPath();

                    // Move to beater center
                    ctx.moveTo(cxi, cyi);

                    // Consume beat from the beat queue
                    ring.scheduler.updateCurrentBeat();

                    ctx.fillStyle = colors[ring.settings.colorName][200];

                    // If the current beat is begin drawn
                    if (!ring.state.paused && ring.scheduler.currentBeat == i) {
                        // Bigger radius, for emphasis
                        const beaterRadius = 10 * this.dimensions.unit;

                        // Draw beater circle
                        ctx.arc(cxi, cyi, beaterRadius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.fillStyle = colors[ring.settings.colorName][900];

                        // Display beat number
                        ctx.font = "15px sans-serif";
                        ctx.fillText(`${i + 1}`, cxi - 4.5, cyi + 5);

                        // If current beat hasn't been played
                        if (!ring.state.beatPlayed) {
                            // Play it
                            ring.play();
                            // Accordingly set `beatPlayed`
                            ring.state.beatPlayed = true;
                        }
                    } else {
                        // Smaller radius
                        const beaterRadius = 5 * this.dimensions.unit;

                        // Draw beater circle
                        ctx.arc(cxi, cyi, beaterRadius, 0, 2 * Math.PI);
                        ctx.fill();
                    }

                    ctx.closePath();
                }
            };

            ctx.beginPath();

            /** Track **/

            ctx.arc(cx, cy, r, 0, 2 * Math.PI);

            // If this ring is being hovered
            if (this.state.hoveringRingIdx == idx) {
                // Add shadow to simulate glow
                ctx.shadowColor = ring.color;
                ctx.shadowBlur = this.ringGlowStrength;
            }
            ctx.strokeStyle = ring.trackColor;
            ctx.lineWidth = this.ringTrackThickness;
            ctx.stroke();
            ctx.closePath();

            /** Ring **/

            ctx.beginPath();

            // We're beginning from -pi/2 because 0 lies
            // on the horizontal axis (right of the ring)
            ctx.arc(cx, cy, r, -0.5 * Math.PI, angle);

            // Reset shadow and blur
            ctx.shadowColor = "";
            ctx.shadowBlur = 0;

            ctx.lineWidth = this.ringThickness;
            ctx.strokeStyle = ring.color;
            ctx.stroke();
            ctx.closePath();

            // Draw the beaters
            drawBeaters();
        };

        /** START **/

        // Increment progress
        // % 1 gives the fractional part
        this.state.animation.progress =
            ((audioContext.currentTime * 1000) /
                this.state.animation.duration) %
            1;

        ctx.clearRect(0, 0, w, h);

        // Calculate angle, starting from -pi/2
        const angle =
            -0.5 * Math.PI + this.state.animation.progress * 2 * Math.PI;

        // Loop over the active rings
        for (let idx = 0; idx < this.state.activeRings.length; idx++) {
            // Draw the current ring
            drawRing(
                this.state.activeRings[idx],
                // If the ring is paused, freeze it at -pi/2
                this.state.activeRings[idx].state.paused
                    ? -0.5 * Math.PI
                    : angle
            );
        }

        // Request next frame
        requestAnimationFrame(this.draw.bind(this));
    }

    /**
     * Set up the hover handler
     */
    private setupHoverHandler() {
        this.el.addEventListener("mousemove", event => {
            const w = this.dimensions.width;
            const h = this.dimensions.height;

            const rect = this.el.getBoundingClientRect();

            // Absolute coordinates
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Center of canvas
            const cx = w / 2;
            const cy = h / 2;

            // Relative coordinates, distance of mouse from center
            const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            // Whether a ring is being hovered
            let hovering = false;

            // Look through all the active rings
            for (let idx = 0; idx < this.state.activeRings.length; idx++) {
                const rRing = this.getRingRadius(idx);
                const rRingInner = rRing - this.ringTrackThickness / 2;
                const rRingOuter = rRing + this.ringTrackThickness / 2;

                // If mouse lies between bounds of current ring
                if (r >= rRingInner && r <= rRingOuter) {
                    hovering = true;
                    // Set the currently hovering ring's index
                    this.state.hoveringRingIdx = idx;
                }
            }

            if (hovering) {
                // Change to pointer cursor when hovering
                this.el.style.cursor = "pointer";
            } else {
                this.el.style.cursor = "default";
                // Unset hoveringRingIdx if not hovering
                this.state.hoveringRingIdx = undefined;
            }
        });
    }

    private setupClickHandler() {
        this.el.addEventListener("click", event => {
            const w = this.dimensions.width;
            const h = this.dimensions.height;

            const rect = this.el.getBoundingClientRect();

            // Absolute coordinates
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            // Center of screen
            const cx = w / 2;
            const cy = h / 2;

            // Relative coordinates, distance of mouse from center
            const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

            let clickedRingIdx: number | null = null;

            // Look through all the active rings
            for (let idx = 0; idx < this.state.activeRings.length; idx++) {
                const rRing = this.getRingRadius(idx);
                const rRingInner = rRing - this.ringTrackThickness / 2;
                const rRingOuter = rRing + this.ringTrackThickness / 2;

                // If mouse lies between bounds of current ring
                if (r >= rRingInner && r <= rRingOuter) {
                    // Update clickedRingIdx
                    clickedRingIdx = idx;
                }
            }

            // If a ring hasn't been clicked
            if (clickedRingIdx == null) {
                // Then the click must have been outside
                this.outsideClickHandler();
            } else {
                this.ringClickHandler(clickedRingIdx, cx - x, cy - y);
            }
        });
    }

    private ringClickHandler: (idx: number, x: number, y: number) => void =
        _idx => {};
    set onRingClick(
        ringClickHandler: (idx: number, x: number, y: number) => void
    ) {
        this.ringClickHandler = ringClickHandler;
    }

    private outsideClickHandler: () => void = () => {};
    set onOutsideClick(outsideClickHandler: () => void) {
        this.outsideClickHandler = outsideClickHandler;
    }

    /**
     * Initialize the visualizer
     * Start animation and add 2 initial rings
     */
    async init() {
        // Start the animation (request first frame)
        requestAnimationFrame(this.draw.bind(this));

        // Add two initial rings
        const ring1 = this.addRing();
        const ring2 = this.addRing();

        // Initial beat counts
        ring1!.beatCount = 2;
        ring2!.beatCount = 3;

        // Setup handlers
        this.setupHoverHandler();
        this.setupClickHandler();
    }
}

export default Visualizer;
