export const ringColors = [
    "blue",
    "red",
    "yellow",
    "green",
    "purple",
    "sky"
] as const;
export type RingColor = (typeof ringColors)[number];
