import AppSettings from "./AppSettings";
import VisualizerState from "./VisualizerState";

/**
 * Global applications settings
 */
const appSettings: AppSettings = {
    measureDuration: 2,
    maxRings: 5
};

/**
 * Global visualizer state
 */
const visualizerState: VisualizerState = {
    activeRings: [],
    hoveringRingIdx: undefined,
    animation: {
        progress: 0,
        duration: appSettings.measureDuration * 1000,
        done: false
    }
};

export { appSettings, visualizerState };
