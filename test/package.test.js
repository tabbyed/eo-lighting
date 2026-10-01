import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// The package is installed on its own by the editor and by game clients. It
// must stand alone and describe itself truly.
const root = path.resolve(import.meta.dirname, "..");
const SOURCE = [
  "index.js",
  "catalogue.js",
  "layer.js",
  "pixels.js",
  "appearance",
  "field",
  "file",
  "model",
  "packs",
];

function modules(entries = SOURCE.map((name) => path.join(root, name))) {
  return entries.flatMap((file) => {
    if (fs.statSync(file).isDirectory())
      return modules(fs.readdirSync(file).map((name) => path.join(file, name)));
    return file.endsWith(".js") ? [file] : [];
  });
}

test("the package imports nothing from outside itself, always by full file name", () => {
  for (const file of modules()) {
    const source = fs.readFileSync(file, "utf8");
    for (const [, specifier] of source.matchAll(/from\s+"([^"]+)"/g)) {
      const where = `${path.relative(root, file)} imports ${specifier}`;
      assert.ok(specifier.startsWith("."), `${where}: a dependency`);
      assert.ok(specifier.endsWith(".js"), `${where}: no file extension`);
      const target = path.resolve(path.dirname(file), specifier);
      assert.ok(target.startsWith(root + path.sep), `${where}: outside`);
      assert.ok(fs.existsSync(target), `${where}: missing`);
    }
  }
});

test("index.d.ts declares exactly what index.js exports", async () => {
  const exported = Object.keys(await import("../index.js")).sort();
  const declarations = fs.readFileSync(path.join(root, "index.d.ts"), "utf8");
  const declared = [
    ...declarations.matchAll(/export declare (?:const|function|class) (\w+)/g),
  ]
    .map(([, name]) => name)
    .sort();
  assert.deepEqual([...new Set(declared)], exported);
});

test("the manifest points at the entry, its types, its files and the licence", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );
  assert.equal(manifest.name, "eo-lighting");
  assert.equal(manifest.type, "module");
  assert.equal(manifest.license, "MIT");
  const entry = manifest.exports["."];
  for (const file of [entry.default, entry.types, manifest.types, "LICENSE"])
    assert.ok(fs.existsSync(path.join(root, file)), file);
  // What's published is the source and its types: no tests, no tooling.
  assert.deepEqual(
    [...manifest.files].sort(),
    [...SOURCE, "index.d.ts"].sort(),
  );
});
