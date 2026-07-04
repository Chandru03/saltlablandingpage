// WebHID transport + UI wiring for the DC03 Pro web controller.
//
// The DAC is plugged into the user's own machine; the browser talks to it
// directly over WebHID. Nothing is sent to a server — this page is 100% static
// and works offline once loaded.

import {
  VENDOR_ID,
  PRODUCT_ID,
  REPORT_SIZE,
  filterNames,
  gainNames,
  outputNames,
  presets,
  digitalFilterReports,
  gainReports,
  outputReports,
  volumeReports,
  presetReports,
} from "./dc03pro.js";
import {
  USAGE,
  USAGE_LABEL,
  buildInputMap,
  decodeActiveUsages,
  toHexBytes,
} from "./input-decode.js";

const SEND_GAP_MS = 20; // mirrors the 20ms usleep between reports in the macOS app.
const DEVICE_VOL_STEP = 1; // UI nudge per physical button press.
const MONITOR_ROWS = 8;
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** @type {HIDDevice | null} */
let device = null;
let inputMap = null;
let prevActive = new Set();
let muted = false;
const monitorHistory = [];
let lastMonitorBytes = null;

const els = {
  unsupported: $("unsupported"),
  app: $("app"),
  statusDot: $("statusDot"),
  connectBtn: $("connectBtn"),
  connectLabel: $("connectLabel"),
  presetGrid: $("presetGrid"),
  filterSeg: $("filterSeg"),
  filterName: $("filterName"),
  gainSeg: $("gainSeg"),
  outputSeg: $("outputSeg"),
  volumeSlider: $("volumeSlider"),
  volReadout: $("volReadout"),
  volDots: $("volDots"),
  balanceSlider: $("balanceSlider"),
  balReadout: $("balReadout"),
  deviceEvent: $("deviceEvent"),
  monitor: $("monitor"),
  monStatus: $("monStatus"),
  feedback: $("feedback"),
  rawInput: $("rawInput"),
  rawSend: $("rawSend"),
  rawToggle: $("rawToggle"),
  rawPanel: $("rawPanel"),
};

// Current UI state, kept so presets can re-drive the controls.
const state = { filter: 0, gain: 0, output: 0, volume: 75, balance: 0 };
const segControls = {};

// ---- Dot-matrix display -----------------------------------------------------
// A hand-built 5x7 dot font for 0-9 — no proprietary typeface, drawn in code.
const GLYPHS = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
};

function renderMatrix(value) {
  els.volDots.textContent = "";
  for (const char of String(value)) {
    const glyph = GLYPHS[char];
    if (!glyph) continue;
    const digit = document.createElement("div");
    digit.className = "dm-digit";
    for (const rowBits of glyph) {
      for (const bit of rowBits) {
        const dot = document.createElement("span");
        dot.className = bit === "1" ? "dm-dot on" : "dm-dot";
        digit.appendChild(dot);
      }
    }
    els.volDots.appendChild(digit);
  }
}

// ---- Transport --------------------------------------------------------------
function isSupported() {
  return "hid" in navigator && typeof navigator.hid.requestDevice === "function";
}
function isConnected() {
  return device && device.opened;
}

async function sendReports(reports) {
  if (!isConnected()) {
    feedback("Connect your DC03 Pro first", "warn");
    return false;
  }
  try {
    for (const report of reports) {
      await device.sendReport(0, report); // report ID 0; data is the 16 bytes.
      await sleep(SEND_GAP_MS);
    }
    return true;
  } catch (err) {
    console.error(err);
    feedback("Send failed — reconnect the DAC", "warn");
    await handleDisconnect();
    return false;
  }
}

async function openDevice(dev) {
  device = dev;
  if (!dev.opened) await dev.open();

  // Read the device's own report descriptor so we can decode its input
  // reports (physical button presses) by usage rather than guessed offsets.
  inputMap = buildInputMap(dev.collections);
  prevActive = new Set();
  dev.addEventListener("inputreport", onInputReport);

  setStatus(true);
  if (els.monStatus) els.monStatus.textContent = "LISTENING";
  feedback("Connected", "ok");
}

// Fired whenever the DAC sends an input report (e.g. a button press).
function onInputReport(event) {
  pushMonitor(event.reportId, event.data);

  const active = decodeActiveUsages(event.reportId, event.data, inputMap);
  for (const usage of active) {
    if (!prevActive.has(usage)) onDeviceButton(usage); // rising edge only
  }
  prevActive = active;
}

function onDeviceButton(usage) {
  switch (usage) {
    case USAGE.VOL_UP:
      nudgeVolumeFromDevice(DEVICE_VOL_STEP);
      break;
    case USAGE.VOL_DOWN:
      nudgeVolumeFromDevice(-DEVICE_VOL_STEP);
      break;
    case USAGE.MUTE:
      muted = !muted;
      flashDeviceEvent(muted ? "MUTED" : "UNMUTED");
      break;
    default:
      flashDeviceEvent(USAGE_LABEL[usage] || "DEVICE");
  }
}

// Reflect a physical volume button in the UI in real time. This tracks the
// direction of the press; it does not re-write the DAC register (the buttons
// drive system volume, a separate stage from the slider's hardware attenuation).
function nudgeVolumeFromDevice(delta) {
  const next = Math.max(0, Math.min(100, state.volume + delta));
  els.volumeSlider.value = String(next);
  syncVolume();
  flashDeviceEvent(delta > 0 ? "▲ VOL +" : "▼ VOL −");
}

let deviceEventTimer;
function flashDeviceEvent(text) {
  if (!els.deviceEvent) return;
  els.deviceEvent.textContent = text;
  els.deviceEvent.classList.add("show");
  clearTimeout(deviceEventTimer);
  deviceEventTimer = setTimeout(() => els.deviceEvent.classList.remove("show"), 900);
}

// Live raw-byte monitor with per-byte change highlighting.
function pushMonitor(reportId, view) {
  const bytes = toHexBytes(view);
  const changed = bytes.map((b, i) => !lastMonitorBytes || lastMonitorBytes[i] !== b);
  lastMonitorBytes = bytes;
  monitorHistory.unshift({ reportId, bytes, changed });
  if (monitorHistory.length > MONITOR_ROWS) monitorHistory.pop();
  renderMonitor();
}

function renderMonitor() {
  if (!els.monitor) return;
  els.monitor.textContent = "";
  for (const row of monitorHistory) {
    const line = document.createElement("div");
    line.className = "mon-row";
    const id = document.createElement("span");
    id.className = "mon-id";
    id.textContent = row.reportId.toString(16).padStart(2, "0");
    line.appendChild(id);
    row.bytes.forEach((b, i) => {
      const span = document.createElement("span");
      span.className = row.changed[i] ? "mon-b chg" : "mon-b";
      span.textContent = b;
      line.appendChild(span);
    });
    els.monitor.appendChild(line);
  }
}

async function connect() {
  if (!isSupported()) return;
  try {
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: VENDOR_ID, productId: PRODUCT_ID }],
    });
    if (!devices.length) {
      feedback("No device selected", "warn");
      return;
    }
    await openDevice(devices[0]);
  } catch (err) {
    console.error(err);
    feedback("Could not open the device", "warn");
  }
}

// Re-attach silently to an already-granted device (no prompt).
async function tryReconnect() {
  if (!isSupported()) return;
  const granted = await navigator.hid.getDevices();
  const match = granted.find(
    (d) => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID
  );
  if (match) {
    try {
      await openDevice(match);
    } catch {
      setStatus(false);
    }
  }
}

async function handleDisconnect() {
  if (device) device.removeEventListener("inputreport", onInputReport);
  device = null;
  inputMap = null;
  prevActive = new Set();
  if (els.monStatus) els.monStatus.textContent = "IDLE";
  setStatus(false);
}

// ---- UI state ---------------------------------------------------------------
function setStatus(connected) {
  els.app.classList.toggle("connected", connected);
  els.connectBtn.classList.toggle("is-live", connected);
  els.connectLabel.textContent = connected ? "CONNECTED" : "CONNECT";
}

let feedbackTimer;
function feedback(msg, kind = "ok") {
  els.feedback.textContent = msg;
  els.feedback.className = `feedback ${kind}`;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    els.feedback.textContent = "";
    els.feedback.className = "feedback";
  }, 3500);
}

// ---- Segmented controls -----------------------------------------------------
function buildSegmented(container, labels, onSelect) {
  const buttons = [];
  labels.forEach((label, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seg";
    b.textContent = label;
    b.addEventListener("click", () => {
      select(i);
      onSelect(i);
    });
    container.appendChild(b);
    buttons.push(b);
  });
  function select(i) {
    buttons.forEach((btn, j) => btn.classList.toggle("active", j === i));
  }
  return { select };
}

// ---- Controls ---------------------------------------------------------------
function buildPresets() {
  presets.forEach((preset) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset";
    btn.textContent = preset.name;
    btn.addEventListener("click", async () => {
      applyPresetToUI(preset);
      if (await sendReports(presetReports(preset))) {
        feedback(`Preset · ${preset.name}`, "ok");
      }
    });
    els.presetGrid.appendChild(btn);
  });
}

function applyPresetToUI(preset) {
  state.filter = preset.filter;
  state.gain = preset.gain;
  state.output = preset.output;
  state.volume = preset.volume;
  state.balance = preset.balance;

  segControls.filter.select(preset.filter);
  els.filterName.textContent = filterNames[preset.filter].toUpperCase();
  segControls.gain.select(preset.gain);
  segControls.output.select(preset.output);

  els.volumeSlider.value = String(preset.volume);
  els.balanceSlider.value = String(preset.balance);
  syncVolume();
  syncBalance();
}

function syncVolume() {
  const v = Number(els.volumeSlider.value);
  state.volume = v;
  els.volReadout.textContent = String(v);
  renderMatrix(v);
}

function syncBalance() {
  const b = Number(els.balanceSlider.value);
  state.balance = b;
  els.balReadout.textContent = b > 0 ? `RIGHT +${b}` : b < 0 ? `LEFT +${-b}` : "CENTER";
}

function parseRawReport(text) {
  const tokens = text.trim().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) throw new Error("empty");
  const bytes = tokens.map((t) => {
    const n = parseInt(t.replace(/^0x/i, ""), 16);
    if (Number.isNaN(n) || n < 0 || n > 255) throw new Error(`bad byte ${t}`);
    return n;
  });
  if (bytes.length > REPORT_SIZE) throw new Error(`max ${REPORT_SIZE} bytes`);
  const report = new Uint8Array(REPORT_SIZE);
  report.set(bytes);
  return report;
}

// ---- Init -------------------------------------------------------------------
function init() {
  // Build the whole UI regardless of WebHID support, so the layout is always
  // viewable (e.g. previewing on an iPhone, which has no WebHID).
  segControls.filter = buildSegmented(
    els.filterSeg,
    filterNames.map((_, i) => String(i)),
    async (i) => {
      state.filter = i;
      els.filterName.textContent = filterNames[i].toUpperCase();
      if (await sendReports(digitalFilterReports(i))) feedback(`Filter · ${filterNames[i]}`, "ok");
    }
  );
  segControls.gain = buildSegmented(els.gainSeg, ["LOW", "MID", "HIGH"], async (i) => {
    state.gain = i;
    if (await sendReports(gainReports(i))) feedback(`Gain · ${gainNames[i]}`, "ok");
  });
  segControls.output = buildSegmented(els.outputSeg, ["NORMAL", "POWER SAVE"], async (i) => {
    state.output = i;
    if (await sendReports(outputReports(i))) feedback(`Output · ${outputNames[i]}`, "ok");
  });

  // Initial selection reflects default state.
  segControls.filter.select(state.filter);
  segControls.gain.select(state.gain);
  segControls.output.select(state.output);
  els.filterName.textContent = filterNames[state.filter].toUpperCase();

  buildPresets();
  syncVolume();
  syncBalance();

  // Live readout while dragging; apply the level on release.
  els.volumeSlider.addEventListener("input", syncVolume);
  els.balanceSlider.addEventListener("input", syncBalance);
  els.volumeSlider.addEventListener("change", applyLevel);
  els.balanceSlider.addEventListener("change", applyLevel);

  els.rawToggle.addEventListener("click", () => {
    const open = els.rawPanel.hidden;
    els.rawPanel.hidden = !open;
    els.rawToggle.setAttribute("aria-expanded", String(open));
  });
  els.rawSend.addEventListener("click", async () => {
    let report;
    try {
      report = parseRawReport(els.rawInput.value);
    } catch (err) {
      feedback(`Invalid report — ${err.message}`, "warn");
      return;
    }
    if (await sendReports([report])) feedback("Raw report sent", "ok");
  });

  // Without WebHID (e.g. iPhone/Safari) show the preview banner and stop here —
  // the UI is still fully rendered for layout inspection.
  if (!isSupported()) {
    els.unsupported.hidden = false;
    els.connectBtn.disabled = true;
    els.connectBtn.classList.add("disabled");
    els.connectLabel.textContent = "NO WEBHID";
    return;
  }

  els.connectBtn.addEventListener("click", connect);

  navigator.hid.addEventListener("connect", (e) => {
    if (e.device.vendorId === VENDOR_ID && e.device.productId === PRODUCT_ID && !isConnected()) {
      openDevice(e.device).catch(() => {});
    }
  });
  navigator.hid.addEventListener("disconnect", (e) => {
    if (device && e.device === device) handleDisconnect();
  });

  tryReconnect();
}

async function applyLevel() {
  const volume = Number(els.volumeSlider.value);
  const balance = Number(els.balanceSlider.value);
  if (await sendReports(volumeReports(volume, balance))) {
    feedback(`Level · ${volume}${balance ? (balance > 0 ? ` R+${balance}` : ` L+${-balance}`) : ""}`, "ok");
  }
}

init();
