// DC03 Pro control protocol — JavaScript port of the macOS app's HID logic.
//
// Every control is expressed as one or more 16-byte HID output reports sent
// with report ID 0. This module is transport-agnostic: it only builds the
// report byte arrays. See app.js for the WebHID transport that sends them.
//
// Kept deliberately faithful to macos/DC03ProStatusBar.swift so the two stay
// in sync. If you change a mapping here, change it there too.

export const VENDOR_ID = 0x262a;
export const PRODUCT_ID = 0x187e;
export const REPORT_SIZE = 16;

export const filterNames = [
  "Fast roll-off",
  "Slow roll-off",
  "Short delay fast",
  "Short delay slow",
  "NOS",
];

export const gainNames = ["Low", "Medium", "High"];
export const outputNames = ["Normal", "Power saving"];

export const presets = [
  { name: "Reference", filter: 0, gain: 0, output: 0, volume: 72, balance: 0 },
  { name: "Wide-ish", filter: 4, gain: 1, output: 0, volume: 70, balance: 0 },
  { name: "IEM Quiet", filter: 1, gain: 0, output: 1, volume: 58, balance: 0 },
  { name: "Punch", filter: 2, gain: 2, output: 0, volume: 76, balance: 0 },
];

// Index 0..100 -> stepped hardware attenuation value.
const volumeSteps = [
  255, 155, 150, 145, 140, 135, 130, 125, 120, 115,
  110, 109, 108, 107, 106, 105, 104, 103, 102, 101,
  100, 99, 98, 97, 96, 95, 94, 93, 92, 91,
  90, 88, 86, 84, 82, 80, 78, 76, 74, 72,
  70, 68, 66, 64, 62, 60, 58, 56, 54, 52,
  50, 49, 48, 47, 46, 45, 44, 43, 42, 41,
  40, 39, 38, 37, 36, 35, 34, 33, 32, 31,
  30, 29, 28, 27, 26, 25, 24, 23, 22, 21,
  20, 19, 18, 17, 16, 15, 14, 13, 12, 11,
  10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
  0,
];

const clampByte = (n) => Math.max(0, Math.min(255, n | 0));

function writeRegister({ seq, deviceAddress, offset1, offset2, offset3, offset4, value }) {
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = seq;
  report[1] = 0x11;
  report[2] = 0x88;
  report[3] = deviceAddress;
  report[6] = 0x05;
  report[7] = offset1;
  report[8] = offset2;
  report[9] = offset3;
  report[10] = offset4;
  report[11] = value;
  return report;
}

function writeTwoByteOffset({ seq, deviceAddress, offset1, offset2, value }) {
  const report = new Uint8Array(REPORT_SIZE);
  report[0] = seq;
  report[1] = 0x11;
  report[2] = 0xa0;
  report[3] = deviceAddress;
  report[4] = offset1;
  report[5] = offset2;
  report[6] = 0x01;
  report[7] = value;
  return report;
}

export function digitalFilterReports(value) {
  return [
    writeRegister({ seq: 0x11, deviceAddress: 0x60, offset1: 0x09, offset2: 0, offset3: 0, offset4: 0, value }),
    writeRegister({ seq: 0x12, deviceAddress: 0x62, offset1: 0x09, offset2: 0, offset3: 0, offset4: 0, value }),
  ];
}

export function gainReports(appValue) {
  const registerValue = appValue === 0 ? 0x00 : appValue === 1 ? 0x20 : 0x31;
  return [
    writeRegister({ seq: 0x15, deviceAddress: 0x60, offset1: 0x08, offset2: 0, offset3: 0, offset4: 0, value: registerValue }),
    writeRegister({ seq: 0x16, deviceAddress: 0x62, offset1: 0x08, offset2: 0, offset3: 0, offset4: 0, value: registerValue }),
  ];
}

export function outputReports(appValue) {
  const registerValue = appValue === 1 ? 0x1e : 0x1c;
  return [
    writeRegister({ seq: 0x17, deviceAddress: 0x60, offset1: 0x0b, offset2: 0, offset3: 0, offset4: 0, value: registerValue }),
    writeRegister({ seq: 0x18, deviceAddress: 0x62, offset1: 0x0b, offset2: 0, offset3: 0, offset4: 0, value: registerValue }),
  ];
}

function channelVolumeReports({ left, right, leftCommands, rightCommands }) {
  const [left1, left2, leftDsd1, leftDsd2] = leftCommands;
  const [right1, right2, rightDsd1, rightDsd2] = rightCommands;
  return [
    writeRegister({ seq: left1, deviceAddress: 0x60, offset1: 0x09, offset2: 0, offset3: 1, offset4: 0, value: left }),
    writeRegister({ seq: left2, deviceAddress: 0x60, offset1: 0x09, offset2: 0, offset3: 2, offset4: 0, value: left }),
    writeRegister({ seq: right1, deviceAddress: 0x62, offset1: 0x09, offset2: 0, offset3: 1, offset4: 0, value: right }),
    writeRegister({ seq: right2, deviceAddress: 0x62, offset1: 0x09, offset2: 0, offset3: 2, offset4: 0, value: right }),
    writeRegister({ seq: leftDsd1, deviceAddress: 0x60, offset1: 0x07, offset2: 0, offset3: 0, offset4: 0, value: left }),
    writeRegister({ seq: leftDsd2, deviceAddress: 0x60, offset1: 0x07, offset2: 0, offset3: 1, offset4: 0, value: left }),
    writeTwoByteOffset({ seq: 0x13, deviceAddress: 0xa2, offset1: 0, offset2: 0x10, value: left }),
    writeRegister({ seq: rightDsd1, deviceAddress: 0x62, offset1: 0x07, offset2: 0, offset3: 0, offset4: 0, value: right }),
    writeRegister({ seq: rightDsd2, deviceAddress: 0x62, offset1: 0x07, offset2: 0, offset3: 1, offset4: 0, value: right }),
    writeTwoByteOffset({ seq: 0x14, deviceAddress: 0xa2, offset1: 0, offset2: 0x11, value: right }),
  ];
}

export function volumeReports(volume, balance) {
  const safeVolume = Math.min(100, Math.max(0, volume | 0));
  const safeBalance = Math.min(255, Math.max(-255, balance | 0));
  const base = volumeSteps[safeVolume];

  let left;
  let right;
  if (base === 255) {
    left = base;
    right = base;
  } else if (safeBalance >= 0) {
    left = base;
    right = Math.max(0, base - safeBalance);
  } else {
    left = Math.max(0, base + safeBalance);
    right = base;
  }

  const leftByte = clampByte(left);
  const rightByte = clampByte(right);

  if (safeBalance === 0) {
    return channelVolumeReports({ left: leftByte, right: rightByte, leftCommands: [0x01, 0x02, 0x09, 0x0a], rightCommands: [0x03, 0x04, 0x0b, 0x0c] });
  } else if (safeBalance > 0) {
    return channelVolumeReports({ left: leftByte, right: rightByte, leftCommands: [0x01, 0x02, 0x09, 0x0a], rightCommands: [0x07, 0x08, 0x0f, 0x10] });
  }
  return channelVolumeReports({ left: leftByte, right: rightByte, leftCommands: [0x05, 0x06, 0x0d, 0x0e], rightCommands: [0x03, 0x04, 0x0b, 0x0c] });
}

export function presetReports(preset) {
  return [
    ...digitalFilterReports(preset.filter),
    ...gainReports(preset.gain),
    ...outputReports(preset.output),
    ...volumeReports(preset.volume, preset.balance),
  ];
}
