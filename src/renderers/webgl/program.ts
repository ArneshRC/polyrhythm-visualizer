/**
 * A linked program along with the locations of everything
 * it declares, looked up once at build time
 */
interface Program {
    program: WebGLProgram;
    attributes: Record<string, number>;
    uniforms: Record<string, WebGLUniformLocation>;
}

/**
 * Compile one shader stage
 */
function compileShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Shader failed to compile: ${log}`);
    }

    return shader;
}

/**
 * Link a vertex and a fragment shader into a program and
 * resolve the named attributes and uniforms
 */
function createProgram(
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string,
    attributeNames: string[],
    uniformNames: string[]
): Program {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compileShader(
        gl,
        gl.FRAGMENT_SHADER,
        fragmentSource
    );

    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // The shaders are baked into the program now
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const log = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`Program failed to link: ${log}`);
    }

    const attributes: Record<string, number> = {};
    for (const name of attributeNames) {
        attributes[name] = gl.getAttribLocation(program, name);
    }

    const uniforms: Record<string, WebGLUniformLocation> = {};
    for (const name of uniformNames) {
        const location = gl.getUniformLocation(program, name);
        if (location == null) throw new Error(`Missing uniform: ${name}`);
        uniforms[name] = location;
    }

    return { program, attributes, uniforms };
}

export { createProgram };
export type { Program };
