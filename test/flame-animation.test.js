import assert from "node:assert/strict";
import { test } from "node:test";
import { FLAMES, createFlameAnimation } from "../appearance/flame-animation.js";
import { flamePalette } from "../packs/eo-native/index.js";
import { lampAt, lampOwning, lampPreset, lampTiles } from "../model/lamps.js";
import { partOf } from "../model/parts.js";
import { Layer } from "../layer.js";
import { createMap } from "./map.js";
import { defaultLighting } from "../model/settings.js";

function sprite(width, height, fill = [90, 60, 30, 255]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set(fill, i);
  return { width, height, data };
}

const alpha = (pixels, x, y) => pixels.data[(y * pixels.width + x) * 4 + 3];
const colour = (pixels, x, y) => {
  const i = (y * pixels.width + x) * 4;
  return [...pixels.data.slice(i, i + 3)];
};

test("every moving flame belongs to a lamp and uses only its palette", () => {
  for (const [graphic, spec] of FLAMES) {
    // A part's flame belongs to the lamp that lists it as a part.
    const lamp =
      lampPreset(graphic) ?? lampPreset(partOf(Layer.Objects, graphic)?.owner);
    assert.ok(lamp, `Graphic ${graphic} belongs to no lamp`);
    if (spec.empty || spec.fire) continue;
    assert.ok(spec.frames.length >= 2);
    const width = spec.frames[0][0].length,
      height = spec.frames[0].length;
    for (const rows of spec.frames) {
      assert.equal(rows.length, height);
      for (const row of rows) {
        assert.equal(row.length, width);
        for (const key of row) assert.ok(key === "." || flamePalette[key]);
      }
    }
  }
});

test("a candle's native flame is cleared and replaced by frames that glow only where hot", () => {
  const pixels = sprite(36, 64);
  const { base, frames } = createFlameAnimation(pixels, 587);
  const [left, top, right, bottom] = FLAMES.get(587).clear;
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 36; x++) {
      const inside = x >= left && x <= right && y >= top && y <= bottom;
      assert.equal(alpha(base, x, y), inside ? 0 : 255);
    }
  assert.deepEqual(pixels.data, sprite(36, 64).data);
  assert.equal(frames.length, 4);
  const rows = FLAMES.get(587).frames[1];
  const frame = frames[1];
  assert.deepEqual([frame.x, frame.y], [14, -5]);
  for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[0].length; x++) {
      const key = rows[y][x];
      assert.equal(alpha(frame.flame, x, y), key === "." ? 0 : 255);
      if (key !== ".")
        assert.deepEqual(colour(frame.flame, x, y), flamePalette[key]);
      // Cream and white-hot pixels glow; wick and amber stay unlit.
      assert.equal(
        alpha(frame.core, x, y),
        key === "B" || key === "D" ? 255 : 0,
      );
    }
});

test("a mirror-image candle's flames are its partner's, flipped", () => {
  const own = createFlameAnimation(sprite(36, 64), 587).frames;
  const mirror = createFlameAnimation(sprite(36, 64), 595).frames;
  for (let f = 0; f < own.length; f++) {
    const { width, height } = own[f].flame;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        assert.deepEqual(
          colour(mirror[f].flame, x, y),
          colour(own[f].flame, width - 1 - x, y),
        );
  }
});

test("tapers keep their wick and whole sprite, with the flame drawn above", () => {
  const pixels = sprite(78, 98);
  const { base, frames } = createFlameAnimation(pixels, 742);
  assert.deepEqual(base.data, pixels.data);
  assert.ok(frames.every((frame) => frame.y < 0));
});

test("the bent brazier fire moves but never covers bowl it left showing", () => {
  // A 12 x 20 lit sprite over a 12 x 10 empty bowl, bottom-aligned. Fire fills
  // the top rows and the bowl's middle; the bowl's rims stay uncovered.
  const empty = sprite(12, 10, [0, 0, 0, 0]);
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 12; x++)
      empty.data.set(
        x < 2 || x > 9 ? [120, 120, 120, 255] : [40, 40, 40, 255],
        (y * 12 + x) * 4,
      );
  const lit = sprite(12, 20, [0, 0, 0, 0]);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 12; x++) {
      const i = (y * 12 + x) * 4;
      if (y >= 10)
        lit.data.set(
          empty.data.subarray(
            ((y - 10) * 12 + x) * 4,
            ((y - 10) * 12 + x) * 4 + 4,
          ),
          i,
        );
      if (y < 16 && x >= 2 && x <= 9)
        lit.data.set(x % 3 ? [158, 189, 226, 255] : [255, 255, 255, 255], i);
    }
  const { base, frames } = createFlameAnimation(lit, 546, { empty });
  const spec = FLAMES.get(546);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 12; x++) {
      const expected = y >= 10 ? colour(empty, x, y - 10) : null;
      assert.equal(alpha(base, x, y), expected ? 255 : 0);
      if (expected) assert.deepEqual(colour(base, x, y), expected);
    }
  assert.equal(frames.length, spec.count);
  const fire = new Set(["158,189,226", "255,255,255"]);
  let moved = false;
  for (const frame of frames) {
    assert.deepEqual([frame.x, frame.y], [0, -spec.margin]);
    for (let row = 0; row < frame.flame.height; row++)
      for (let x = 0; x < 12; x++) {
        if (!alpha(frame.flame, x, row)) continue;
        const y = row - spec.margin;
        assert.ok(fire.has(colour(frame.flame, x, row).join()));
        // Rims (grey) never gain fire; only native fire positions or air do.
        assert.ok(
          !(y >= 10 && (x < 2 || x > 9)),
          `Fire covered rim at ${x},${y}`,
        );
        assert.equal(
          alpha(frame.core, x, row) > 0,
          colour(frame.flame, x, row).join() === "255,255,255",
        );
        if (y < 0) moved = true;
      }
  }
  assert.ok(moved, "No frame lifted the fire above the sprite");
});

test("a fireplace borrows fire that shows only through its dark firebox", () => {
  // A 32 x 67 hearth: light stone everywhere, a dark firebox inside the
  // window, and light logs across its foot.
  const hearth = sprite(32, 67, [150, 150, 150, 255]);
  const [left, top, right, bottom] = FLAMES.get(77).window;
  for (let y = top; y <= bottom; y++)
    for (let x = left; x <= right; x++)
      hearth.data.set(
        y > 50 ? [140, 90, 40, 255] : [40, 40, 40, 255],
        (y * 32 + x) * 4,
      );
  // Four 61-px campfire frames: bright flame everywhere except a dark log.
  const campfire = sprite(244, 57, [255, 160, 40, 255]);
  for (let x = 0; x < 244; x++)
    campfire.data.set([60, 30, 10, 255], (5 * 244 + x) * 4);
  const { base, frames } = createFlameAnimation(hearth, 77, { fire: campfire });
  assert.equal(base, null, "the hearth has no native flame to hide");
  assert.equal(frames.length, 4);
  const spec = FLAMES.get(77);
  for (const frame of frames) {
    assert.deepEqual([frame.x, frame.y], [left, top]);
    let fire = 0;
    for (let y = 0; y < frame.flame.height; y++)
      for (let x = 0; x < frame.flame.width; x++) {
        if (!alpha(frame.flame, x, y)) continue;
        fire++;
        const sy = top + y - spec.y;
        // Only firebox pixels within the borrowed rows, never stone or logs,
        // and never the campfire's own log colour.
        assert.ok(top + y <= 50, "fire covered the logs");
        assert.ok(sy >= 0 && sy < spec.fire.rows && sy !== 5);
        assert.deepEqual(colour(frame.flame, x, y), [255, 160, 40]);
        assert.equal(alpha(frame.core, x, y), 0, "amber fire is not white-hot");
      }
    assert.ok(fire > 0);
  }
});

test("a fireplace's two halves resolve to one lamp and place together", () => {
  const emf = createMap(10, 10);
  emf.getTile(4, 3).gfx[1] = 77;
  emf.getTile(5, 3).gfx[1] = 78;
  const lighting = defaultLighting();
  assert.equal(
    lampAt(emf, lighting, 5, 3),
    null,
    "a part is never its own light",
  );
  assert.equal(lampOwning(emf, lighting, 5, 3).key, "4,3,77");
  assert.equal(lampOwning(emf, lighting, 4, 3).key, "4,3,77");
  emf.getTile(4, 3).gfx[1] = 0;
  assert.equal(lampOwning(emf, lighting, 5, 3), null, "orphaned half");
  assert.deepEqual(lampTiles(lampPreset(77), 7, 2), [
    { x: 7, y: 2, graphic: 77 },
    { x: 8, y: 2, graphic: 78 },
  ]);
});
