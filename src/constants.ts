const ringColors = ["blue", "red", "yellow", "green", "purple", "sky"] as const;
type RingColor = (typeof ringColors)[number];

interface Coords {
    x: number;
    y: number;
}

export { ringColors };
export type { RingColor, Coords };
