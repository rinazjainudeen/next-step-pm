import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkContent, loadBlocks } from "./blocks-load";
import { makeBlock } from "./blocks-fixture";

const TODAY = { today: "2026-11-04" };
const tempDirs: string[] = [];

/** Makes a temporary blocks folder from { "folder/file.json": contents }. */
function makeContentDir(files: Record<string, unknown>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nextsteppm-blocks-"));
  tempDirs.push(dir);
  for (const [rel, contents] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, typeof contents === "string" ? contents : JSON.stringify(contents));
  }
  return dir;
}

after(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

test("valid blocks are loaded from their folders", () => {
  const dir = makeContentDir({
    "define/define-test-block.json": makeBlock(),
    "cross-phase/any-wow.json": makeBlock({ id: "any-wow", phase: "any", kind: "ways-of-working" }),
  });
  const result = checkContent(dir, TODAY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.fileCount, 2);
  assert.equal(result.blocks.length, 2);
});

test("blocks come back in lifecycle order, with any-phase blocks last", () => {
  const dir = makeContentDir({
    "cross-phase/any-wow.json": makeBlock({ id: "any-wow", phase: "any", kind: "ways-of-working" }),
    "build/build-thing.json": makeBlock({ id: "build-thing", phase: "build" }),
    "discover/discover-thing.json": makeBlock({ id: "discover-thing", phase: "discover" }),
  });
  assert.deepEqual(
    checkContent(dir, TODAY).blocks.map((block) => block.id),
    ["discover-thing", "build-thing", "any-wow"],
  );
});

test("a file that isn't valid JSON gets a friendly message naming the file", () => {
  const dir = makeContentDir({ "define/broken.json": '{ "id": "broken", ' });
  const { errors } = checkContent(dir, TODAY);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /^define\/broken\.json: this isn't valid JSON/);
});

test("a block's problems are reported with its file path", () => {
  const dir = makeContentDir({ "define/define-test-block.json": { ...makeBlock(), kind: "nonsense" } });
  const { errors } = checkContent(dir, TODAY);
  assert.ok(errors.some((error) => error.startsWith("define/define-test-block.json: kind:")));
});

test("a folder that isn't a phase is reported", () => {
  const dir = makeContentDir({ "misc/thing.json": makeBlock() });
  assert.ok(checkContent(dir, TODAY).errors.some((error) => error.includes("misc/")));
});

test("a loose file, or a non-JSON file in a folder, is reported", () => {
  const dir = makeContentDir({ "loose.json": makeBlock(), "define/notes.txt": "hello" });
  const { errors } = checkContent(dir, TODAY);
  assert.ok(errors.some((error) => error.startsWith("loose.json")));
  assert.ok(errors.some((error) => error.startsWith("define/notes.txt")));
});

test("hidden files such as .DS_Store are ignored", () => {
  const dir = makeContentDir({ ".DS_Store": "x", "define/.DS_Store": "x", "define/define-test-block.json": makeBlock() });
  assert.deepEqual(checkContent(dir, TODAY).errors, []);
});

test("a block in the wrong folder is reported", () => {
  const dir = makeContentDir({ "build/define-test-block.json": makeBlock({ phase: "define" }) });
  assert.ok(checkContent(dir, TODAY).errors.some((error) => error.includes('belongs in the "define" folder')));
});

test("checks across files run too: a missing dependency is found", () => {
  const dir = makeContentDir({ "define/define-test-block.json": makeBlock({ dependsOn: ["ghost"] }) });
  assert.ok(checkContent(dir, TODAY).errors.some((error) => error.includes("no block has that id")));
});

test("placeholder blocks give a warning, not an error", () => {
  const dir = makeContentDir({ "define/define-test-block.json": makeBlock({ placeholder: true }) });
  const result = checkContent(dir, TODAY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
});

test("a missing blocks folder is reported, not a crash", () => {
  const { errors } = checkContent(path.join(os.tmpdir(), "nextsteppm-does-not-exist"), TODAY);
  assert.equal(errors.length, 1);
});

test("loadBlocks stops the build when a block is wrong, and succeeds when all is well", () => {
  const bad = makeContentDir({ "define/define-test-block.json": { ...makeBlock(), kind: "nonsense" } });
  assert.throws(() => loadBlocks(bad), /problem/);
  const good = makeContentDir({ "define/define-test-block.json": makeBlock() });
  assert.equal(loadBlocks(good).length, 1);
});

test("the real blocks in content/blocks all pass", () => {
  const { errors } = checkContent();
  assert.deepEqual(errors, []);
});
