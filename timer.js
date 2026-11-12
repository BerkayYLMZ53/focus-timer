"use strict";

const FocusTimer = (() => {
  const MINUTE = 60_000;
  const DURATIONS = Object.freeze({ focus: 25, short: 5, long: 15 });
  const MODES = Object.keys(DURATIONS);

  function dayKey(timestamp) {
    const date = new Date(timestamp);
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()].join("-");
  }

  function initial() {
    return { durations: { ...DURATIONS }, mode: "focus", remaining: 25 * MINUTE, deadline: null, activity: null };
  }

  function validDurations(durations) {
    return durations && MODES.every((mode) => {
      const minutes = durations[mode];
      return Number.isInteger(minutes) && minutes >= 1 && minutes <= 180;
    });
  }

  function load(serialized) {
    try {
      const saved = JSON.parse(serialized);
      if (!saved || !validDurations(saved.durations) || !MODES.includes(saved.mode)) return initial();
      const max = saved.durations[saved.mode] * MINUTE;
      if (!Number.isFinite(saved.remaining) || saved.remaining < 0 || saved.remaining > max) return initial();
      if (saved.deadline !== null && (!Number.isFinite(saved.deadline) || saved.deadline < 0 || saved.deadline > 8.64e15)) return initial();
      const durations = Object.fromEntries(MODES.map((mode) => [mode, saved.durations[mode]]));
      const activity = saved.activity;
      const validActivity = activity && typeof activity.day === "string"
        && Number.isSafeInteger(activity.count) && activity.count >= 0;
      return {
        durations,
        mode: saved.mode,
        remaining: saved.remaining,
        deadline: saved.deadline,
        activity: validActivity ? { day: activity.day, count: activity.count } : null,
      };
    } catch {
      return initial();
    }
  }

  function settle(state, now) {
    if (state.deadline === null || now < state.deadline) return state;
    let activity = state.activity;
    if (state.mode === "focus") {
      const day = dayKey(state.deadline);
      activity = { day, count: activity?.day === day ? activity.count + 1 : 1 };
    }
    return { ...state, remaining: 0, deadline: null, activity };
  }

  function remainingAt(state, now) {
    if (state.deadline === null) return state.remaining;
    return Math.min(state.remaining, Math.max(0, state.deadline - now));
  }

  function selectMode(state, mode) {
    return { ...state, mode, remaining: state.durations[mode] * MINUTE, deadline: null };
  }

  function toggle(state, now) {
    const current = settle(state, now);
    if (current.deadline !== null) {
      return { ...current, remaining: remainingAt(current, now), deadline: null };
    }
    const remaining = current.remaining || current.durations[current.mode] * MINUTE;
    return { ...current, remaining, deadline: now + remaining };
  }

  function changeDurations(state, durations) {
    if (!validDurations(durations)) throw new RangeError("Süreler 1–180 dakika arasında tam sayı olmalı.");
    return selectMode({ ...state, durations }, state.mode);
  }

  function format(milliseconds) {
    const seconds = Math.ceil(milliseconds / 1000);
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  return { MINUTE, dayKey, initial, load, settle, remainingAt, selectMode, toggle, changeDurations, format };
})();

if (typeof module !== "undefined") module.exports = FocusTimer;
