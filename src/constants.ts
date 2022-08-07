export const text = {
    appName: 'Polyrhythm Visualizer'
}

export const instrumentNames = [ 'kick', 'snare', 'sine' ] as const;
export type InstrumentName = typeof instrumentNames[number];

export type AppSettings = {
    measureDuration: number;
    maxBeaters: number;
}

export type BeaterSettings = {
    beatCount: number;
    instrumentName: InstrumentName;
}

export type BeatQueueItem = {
    beatNumber: number,
    time: number
}

