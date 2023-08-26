import { easing } from "ts-easing";

/**
 * How long the digit takes to reach its overshoot
 */
const ATTACK = 0.08;

/**
 * How long it then takes to settle back to full size
 */
const SETTLE = 0.07;

/**
 * Size the digit pops past on the way in
 */
const OVERSHOOT = 1.25;

/**
 * Size the digit starts at
 */
const START_SCALE = 0.4;

/**
 * Longest the fade out at the end of a beat can be
 */
const MAX_FADE = 0.12;

interface DigitAnimation {
    scale: number;
    alpha: number;
}

/**
 * How a beat number should be drawn, given how long ago its
 * beat landed. It pops in past full size, settles, and then
 * fades out as the beat ends.
 *
 * Driven by the audio clock rather than by frames, so it comes
 * out the same whichever backend is drawing.
 *
 * @param age Seconds since the beat was played
 * @param beatDuration Seconds the beat lasts for
 */
function getDigitAnimation(age: number, beatDuration: number): DigitAnimation {
    // The fade shouldn't eat into the pop on short beats
    const fade = Math.min(MAX_FADE, beatDuration * 0.3);
    const fadeStart = beatDuration - fade;

    let scale = 1;

    if (age < ATTACK) {
        // Growing past full size
        const t = easing.outCubic(age / ATTACK);
        scale = START_SCALE + (OVERSHOOT - START_SCALE) * t;
    } else if (age < ATTACK + SETTLE) {
        // Settling back down to it
        const t = easing.outQuad((age - ATTACK) / SETTLE);
        scale = OVERSHOOT + (1 - OVERSHOOT) * t;
    }

    let alpha = 1;

    if (age < ATTACK) {
        alpha = easing.outCubic(age / ATTACK);
    } else if (age > fadeStart) {
        // Clamped, in case a frame lands after the beat is over
        alpha = 1 - easing.inQuad(Math.min((age - fadeStart) / fade, 1));
    }

    return { scale, alpha };
}

export { getDigitAnimation };
export type { DigitAnimation };
