const ringColors = ["blue", "red", "yellow", "green", "purple", "sky"] as const;
type RingColor = (typeof ringColors)[number];

interface Coords {
    x: number;
    y: number;
}

const instrumentNames = ["kick", "snare", "sine"] as const;
type InstrumentName = (typeof instrumentNames)[number];

export { ringColors, instrumentNames };
export type { RingColor, Coords, InstrumentName };
