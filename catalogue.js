import { addSolidWalls } from "./field/walls.js";
import { addLamps } from "./model/lamps.js";
import { addWindowParts, addWindows } from "./model/windows.js";
import { addBulbGlass } from "./appearance/lamp-emission.js";
import { addFlames } from "./appearance/flame-animation.js";

/**
 * Adds a game's own art to the catalogue: graphics the native files don't
 * have, which the game draws from its own images, lit as the native ones
 * are. Each list takes entries shaped as the native pack's
 * (packs/eo-native/), and a graphic already in the catalogue is refused
 * rather than replaced.
 *
 * Call it once, as the game starts and before any LightField is made: a
 * field reads the catalogue as it builds. Adding k entries costs O(k), and
 * every lookup afterwards is still one Map or Set read.
 */
export function extendCatalogue({
  solidWalls = [],
  lamps = [],
  bulbGlass = [],
  flames = [],
  windowParts = [],
  windows = [],
} = {}) {
  addSolidWalls(solidWalls);
  addLamps(lamps);
  addBulbGlass(bulbGlass);
  addFlames(flames);
  // A window's light is placed using its parts' glass, so parts go first.
  addWindowParts(windowParts);
  addWindows(windows);
}
