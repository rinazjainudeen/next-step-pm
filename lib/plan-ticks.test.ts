import { test } from "node:test";
import assert from "node:assert/strict";
import { TICKS_KEY, countTicked, readTicks, toggleTick, writeTicks, type TickStorage } from "./plan-ticks";

function memoryStorage(initial?: string): TickStorage & { value: string | null } {
  return {
    value: initial ?? null,
    getItem() {
      return this.value;
    },
    setItem(_key, value) {
      this.value = value;
    },
  };
}

const brokenStorage: TickStorage = {
  getItem() {
    throw new Error("storage is off");
  },
  setItem() {
    throw new Error("storage is off");
  },
};

test("ticks are saved and read back", () => {
  const storage = memoryStorage();
  assert.equal(writeTicks(storage, ["a", "b"]), true);
  assert.deepEqual(readTicks(storage), ["a", "b"]);
});

test("nothing saved reads as no ticks", () => {
  assert.deepEqual(readTicks(memoryStorage()), []);
});

test("a browser that refuses storage doesn't break anything", () => {
  assert.deepEqual(readTicks(brokenStorage), []);
  assert.equal(writeTicks(brokenStorage, ["a"]), false);
});

test("damaged saved data is ignored", () => {
  assert.deepEqual(readTicks(memoryStorage("{not json")), []);
  assert.deepEqual(readTicks(memoryStorage('{"a":1}')), []);
  assert.deepEqual(readTicks(memoryStorage('["a",1,null]')), ["a"]);
});

test("ticking adds and ticking again removes", () => {
  assert.deepEqual(toggleTick([], "a"), ["a"]);
  assert.deepEqual(toggleTick(["a", "b"], "a"), ["b"]);
});

test("only this plan's steps are counted", () => {
  assert.equal(countTicked(["a", "other"], ["a", "b"]), 1);
});

test("the storage key is stable, so ticks survive updates to the site", () => {
  assert.equal(TICKS_KEY, "next-step-pm:ticks");
});
