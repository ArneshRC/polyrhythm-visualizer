import AppSettings from "./AppSettings";

/**
 * Global applications settings
 */
const appSettings: AppSettings = {
    measureDuration: 2,
    maxRings: 5
};

/**
 * Global audio context
 */
const audioContext = new AudioContext();

export { appSettings, audioContext };
