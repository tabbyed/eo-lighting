# eo-lighting

Lighting for Endless Online maps, shared by the
[eomap-js](https://github.com/tabbyed/eomap-js) editor and game clients such
as [EOWeb](https://github.com/tabbyed/eoweb). Plain JavaScript modules with
TypeScript declarations and no dependencies; nothing here depends on a
renderer.

- **Catalogue** (`packs/eo-native/`): which of EO's own graphics are lamps,
  candles and flames, which walls block light, and the windows painted into
  wall art. A game adds its own art with `extendCatalogue`.
- **Light field** (`LightField`): each light's colour cached over the map at
  fixed height bands, with walls blocking it.
- **Appearance** (`glowOf`, `spriteTint`, `surfaceTints`): what each drawn
  graphic shows, as halos, glowing glass, window panes and flickering
  flames, and how its art is shaded.
- **File** (`readLightingFile`, `serializeLighting`): the companion
  `.lighting.json` saved beside a map.

## Install

```sh
pnpm add "github:tabbyed/eo-lighting#v0.2.0"
```

## Use

```js
import { LightField, readLightingFile, spriteTint } from "eo-lighting";

// `map` is anything with width, height, tiles and getTile(x, y), each tile
// holding its graphic on each layer as `gfx[layer]`.
const { lighting } = readLightingFile(await response.text(), map);
const field = new LightField(map, lighting);
sprite.tint = spriteTint(
  field,
  map,
  { layer, x, y },
  frame.width,
  frame.height,
);
```

A map with no lighting file uses `defaultLighting()`: full daylight, with
the catalogue's lamps and windows lit at their defaults.

## A game's own art

A game that draws graphics the native files don't have, on IDs those files
leave free, lights them by adding them to the catalogue once, before making
any `LightField`:

```js
import { extendCatalogue } from "eo-lighting";

extendCatalogue({
  solidWalls: [1606, 1607], // wall art that blocks light
  lamps: [
    {
      id: "table-candle",
      name: "Table candle",
      graphic: 987,
      color: "#ffcc98",
      brightness: 0.6,
      glow: 1,
      radius: 5,
      height: 34, // the flame above the floor, in pixels
      anchor: { x: -2, y: 0 }, // the floor beneath the flame, from the tile centre
      description: "A candle among a meal",
    },
  ],
  bulbGlass: [[987, { left: 29, top: 0, right: 31, bottom: 3 }]],
  flames: [[987, { shape: "taper", x: 28, y: -3, clear: [29, 0, 31, 3] }]],
  windows: [
    [
      1608,
      3,
      124,
      [10, 45, 17, 51],
      [[223, 160, 68]],
      "Wall lantern",
      { radius: 6 },
    ],
  ],
});
```

Each list takes entries shaped as the native pack's, which documents them.
A graphic already in the catalogue is refused rather than replaced, so a
game can't quietly change how EO's own art is lit.

## Cost

- Sampling the field is O(1), however many lights a map has.
- Building one light is O(Z·R² + A·R): Z height bands, R its reach in
  tiles, A shadow rays. Changing one light recomputes only what it reaches.
- Every catalogue lookup is one Map or Set read. `extendCatalogue` costs
  O(k) for k entries, once.

## Develop

```sh
npm install
npm test             # node --test
npm run format:check # prettier
```

The tests build small maps in memory (`test/map.js`). The editor keeps the
checks that need EO's own graphics files: the window audit, which measures
the native glass this catalogue lists, and the lighting benchmark on real
maps.
