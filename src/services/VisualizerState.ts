import Ring from "../utils/Ring";

interface VisualizerState {
    activeRings: Ring[];
    hoveringRingIdx?: number;
    animation: {
        progress: number;
        duration: number;
        done: boolean;
    };
}

export default VisualizerState;
