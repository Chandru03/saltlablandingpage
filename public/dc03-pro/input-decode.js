// HID input-report decoding for the DC03 Pro.
//
// The DAC's physical buttons emit HID *input* reports. Their byte layout isn't
// documented, so instead of hard-coding offsets we read the device's own report
// descriptor (exposed by WebHID as device.collections) and locate fields by
// their HID usage. That makes decoding robust to whatever layout the device uses.
//
// Consumer-page usages we care about (page 0x0C):
export const USAGE = {
  VOL_UP: 0x0c00e9,   // Volume Increment
  VOL_DOWN: 0x0c00ea, // Volume Decrement
  MUTE: 0x0c00e2,     // Mute
  PLAY_PAUSE: 0x0c00cd,
  NEXT: 0x0c00b5,
  PREV: 0x0c00b6,
};

export const USAGE_LABEL = {
  [USAGE.VOL_UP]: "VOL +",
  [USAGE.VOL_DOWN]: "VOL −",
  [USAGE.MUTE]: "MUTE",
  [USAGE.PLAY_PAUSE]: "PLAY / PAUSE",
  [USAGE.NEXT]: "NEXT",
  [USAGE.PREV]: "PREV",
};

// Read `bitCount` bits starting at `bitOffset`, LSB-first (HID bit order).
function readBits(view, bitOffset, bitCount) {
  let value = 0;
  for (let i = 0; i < bitCount; i++) {
    const abs = bitOffset + i;
    const byteIndex = abs >> 3;
    if (byteIndex >= view.byteLength) break;
    const bit = (view.getUint8(byteIndex) >> (abs & 7)) & 1;
    value |= bit << i;
  }
  return value >>> 0;
}

// Flatten a device's input reports into a bit-addressable field map.
export function buildInputMap(collections) {
  const reports = [];
  const walk = (col) => {
    for (const report of col.inputReports || []) {
      let bit = 0;
      const items = [];
      for (const it of report.items || []) {
        const reportSize = it.reportSize || 0;
        const reportCount = it.reportCount || 0;
        items.push({
          bitOffset: bit,
          reportSize,
          reportCount,
          isArray: !!it.isArray,
          isRange: !!it.isRange,
          isConstant: !!it.isConstant,
          usages: it.usages || [],
          usageMinimum: it.usageMinimum ?? 0,
          logicalMinimum: it.logicalMinimum ?? 0,
        });
        bit += reportSize * reportCount;
      }
      reports.push({ reportId: report.reportId ?? 0, items, totalBits: bit });
    }
    for (const child of col.children || []) walk(child);
  };
  for (const col of collections || []) walk(col);
  return reports;
}

// Given a report and its data, return the Set of usages currently "active"
// (button pressed / bit set). Works for both bitfield-boolean and array items.
export function decodeActiveUsages(reportId, view, inputMap) {
  const active = new Set();
  const rep = inputMap.find((r) => r.reportId === (reportId ?? 0));
  if (!rep) return active;

  for (const it of rep.items) {
    if (it.isConstant || it.reportSize === 0) continue;

    if (it.isArray) {
      // Each slot holds a usage code (or an index into a usage range).
      for (let k = 0; k < it.reportCount; k++) {
        const v = readBits(view, it.bitOffset + k * it.reportSize, it.reportSize);
        if (v === 0) continue;
        const usage = it.isRange
          ? it.usageMinimum + (v - it.logicalMinimum)
          : it.usages[v - 1];
        if (usage != null) active.add(usage >>> 0);
      }
    } else {
      // Bitfield: one bit per usage.
      for (let k = 0; k < it.reportCount; k++) {
        if (!readBits(view, it.bitOffset + k, 1)) continue;
        const usage = it.isRange ? it.usageMinimum + k : it.usages[k];
        if (usage != null) active.add(usage >>> 0);
      }
    }
  }
  return active;
}

// Convenience: hex string for a DataView (for the live monitor).
export function toHexBytes(view) {
  const out = [];
  for (let i = 0; i < view.byteLength; i++) {
    out.push(view.getUint8(i).toString(16).padStart(2, "0"));
  }
  return out;
}
