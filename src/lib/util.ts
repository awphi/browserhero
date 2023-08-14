import invert from "lodash/invert";
import {
  difficulties,
  instruments,
  type Difficulty,
  type Instrument,
  type ParsedChart,
} from "./chart-parser";

const mimeTypeToExtensions: Record<string, string> = {
  "application/rar": "rar",
  "application/x-rar-compressed": "rar",
  "application/vnd.rar": "rar",
  "application/x-zip-compressed": "zip",
  "application/x-7z-compressed": "7z",
  "application/zip": "zip",
};
const extensionsToMimeTypes = invert(mimeTypeToExtensions);

export const archiveExtensions = new Set(Object.values(mimeTypeToExtensions));

export function getExtFromMime(mime: string): string | undefined {
  return mimeTypeToExtensions[mime];
}

export function getMimeFromExt(ext: string): string | undefined {
  return extensionsToMimeTypes[ext];
}

export function getFileExt(str: string): string {
  return str.split(".").pop()!;
}

export function formatTimespan(secs: number) {
  let dat = new Date(1000 * secs).toISOString().substring(11, 19);

  // strip off leading zeroes (or colons) up to the first three zeroes
  let i: number;
  for (i = 0; i < 4; i++) {
    if (!(dat[i] === "0" || dat[i] === ":")) {
      break;
    }
  }

  return dat.slice(i);
}

export function roundNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}

export function getInstrumentsInChart(chart: ParsedChart): Instrument[] {
  const keys = Object.keys(chart);
  const result: Set<Instrument> = new Set();
  for (const instrument of instruments) {
    for (const diff of difficulties) {
      if (keys.includes(`${diff}${instrument}`)) {
        result.add(instrument);
      }
    }
  }

  return [...result];
}

export function getDifficultiesForInstrumentInChart(
  chart: ParsedChart,
  instrument: Instrument
): Difficulty[] {
  const keys = Object.keys(chart);
  const result: Set<Difficulty> = new Set();
  for (const diff of difficulties) {
    if (keys.includes(`${diff}${instrument}`)) {
      result.add(diff);
    }
  }

  return [...result];
}
