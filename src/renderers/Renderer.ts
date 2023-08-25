/**
 * A beat number drawn on top of a beater
 */
interface DigitFrame {
    /**
     * The number to draw
     */
    value: number;
    color: string;
    /**
     * Font size in pixels, before `scale` is applied
     */
    size: number;
    scale: number;
    alpha: number;
}

/**
 * One of the equally spaced circles sitting on a ring
 */
interface BeaterFrame {
    x: number;
    y: number;
    radius: number;
    color: string;
    /**
     * Only the beat currently being played carries a number
     */
    digit?: DigitFrame;
}

/**
 * A ring, its track and its beaters
 */
interface RingFrame {
    cx: number;
    cy: number;
    radius: number;
    /**
     * Thickness of the progress arc
     */
    thickness: number;
    /**
     * Thickness of the track behind the progress arc
     */
    trackThickness: number;
    color: string;
    trackColor: string;
    /**
     * Angle up to which the ring has progressed. The arc
     * always starts at -pi/2, the top of the ring.
     */
    progressAngle: number;
    /**
     * Reach of the glow around the track; 0 means no glow
     */
    glowStrength: number;
    beaters: BeaterFrame[];
}

/**
 * Everything a single frame needs in order to be drawn,
 * in canvas pixel space (y pointing down)
 */
interface Frame {
    /**
     * Side of the square canvas
     */
    size: number;
    rings: RingFrame[];
}

/**
 * A drawing backend. Renderers own their canvas and know
 * nothing about rings, beats or audio.
 */
interface Renderer {
    readonly el: HTMLCanvasElement;
    /**
     * Resize the canvas to a `size` x `size` square
     */
    resize(size: number): void;
    render(frame: Frame): void;
    /**
     * Release whatever the backend is holding on to
     */
    dispose(): void;
}

export type { BeaterFrame, DigitFrame, Frame, Renderer, RingFrame };
