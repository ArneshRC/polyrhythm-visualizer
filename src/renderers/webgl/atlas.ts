/**
 * Side of one square cell in the atlas
 */
const CELL_SIZE = 64;

/**
 * How many digits the atlas holds
 */
const DIGIT_COUNT = 10;

/**
 * Fraction of a cell the glyph inside it is drawn at. A quad
 * showing a digit has to be scaled up by this much for the
 * digit to end up at the font size that was asked for.
 */
const GLYPH_FILL = 0.75;

/**
 * The digits 0-9 rasterized side by side into one texture.
 * Beat counts are clamped to 1-8, so every beat number is a
 * single digit and a single quad.
 */
class DigitAtlas {
    readonly texture: WebGLTexture;

    /**
     * Size of one cell in texture coordinates
     */
    readonly cellScale: [number, number] = [1 / DIGIT_COUNT, 1];

    constructor(gl: WebGLRenderingContext) {
        this.texture = gl.createTexture()!;

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            DigitAtlas.rasterize()
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    /**
     * Draw the digits into an offscreen 2D canvas, which is
     * the only text rasterizer available to us
     */
    private static rasterize() {
        const canvas = document.createElement("canvas");
        canvas.width = CELL_SIZE * DIGIT_COUNT;
        canvas.height = CELL_SIZE;

        const ctx = canvas.getContext("2d")!;
        ctx.font = `${CELL_SIZE * GLYPH_FILL}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // White, so the shader can tint it to any color
        ctx.fillStyle = "#ffffff";

        for (let digit = 0; digit < DIGIT_COUNT; digit++) {
            ctx.fillText(`${digit}`, (digit + 0.5) * CELL_SIZE, CELL_SIZE / 2);
        }

        return canvas;
    }

    /**
     * Top left corner of a digit's cell, in texture coordinates
     */
    offsetOf(digit: number): [number, number] {
        return [digit / DIGIT_COUNT, 0];
    }

    dispose(gl: WebGLRenderingContext) {
        gl.deleteTexture(this.texture);
    }
}

export { GLYPH_FILL };
export default DigitAtlas;
