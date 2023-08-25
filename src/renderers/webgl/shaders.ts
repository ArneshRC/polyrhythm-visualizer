/**
 * Turns a canvas pixel coordinate (y pointing down)
 * into a clip space position
 */
const toClipSpace = /* glsl */ `
    vec4 toClipSpace(vec2 position, vec2 resolution) {
        vec2 clip = position / resolution * 2.0 - 1.0;
        return vec4(clip * vec2(1.0, -1.0), 0.0, 1.0);
    }
`;

/**
 * Everything is blended premultiplied, which is what keeps
 * the glow and the fading digits from picking up dark fringes
 */
const premultiplied = /* glsl */ `
    vec4 premultiplied(vec3 color, float alpha) {
        return vec4(color * alpha, alpha);
    }
`;

/**
 * Tessellated geometry in pixel space, flat colored.
 * Used for the ring tracks and the progress arcs.
 */
const geometryVertexShader = /* glsl */ `
    attribute vec2 aPosition;

    uniform vec2 uResolution;

    ${toClipSpace}

    void main() {
        gl_Position = toClipSpace(aPosition, uResolution);
    }
`;

const geometryFragmentShader = /* glsl */ `
    precision mediump float;

    uniform vec4 uColor;

    ${premultiplied}

    void main() {
        gl_FragColor = premultiplied(uColor.rgb, uColor.a);
    }
`;

/**
 * A quad centered on `uCenter`, with the fragment shader
 * carving a shape out of it by distance. Draws the beater
 * circles and the glow around a hovered track.
 */
const sdfVertexShader = /* glsl */ `
    attribute vec2 aCorner;

    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uExtent;

    varying vec2 vOffset;

    ${toClipSpace}

    void main() {
        vOffset = aCorner * uExtent;
        gl_Position = toClipSpace(uCenter + vOffset, uResolution);
    }
`;

const sdfFragmentShader = /* glsl */ `
    precision mediump float;

    varying vec2 vOffset;

    uniform vec4 uColor;
    uniform float uRadius;
    // Half thickness of the band to draw; 0 fills the whole disc
    uniform float uBand;
    // How far the shape fades out for; 0 gives a hard,
    // one pixel antialiased edge instead
    uniform float uGlow;

    ${premultiplied}

    void main() {
        float distanceFromCenter = length(vOffset);

        // Distance outside the shape
        float distanceOutside = uBand > 0.0
            ? abs(distanceFromCenter - uRadius) - uBand
            : distanceFromCenter - uRadius;

        // A glow spreads over uGlow pixels, so it is at half
        // strength on the edge of the band, the way a blurred
        // copy of the band would be. Without one, the feather
        // is a single pixel of antialiasing.
        float feather = uGlow > 0.0 ? uGlow : 1.0;
        float alpha = 1.0 - smoothstep(-feather, feather, distanceOutside);

        gl_FragColor = premultiplied(uColor.rgb, alpha * uColor.a);
    }
`;

/**
 * A quad sampling one cell out of the digit atlas.
 * WebGL has no text API, so this is how beat numbers
 * get on screen.
 */
const glyphVertexShader = /* glsl */ `
    attribute vec2 aCorner;

    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uExtent;
    uniform vec2 uAtlasOffset;
    uniform vec2 uAtlasScale;

    varying vec2 vTexCoord;

    ${toClipSpace}

    void main() {
        // The atlas is uploaded unflipped, so v = 0
        // is its top row, same as the top of the quad
        vTexCoord = uAtlasOffset + (aCorner * 0.5 + 0.5) * uAtlasScale;
        gl_Position = toClipSpace(uCenter + aCorner * uExtent, uResolution);
    }
`;

const glyphFragmentShader = /* glsl */ `
    precision mediump float;

    varying vec2 vTexCoord;

    uniform sampler2D uAtlas;
    uniform vec4 uColor;

    ${premultiplied}

    void main() {
        float coverage = texture2D(uAtlas, vTexCoord).a * uColor.a;
        gl_FragColor = premultiplied(uColor.rgb, coverage);
    }
`;

export {
    geometryVertexShader,
    geometryFragmentShader,
    sdfVertexShader,
    sdfFragmentShader,
    glyphVertexShader,
    glyphFragmentShader
};
