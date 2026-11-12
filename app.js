"use strict";

const key = "focus-timer-v1";
const modeLabels = { focus: "Odak", short: "Kısa mola", long: "Uzun mola" };
const time = document.querySelector("#time");
const status = document.querySelector("#status");
const toggle = document.querySelector("#toggle");
const dial = document.querySelector("#dial");
const modeLabel = document.querySelector("#mode-label");
const sessions = document.querySelector("#sessions");
const storageNote = document.querySelector("#storage-note");
const settings = document.querySelector("#settings");
const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));

let state = FocusTimer.initial();
try {
  state = FocusTimer.load(localStorage.getItem(key));
} catch {
  storageNote.hidden = false;
}

for (const [mode, minutes] of Object.entries(state.durations)) {
  settings.elements.namedItem(mode).value = minutes;
}

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    storageNote.hidden = false;
  }
}

function render(now = Date.now()) {
  const finished = FocusTimer.settle(state, now);
  if (finished !== state) {
    state = finished;
    save();
  }
  const remaining = FocusTimer.remainingAt(state, now);
  const formatted = FocusTimer.format(remaining);
  const label = modeLabels[state.mode];
  const running = state.deadline !== null;
  const message = remaining === 0 ? label + " süresi tamamlandı." : "";
  if (time.textContent !== formatted) time.textContent = formatted;
  if (status.textContent !== message) status.textContent = message;
  document.title = formatted + " · " + label;
  dial.style.setProperty("--progress", (100 * remaining / (state.durations[state.mode] * FocusTimer.MINUTE)) + "%");
  toggle.textContent = running ? "Duraklat" : remaining > 0 && remaining < state.durations[state.mode] * FocusTimer.MINUTE ? "Sürdür" : "Başlat";
  modeLabel.textContent = label;
  sessions.textContent = state.activity?.day === FocusTimer.dayKey(now) ? state.activity.count : 0;
  for (const button of modeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
  }
}

function update(change) {
  const now = Date.now();
  state = change(FocusTimer.settle(state, now), now);
  save();
  render(now);
}

toggle.addEventListener("click", () => update(FocusTimer.toggle));
document.querySelector("#reset").addEventListener("click", () => update((current) => FocusTimer.selectMode(current, current.mode)));
for (const button of modeButtons) {
  button.addEventListener("click", () => {
    if (button.dataset.mode !== state.mode) update((current) => FocusTimer.selectMode(current, button.dataset.mode));
  });
}
settings.addEventListener("submit", (event) => {
  event.preventDefault();
  const durations = Object.fromEntries(Array.from(new FormData(settings), ([mode, value]) => [mode, Number(value)]));
  update((current) => FocusTimer.changeDurations(current, durations));
});
document.addEventListener("visibilitychange", () => render());
setInterval(render, 250);
render();
