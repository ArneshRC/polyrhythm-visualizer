import { difference, remove, sample } from "lodash";
import { el, type RedomComponent } from "redom";
import colors from "tailwindcss/colors";

import { type RingColor, ringColors } from "../constants";
import { appSettings, visualizerState } from "../state";
import { audioContext } from "../audio";
import Canvas2DRenderer from "../renderers/Canvas2DRenderer";
import WebGLRenderer from "../renderers/WebGLRenderer";
import type { BeaterFrame, Renderer, RingFrame } from "../renderers/Renderer";
import type VisualizerState from "../state/VisualizerState";
import Ring from "../utils/Ring";
import { getDigitAnimation } from "../utils/beatAnimation";

class Visualizer implements RedomComponent {
    /**
     * A wrapper around the renderer's canvas. A canvas can
     * only ever have one kind of context, so switching
     * backends means swapping the canvas out from under this.
     */
    el: HTMLDivElement;

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
    public state: VisualizerState = visualizerState;

    /**
     * The backend currently drawing the visualizer
     */
    private renderer: Renderer;

    get ringThickness() {
        return 10 * this.dimensions.unit;
    }
    get ringTrackThickness() {
        return 15 * this.dimensions.unit;
    }
    get ringGlowStrength() {
        return 10 * this.dimensions.unit;
    }
    get beatNumberSize() {
        return 15 * this.dimensions.unit;
    }
    getRingRadius(ringIdx: number) {
        return (ringIdx / 2 + 1) * 60 * this.dimensions.unit;
    }

    constructor() {
        this.renderer = new Canvas2DRenderer(this.dimensions.size);

        this.el = el("div", [this.renderer.el], {
            id: "visualizer",
            className: "relative",
            style: {
                width: `${this.dimensions.width}px`,
                height: `${this.dimensions.height}px`
            }
        });

        // Honour the configured default, dropping back to
        // the 2D canvas if WebGL isn't available
        if (appSettings.useWebGL) appSettings.useWebGL = this.setBackend(true);

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
                this.resize();
            }
        });
    }

    /**
     * Swap the rendering backend. A canvas can only ever have
     * one kind of context, so the canvas gets replaced too.
     *
     * @param useWebGL Whether to draw with WebGL
     * @returns Whether the requested backend is now in use
     */
    setBackend(useWebGL: boolean) {
        const renderer = useWebGL
            ? WebGLRenderer.create(this.dimensions.size)
            : new Canvas2DRenderer(this.dimensions.size);

        // The browser wouldn't hand over a WebGL context
        if (renderer == null) return false;

        if (renderer instanceof WebGLRenderer)
            // Don't leave a dead canvas on screen
            renderer.onContextLost = () => {
                this.setBackend(false);
                this.backendFallbackHandler();
            };

        const previous = this.renderer;
        this.el.replaceChild(renderer.el, previous.el);
        this.renderer = renderer;
        previous.dispose();

        return true;
    }

    private backendFallbackHandler: () => void = () => {};
    /**
     * Called when the visualizer drops back to Canvas 2D
     * on its own, so the UI can catch up
     */
    set onBackendFallback(backendFallbackHandler: () => void) {
        this.backendFallbackHandler = backendFallbackHandler;
    }

    /**
     * Resize the wrapper and the canvas inside it
     */
    private resize() {
        this.el.style.width = `${this.dimensions.width}px`;
        this.el.style.height = `${this.dimensions.height}px`;
        this.renderer.resize(this.dimensions.size);
    }

    /**
     * Add a new ring
     *
     * @param colorName Name of the ring's theme color (random if unspecified)
     */
    addRing(colorName?: RingColor) {
        const activeRings = this.state.activeRings;
        const activeRingCount = activeRings.length;
        // No more than `appSettings.maxRings` rings allowed
        if (activeRingCount >= appSettings.maxRings) return;
        // Randomly select a color...
        colorName = sample(
            difference(
                // ... from the list of colors
                ringColors,
                // ... except those which are currently active
                activeRings.map(ring => ring.settings.colorName)
            )
        )!;

        const ring = new Ring(colorName);
        activeRings.push(ring);
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
     * Advance a ring's beat state and describe how it
     * should be drawn this frame
     *
     * @param ring The ring to describe
     * @param idx Index of the ring among the active rings
     * @param angle The angle which the ring has completed
     */
    private buildRingFrame(ring: Ring, idx: number, angle: number): RingFrame {
        // Center of canvas
        const cx = this.dimensions.width / 2;
        const cy = this.dimensions.height / 2;

        // Radius of current ring
        const r = this.getRingRadius(idx);

        // Consume whatever beats are due from the beat queue.
        // One call is enough, it drains the queue in a loop.
        ring.scheduler.updateCurrentBeat();

        // If the current beat hasn't been played
        if (!ring.state.paused && !ring.state.beatPlayed) {
            // Play it
            ring.play();
            // Accordingly set `beatPlayed`
            ring.state.beatPlayed = true;
        }

        // Number of beaters = beatCount
        const beatCount = ring.beatCount;
        const beaters: BeaterFrame[] = [];

        // How the beat number should be popping in or fading
        // out, going by how long ago its beat landed
        const digitAnimation = getDigitAnimation(
            audioContext.currentTime - ring.scheduler.currentBeatTime,
            appSettings.measureDuration / beatCount
        );

        // Place the beaters at equally spaced intervals
        for (let i = 0; i < beatCount; i++) {
            // Angle of the beater w.r.t. center
            // of screen and vertical axis;
            // 0 means at the top of the ring
            const beaterAngle = (i * 2 * Math.PI) / beatCount;

            // Center of current beater's circle
            const x = cx + r * Math.sin(beaterAngle);
            const y = cy - r * Math.cos(beaterAngle);

            // Whether this is the beat being played
            const active =
                !ring.state.paused && ring.scheduler.currentBeat == i;

            beaters.push({
                x,
                y,
                // The beat being played gets a
                // bigger radius, for emphasis
                radius: (active ? 10 : 5) * this.dimensions.unit,
                color: colors[ring.settings.colorName][200],
                digit: active
                    ? {
                          value: i + 1,
                          color: colors[ring.settings.colorName][900],
                          size: this.beatNumberSize,
                          scale: digitAnimation.scale,
                          alpha: digitAnimation.alpha
                      }
                    : undefined
            });
        }

        return {
            cx,
            cy,
            radius: r,
            thickness: this.ringThickness,
            trackThickness: this.ringTrackThickness,
            color: ring.color,
            trackColor: ring.trackColor,
            progressAngle: angle,
            // Glow the ring being hovered
            glowStrength:
                this.state.hoveringRingIdx == idx ? this.ringGlowStrength : 0,
            beaters
        };
    }

    /**
     * Draw function for the main animation loop
     */
    private draw() {
        // Increment progress
        // % 1 gives the fractional part
        this.state.animation.progress =
            ((audioContext.currentTime * 1000) /
                this.state.animation.duration) %
            1;

        // Calculate angle, starting from -pi/2
        const angle =
            -0.5 * Math.PI + this.state.animation.progress * 2 * Math.PI;

        const rings: RingFrame[] = [];

        // Loop over the active rings
        for (let idx = 0; idx < this.state.activeRings.length; idx++) {
            const ring = this.state.activeRings[idx];
            rings.push(
                this.buildRingFrame(
                    ring,
                    idx,
                    // If the ring is paused, freeze it at -pi/2
                    ring.state.paused ? -0.5 * Math.PI : angle
                )
            );
        }

        // Hand it all over to the backend
        this.renderer.render({ size: this.dimensions.size, rings });

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
        () => {};
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
