/**
 * Returns a promise which resolves after `ms` milliseconds
 *
 * @param ms Milliseconds to sleep for
 */

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Swap two elements in an array
 *
 * @param array The array where the elements would be swapped
 * @param indexA The index of the first element
 * @param indexB The index of the second element
 */
export function swap<T>(array: Array<T>, indexA: number, indexB: number): void {
    [array[indexA], array[indexB]] = [array[indexB], array[indexA]];
}
