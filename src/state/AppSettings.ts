interface AppSettings {
    /**
     * Duration of a measure in seconds
     */
    measureDuration: number;
    /**
     * Maximum number of rings
     */
    maxRings: number;
    /**
     * Whether to draw with WebGL instead of the 2D canvas
     */
    useWebGL: boolean;
}

export default AppSettings;
