interface RingState {
    currentBeatCount: number;
    beatPlayed: boolean;
    beatCountChanged: boolean;
    paused: boolean;
}

export default RingState;
