import { el } from "redom";

import { hexToRgb } from "../utils/color";
import DigitAtlas, { GLYPH_FILL } from "./webgl/atlas";
import { createProgram, type Program } from "./webgl/program";
import {
    geometryFragmentShader,
    geometryVertexShader,
    glyphFragmentShader,
    glyphVertexShader,
    sdfFragmentShader,
    sdfVertexShader
} from "./webgl/shaders";
import type { DigitFrame, Frame, Renderer, RingFrame } from "./Renderer";

/**
 * Angular resolution of the tessellated arcs. A degree and a
 * half is smooth at the radii this app draws at.
 */
const ARC_STEP = Math.PI / 120;

/**
 * Room for the longest arc we can be asked for, a full circle
 */
const MAX_ARC_VERTICES = (Math.ceil((2 * Math.PI) / ARC_STEP) + 1) * 2;

/**
 * The corners of a unit quad, as a triangle strip
 */
const QUAD_CORNERS = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);

/**
 * Draws the visualizer with WebGL. Three small programs:
 * tessellated geometry for the arcs, a distance field for the
 * beaters and the glow, and a textured quad per beat number.
 */
class WebGLRenderer implements Renderer {
    readonly el: HTMLCanvasElement;

    private gl: WebGLRenderingContext;

    private geometryProgram: Program;
    private sdfProgram: Program;
    private glyphProgram: Program;

    private arcBuffer: WebGLBuffer;
    private quadBuffer: WebGLBuffer;

    /**
     * Scratch space the arcs are tessellated into,
     * reused every frame
     */
    private arcVertices = new Float32Array(MAX_ARC_VERTICES * 2);

    private atlas: DigitAtlas;

    private size: number;

    /**
     * A lost context can't draw, and won't come
     * back on its own
     */
    private contextLost = false;

    private constructor(
        canvas: HTMLCanvasElement,
        gl: WebGLRenderingContext,
        size: number
    ) {
        this.el = canvas;
        this.gl = gl;
        this.size = size;

        this.geometryProgram = createProgram(
            gl,
            geometryVertexShader,
            geometryFragmentShader,
            ["aPosition"],
            ["uResolution", "uColor"]
        );
        this.sdfProgram = createProgram(
            gl,
            sdfVertexShader,
            sdfFragmentShader,
            ["aCorner"],
            [
                "uResolution",
                "uCenter",
                "uExtent",
                "uColor",
                "uRadius",
                "uBand",
                "uGlow"
            ]
        );
        this.glyphProgram = createProgram(
            gl,
            glyphVertexShader,
            glyphFragmentShader,
            ["aCorner"],
            [
                "uResolution",
                "uCenter",
                "uExtent",
                "uAtlasOffset",
                "uAtlasScale",
                "uAtlas",
                "uColor"
            ]
        );

        this.arcBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.arcBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.arcVertices.byteLength,
            gl.DYNAMIC_DRAW
        );

        this.quadBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, QUAD_CORNERS, gl.STATIC_DRAW);

        this.atlas = new DigitAtlas(gl);

        // Everything the shaders output is premultiplied
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);

        canvas.addEventListener("webglcontextlost", event => {
            // Without this the context is gone for good anyway
            event.preventDefault();
            this.contextLost = true;
            this.contextLostHandler();
        });
    }

    /**
     * Build a renderer, or return null if the browser
     * won't hand over a WebGL context
     *
     * @param size Side of the square canvas
     */
    static create(size: number) {
        const canvas: HTMLCanvasElement = el("canvas", {
            width: size,
            height: size,
            className: "block"
        });

        const gl = canvas.getContext("webgl", {
            antialias: true,
            premultipliedAlpha: true
        });
        if (gl == null) return null;

        try {
            return new WebGLRenderer(canvas, gl, size);
        } catch (error) {
            console.error("Could not set up the WebGL renderer", error);
            return null;
        }
    }

    private contextLostHandler: () => void = () => {};
    set onContextLost(contextLostHandler: () => void) {
        this.contextLostHandler = contextLostHandler;
    }

    resize(size: number) {
        this.size = size;
        this.el.width = size;
        this.el.height = size;
    }

    render(frame: Frame) {
        if (this.contextLost) return;

        const gl = this.gl;

        gl.viewport(0, 0, frame.size, frame.size);
        gl.clear(gl.COLOR_BUFFER_BIT);

        for (const ring of frame.rings) {
            this.drawRing(ring);
        }
    }

    /**
     * Draw a ring, its track and its beaters
     */
    private drawRing(ring: RingFrame) {
        // The glow goes down first, so the track
        // sits on top of it the way a shadow works
        if (ring.glowStrength > 0)
            this.drawSdf(
                ring.cx,
                ring.cy,
                ring.radius,
                ring.trackThickness / 2,
                ring.glowStrength,
                ring.color,
                1
            );

        /** Track **/

        this.drawArc(
            ring.cx,
            ring.cy,
            ring.radius,
            ring.trackThickness,
            -0.5 * Math.PI,
            1.5 * Math.PI,
            ring.trackColor
        );

        /** Ring **/

        // We're beginning from -pi/2 because 0 lies
        // on the horizontal axis (right of the ring)
        this.drawArc(
            ring.cx,
            ring.cy,
            ring.radius,
            ring.thickness,
            -0.5 * Math.PI,
            ring.progressAngle,
            ring.color
        );

        /** Beaters **/

        for (const beater of ring.beaters) {
            this.drawSdf(
                beater.x,
                beater.y,
                beater.radius,
                0,
                0,
                beater.color,
                1
            );

            if (beater.digit != undefined)
                this.drawDigit(beater.x, beater.y, beater.digit);
        }
    }

    /**
     * Tessellate an annulus sector into a triangle strip,
     * one pair of vertices per angular step
     */
    private drawArc(
        cx: number,
        cy: number,
        radius: number,
        thickness: number,
        startAngle: number,
        endAngle: number,
        color: string
    ) {
        const sweep = endAngle - startAngle;
        // A paused ring asks for a zero length arc
        if (sweep <= 0) return;

        const gl = this.gl;
        const program = this.geometryProgram;

        const inner = radius - thickness / 2;
        const outer = radius + thickness / 2;

        const steps = Math.max(1, Math.ceil(sweep / ARC_STEP));
        const vertices = this.arcVertices;

        let i = 0;
        for (let step = 0; step <= steps; step++) {
            const angle = startAngle + (sweep * step) / steps;
            // Same convention as the 2D backend: y points
            // down, so a growing angle runs clockwise
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            vertices[i++] = cx + inner * cos;
            vertices[i++] = cy + inner * sin;
            vertices[i++] = cx + outer * cos;
            vertices[i++] = cy + outer * sin;
        }

        gl.useProgram(program.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.arcBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices.subarray(0, i));
        gl.enableVertexAttribArray(program.attributes.aPosition);
        gl.vertexAttribPointer(
            program.attributes.aPosition,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.uniform2f(program.uniforms.uResolution, this.size, this.size);
        this.setColor(program.uniforms.uColor, color, 1);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, (steps + 1) * 2);
    }

    /**
     * Draw a filled disc, or a soft band when `band` is given
     *
     * @param band Half thickness of the band; 0 fills the disc
     * @param glow How far the shape fades out for; 0 gives a
     *             hard antialiased edge
     */
    private drawSdf(
        cx: number,
        cy: number,
        radius: number,
        band: number,
        glow: number,
        color: string,
        alpha: number
    ) {
        const gl = this.gl;
        const program = this.sdfProgram;

        // Enough quad for the shape plus whatever it feathers into
        const extent = radius + band + Math.max(glow, 1) + 1;

        gl.useProgram(program.program);
        this.bindQuad(program);
        gl.uniform2f(program.uniforms.uResolution, this.size, this.size);
        gl.uniform2f(program.uniforms.uCenter, cx, cy);
        gl.uniform1f(program.uniforms.uExtent, extent);
        gl.uniform1f(program.uniforms.uRadius, radius);
        gl.uniform1f(program.uniforms.uBand, band);
        gl.uniform1f(program.uniforms.uGlow, glow);
        this.setColor(program.uniforms.uColor, color, alpha);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Draw a beat number as a quad out of the digit atlas
     */
    private drawDigit(cx: number, cy: number, digit: DigitFrame) {
        const gl = this.gl;
        const program = this.glyphProgram;

        const [offsetX, offsetY] = this.atlas.offsetOf(digit.value % 10);
        const [scaleX, scaleY] = this.atlas.cellScale;

        gl.useProgram(program.program);
        this.bindQuad(program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.atlas.texture);
        gl.uniform1i(program.uniforms.uAtlas, 0);
        gl.uniform2f(program.uniforms.uResolution, this.size, this.size);
        gl.uniform2f(program.uniforms.uCenter, cx, cy);
        // The glyphs only fill part of their cell, so the quad
        // has to be that much bigger than the font size
        gl.uniform1f(
            program.uniforms.uExtent,
            (digit.size * digit.scale) / (2 * GLYPH_FILL)
        );
        gl.uniform2f(program.uniforms.uAtlasOffset, offsetX, offsetY);
        gl.uniform2f(program.uniforms.uAtlasScale, scaleX, scaleY);
        this.setColor(program.uniforms.uColor, digit.color, digit.alpha);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /**
     * Point a program's `aCorner` at the unit quad
     */
    private bindQuad(program: Program) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(program.attributes.aCorner);
        gl.vertexAttribPointer(
            program.attributes.aCorner,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );
    }

    /**
     * Feed a hex color and an alpha into a `uColor` uniform
     */
    private setColor(
        location: WebGLUniformLocation,
        color: string,
        alpha: number
    ) {
        const [r, g, b] = hexToRgb(color);
        this.gl.uniform4f(location, r, g, b, alpha);
    }

    dispose() {
        const gl = this.gl;

        this.atlas.dispose(gl);
        gl.deleteBuffer(this.arcBuffer);
        gl.deleteBuffer(this.quadBuffer);
        gl.deleteProgram(this.geometryProgram.program);
        gl.deleteProgram(this.sdfProgram.program);
        gl.deleteProgram(this.glyphProgram.program);

        // Hand the context back rather than waiting
        // for it to be collected
        if (!this.contextLost)
            gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
}

export default WebGLRenderer;
