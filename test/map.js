// A blank map as the lighting reads one, for tests: its size, and each
// tile's graphic on each of the nine layers, all empty until a test sets one.
export function createMap(width, height) {
  const tiles = Array.from({ length: width * height }, () => ({
    gfx: new Array(9).fill(null),
    spec: null,
  }));
  return { width, height, tiles, getTile: (x, y) => tiles[y * width + x] };
}
