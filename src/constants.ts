export const text = {
    appName: "Polyrhythm Visualizer",
    clickToStart: "Click to start"
}

export const instrumentNames = [ 'kick', 'snare', 'sine' ] as const;
export type InstrumentName = typeof instrumentNames[number];

export type AppSettings = {
    measureDuration: number;
    maxBeaters: number;
}

export type BeaterSettings = {
    currentBeatCount: number;
    instrumentName: InstrumentName;
    newBeatCount: number;
}

export type BeatQueueItem = {
    beatNumber: number,
    time: number
}

