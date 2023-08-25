/**
 * Parsed colors, since the same handful of tailwind
 * hex strings gets converted on every frame
 */
const cache = new Map<string, [number, number, number]>();

/**
 * Convert a hex color string into rgb components
 * normalized to 0-1, the way a shader wants them
 *
 * @param hex A `#rgb` or `#rrggbb` color string
 */
export function hexToRgb(hex: string): [number, number, number] {
    const cached = cache.get(hex);
    if (cached != undefined) return cached;

    let body = hex.replace("#", "");

    // Expand the shorthand form
    if (body.length == 3)
        body = body
            .split("")
            .map(char => char + char)
            .join("");

    const value = parseInt(body, 16);
    const rgb: [number, number, number] = [
        ((value >> 16) & 0xff) / 255,
        ((value >> 8) & 0xff) / 255,
        (value & 0xff) / 255
    ];

    cache.set(hex, rgb);
    return rgb;
}
