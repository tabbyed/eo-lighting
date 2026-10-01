import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extendCatalogue,
  lampAt,
  lampPreset,
  windowAt,
  defaultLighting,
  LightField,
  SOLID_WALL_GRAPHICS,
  WINDOW_DEFINITIONS,
} from "../index.js";
import { FLAMES } from "../appearance/flame-animation.js";
import { createMap } from "./map.js";

// A game's own art, on graphic IDs the native files leave free. Each test
// file runs in its own process, so what this adds stays here.
const CANDLE_TABLE = 9001;
const LANTERN_WALL = 9101;
extendCatalogue({
  solidWalls: [LANTERN_WALL],
  lamps: [
    {
      id: "test-table-candle",
      name: "Table candle",
      graphic: CANDLE_TABLE,
      variants: [{ graphic: CANDLE_TABLE + 1, anchor: { x: -3, y: 0 } }],
      color: "#ffcc98",
      brightness: 0.6,
      glow: 1,
      radius: 5,
      height: 34,
      anchor: { x: -2, y: 0 },
      description: "A candle on a table",
    },
  ],
  bulbGlass: [[CANDLE_TABLE, { left: 29, top: 0, right: 31, bottom: 3 }]],
  flames: [
    [CANDLE_TABLE, { shape: "taper", x: 28, y: -3, clear: [29, 0, 31, 3] }],
  ],
  windows: [
    [
      LANTERN_WALL,
      3,
      124,
      [10, 45, 17, 51],
      [[223, 160, 68]],
      "Wall lantern",
      { radius: 6 },
    ],
  ],
});

test("added art is found as the native art is", () => {
  assert.equal(lampPreset(CANDLE_TABLE).id, "test-table-candle");
  // A variant keeps its own anchor and shares the rest.
  assert.deepEqual(lampPreset(CANDLE_TABLE + 1).anchor, { x: -3, y: 0 });
  assert.equal(lampPreset(CANDLE_TABLE + 1).radius, 5);
  assert.ok(SOLID_WALL_GRAPHICS.has(LANTERN_WALL));
  assert.equal(WINDOW_DEFINITIONS.get(LANTERN_WALL).fixture, "lantern");
  // A flame named by shape gets the pack's frames.
  assert.ok(FLAMES.get(CANDLE_TABLE).frames.length > 0);
});

test("added lamps and wall lanterns light a map", () => {
  const map = createMap(12, 12);
  map.getTile(5, 5).gfx[1] = CANDLE_TABLE;
  map.getTile(3, 0).gfx[3] = LANTERN_WALL;
  const lighting = {
    ...defaultLighting(),
    ambient: { brightness: 0, color: "#000000" },
  };
  assert.equal(lampAt(map, lighting, 5, 5).graphic, CANDLE_TABLE);
  assert.equal(windowAt(map, lighting, 3, 0, 3).radius, 6);
  const field = new LightField(map, lighting);
  assert.notEqual(field.tint(5, 5), 0, "the candle lights its tile");
  assert.notEqual(field.tint(3, 1), 0, "the lantern lights the room");
});

test("a graphic already in the catalogue is refused, not replaced", () => {
  const candlestick = lampPreset(40);
  assert.throws(
    () => extendCatalogue({ lamps: [{ ...candlestick, id: "test-again" }] }),
    /already/,
  );
  assert.throws(
    () => extendCatalogue({ lamps: [{ ...candlestick, graphic: 9201 }] }),
    /already called/,
  );
  assert.throws(
    () =>
      extendCatalogue({
        bulbGlass: [[CANDLE_TABLE, { left: 0, top: 0, right: 1, bottom: 1 }]],
      }),
    /already/,
  );
  assert.throws(
    () =>
      extendCatalogue({
        flames: [[CANDLE_TABLE, { shape: "taper", x: 0, y: 0 }]],
      }),
    /already/,
  );
  assert.throws(
    () =>
      extendCatalogue({
        windows: [[LANTERN_WALL, 3, 124, [0, 0, 1, 1], [0, 0, 0], "Again"]],
      }),
    /already/,
  );
  assert.equal(lampPreset(40), candlestick);
});

test("a flame shape must exist, and glass must lie inside its bitmap", () => {
  assert.throws(
    () => extendCatalogue({ flames: [[9301, { shape: "torch", x: 0, y: 0 }]] }),
    /No flame shape/,
  );
  assert.throws(
    () =>
      extendCatalogue({
        windows: [[9302, 3, 124, [20, 45, 40, 51], [0, 0, 0], "Too wide"]],
      }),
    /outside/,
  );
});
