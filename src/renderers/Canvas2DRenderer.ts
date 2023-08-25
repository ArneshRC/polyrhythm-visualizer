import { el } from "redom";

import type { Frame, Renderer, RingFrame } from "./Renderer";

/**
 * Draws the visualizer with the Canvas 2D API
 */
class Canvas2DRenderer implements Renderer {
    readonly el: HTMLCanvasElement;

    private ctx: CanvasRenderingContext2D;

    constructor(size: number) {
        this.el = el("canvas", {
            width: size,
            height: size,
            className: "block"
        });

        this.ctx = this.el.getContext("2d")!;
        this.setupContext();
    }

    /**
     * Centre the beat numbers on their beaters. Setting the
     * canvas size wipes the context state, so this has to run
     * again after every resize.
     */
    private setupContext() {
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
    }

    resize(size: number) {
        this.el.width = size;
        this.el.height = size;
        this.setupContext();
    }

    render(frame: Frame) {
        this.ctx.clearRect(0, 0, frame.size, frame.size);

        for (const ring of frame.rings) {
            this.drawRing(ring);
        }
    }

    /**
     * Draw a ring, its track and its beaters
     */
    private drawRing(ring: RingFrame) {
        const ctx = this.ctx;

        /** Track **/

        ctx.beginPath();

        ctx.arc(ring.cx, ring.cy, ring.radius, 0, 2 * Math.PI);

        // If this ring is being hovered,
        // add a shadow to simulate glow
        if (ring.glowStrength > 0) {
            ctx.shadowColor = ring.color;
            ctx.shadowBlur = ring.glowStrength;
        }
        ctx.strokeStyle = ring.trackColor;
        ctx.lineWidth = ring.trackThickness;
        ctx.stroke();
        ctx.closePath();

        /** Ring **/

        ctx.beginPath();

        // We're beginning from -pi/2 because 0 lies
        // on the horizontal axis (right of the ring)
        ctx.arc(
            ring.cx,
            ring.cy,
            ring.radius,
            -0.5 * Math.PI,
            ring.progressAngle
        );

        // Reset shadow and blur
        ctx.shadowColor = "";
        ctx.shadowBlur = 0;

        ctx.lineWidth = ring.thickness;
        ctx.strokeStyle = ring.color;
        ctx.stroke();
        ctx.closePath();

        /** Beaters **/

        for (const beater of ring.beaters) {
            ctx.beginPath();
            ctx.fillStyle = beater.color;
            ctx.arc(beater.x, beater.y, beater.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();

            const digit = beater.digit;
            if (digit == undefined) continue;

            // Scale and fade about the centre of the beater
            ctx.save();
            ctx.translate(beater.x, beater.y);
            ctx.scale(digit.scale, digit.scale);
            ctx.globalAlpha = digit.alpha;
            ctx.fillStyle = digit.color;
            ctx.font = `${digit.size}px sans-serif`;
            ctx.fillText(`${digit.value}`, 0, 0);
            ctx.restore();
        }
    }

    dispose() {
        // A 2D context holds nothing that needs releasing
        return;
    }
}

export default Canvas2DRenderer;
