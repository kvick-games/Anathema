export function deterministicRand(seed) {
    const x = Math.sin(seed * 999.13) * 43758.5453;
    return x - Math.floor(x);
}
