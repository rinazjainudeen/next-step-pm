import assert from "node:assert/strict";
import { test } from "node:test";
import { AMBIENT_BLOCKS, CYCLE, CYCLE_LENGTH, NARROW_BELOW, PATH, PATH_LENGTH, PATH_NARROW, alignment, cycleOf, drift, pathBlocks, pathFor, pathPoint } from "./hero-ambient";

test("the hero's background keeps to a handful of blocks, all inside the hero", () => {
  assert.ok(AMBIENT_BLOCKS.length <= 12);
  for (const block of AMBIENT_BLOCKS) {
    assert.ok(block.x > 0 && block.x < 1 && block.y > 0 && block.y < 1);
    assert.ok(block.width <= 40 && block.height <= 24, "small blocks");
  }
});

test("blocks start where they rest, so nothing jumps when the motion starts", () => {
  for (const block of AMBIENT_BLOCKS) {
    const start = drift(block, 0);
    assert.ok(Math.abs(start.x) < 1e-9 && Math.abs(start.y) < 1e-9 && Math.abs(start.turn) < 1e-9);
  }
});

test("blocks drift slowly and not far", () => {
  for (const block of AMBIENT_BLOCKS) {
    assert.ok(block.period >= 15000, "a loop takes at least 15 seconds");
    for (let time = 0; time < block.period; time += 500) {
      const { x, y } = drift(block, time);
      assert.ok(Math.hypot(x, y) <= block.reach * 2.5);
    }
  }
});

test("the path lines up every few seconds, holds, then loosens", () => {
  assert.ok(CYCLE_LENGTH >= 8000 && CYCLE_LENGTH <= 12000);
  assert.equal(alignment(0), 0);
  assert.equal(alignment(CYCLE.drift - 1), 0);
  assert.equal(alignment(CYCLE.drift + CYCLE.gather + 10), 1);
  assert.ok(alignment(CYCLE.drift + CYCLE.gather / 2) > 0 && alignment(CYCLE.drift + CYCLE.gather / 2) < 1);
  assert.ok(alignment(CYCLE_LENGTH - 1) < 0.01, "loose again by the end of the loop");
  assert.equal(alignment(CYCLE_LENGTH), 0);
});

test("each loop lines up a different mix of blocks, in left-to-right order", () => {
  const seen = new Set<string>();
  for (let cycle = 0; cycle < 6; cycle++) {
    const chosen = pathBlocks(cycle);
    assert.equal(chosen.length, PATH_LENGTH);
    assert.equal(new Set(chosen).size, PATH_LENGTH);
    assert.deepEqual(chosen, [...chosen].sort((a, b) => a - b));
    assert.deepEqual(pathBlocks(cycle), chosen, "the same every time");
    seen.add(chosen.join());
  }
  assert.ok(seen.size > 1);
  assert.equal(cycleOf(CYCLE_LENGTH * 2 + 5), 2);
});

test("the path is a short line rising to the right, on the hero's right-hand side", () => {
  assert.deepEqual(pathPoint(0), PATH.from);
  const end = pathPoint(PATH_LENGTH - 1);
  assert.ok(Math.abs(end.x - PATH.to.x) < 1e-9 && Math.abs(end.y - PATH.to.y) < 1e-9);
  for (const path of [PATH, PATH_NARROW]) {
    assert.ok(path.from.x >= 0.5, "away from the start of the headline");
    assert.ok(path.to.y < path.from.y, "rises");
    assert.ok(path.to.x <= 0.95 && path.from.y <= 0.96, "inside the hero");
  }
});

test("on phones the path sits low, beside the buttons rather than behind the words", () => {
  assert.equal(pathFor(412), PATH_NARROW);
  assert.equal(pathFor(NARROW_BELOW), PATH);
  assert.equal(pathFor(1440), PATH);
  assert.ok(PATH_NARROW.to.y >= 0.75);
});
