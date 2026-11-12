"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const timer = require("./timer.js");

test("pauses and resumes with exact remaining milliseconds", () => {
  let state = timer.toggle(timer.initial(), 1000);
  state = timer.toggle(state, 2625);
  assert.equal(state.remaining, 25 * timer.MINUTE - 1625);
  assert.equal(state.deadline, null);
  state = timer.toggle(state, 6000);
  assert.equal(state.deadline, 6000 + state.remaining);
});

test("counts a completed focus session once after restoring a running timer", () => {
  const start = new Date(2026, 0, 2, 12).getTime();
  const running = timer.toggle(timer.initial(), start);
  const loaded = timer.load(JSON.stringify(running));
  const finished = timer.settle(loaded, running.deadline + 50_000);
  assert.equal(finished.remaining, 0);
  assert.deepEqual(finished.activity, { day: timer.dayKey(start), count: 1 });
  assert.strictEqual(timer.settle(finished, running.deadline + 60_000), finished);
});

test("a completed break leaves the focus count alone", () => {
  const running = timer.toggle(timer.selectMode(timer.initial(), "short"), 0);
  assert.equal(timer.settle(running, running.deadline).activity, null);
});

test("changed durations reset the active mode and reject invalid input", () => {
  const running = timer.toggle(timer.initial(), 1);
  const changed = timer.changeDurations(running, { focus: 45, short: 6, long: 20 });
  assert.equal(changed.remaining, 45 * timer.MINUTE);
  assert.equal(changed.deadline, null);
  assert.throws(() => timer.changeDurations(running, { focus: 0, short: 6, long: 20 }), RangeError);
});

test("loads defaults for invalid storage and formats partial seconds", () => {
  assert.deepEqual(timer.load("invalid"), timer.initial());
  assert.deepEqual(timer.load('{"mode":"other"}'), timer.initial());
  const extended = timer.initial();
  extended.durations.extra = 17;
  assert.deepEqual(timer.load(JSON.stringify(extended)), timer.initial());
  assert.equal(timer.format(60_010), "01:01");
  assert.equal(timer.format(0), "00:00");
});
