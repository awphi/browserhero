import isInteger from "lodash/isInteger";
import isFinite from "lodash/isFinite";
import { getTimedBpms, getTimedTrack } from "./chart-utils";

export interface TickEvent {
  tick: number;
}

export interface Bpm extends TickEvent {
  bpm: number;
}

export interface TimeSignature extends TickEvent {
  numerator: number;
  denominator: number;
}

export type Timed<T> = T & { assignedTime: number };
export type TimedTrack<T> = T extends Array<any>
  ? Timed<T[number]>[]
  : Timed<T>;
export type TimedTracks<T> = {
  [P in keyof T]: TimedTrack<T[P]>;
};

export interface SongSection {
  resolution: number;
  name?: string;
  artist?: string;
  album?: string;
  charter?: string;
  player2?: string;
  genre?: string;
  mediaType?: string;
  year?: string;
  offset?: number;
  difficulty?: number;
  previewstart?: number;
  previewend?: number;
}

type SyncTrackEvent = Bpm | TimeSignature;

export interface SyncTrack {
  bpms: Bpm[];
  timeSignatures: TimeSignature[];
  allEvents: SyncTrackEvent[];
}

export interface ParsedChart {
  song: SongSection;
  syncTrack: TimedTracks<SyncTrack>;
}

const requiredSections = ["Song", "SyncTrack"];
const sectionTitleRegex = /^\[(.*)\]$/;
const commonLineRegex = /^(.+)\s+=\s+(.+)$/;
const quotedStringRegex = /^\"|\"$/g;
const syncTrackEventRegex = /^(TS|B)\s+(.*)/;
const numericalSongSections = [
  "previewstart",
  "previewend",
  "difficulty",
  "offset",
  "resolution",
];

function parseCommonLine(line: string): [string, string] | null {
  const res = line.match(commonLineRegex);
  if (res === null || res.length !== 3) {
    console.error(`Failed to parse common line: '${line}'.`);
    return null;
  }

  return [res[1], res[2]];
}

function parseTickEventLine(line: string): [number, string] | null {
  const commonLine = parseCommonLine(line);
  if (!commonLine) {
    return null;
  }
  const tick = Number.parseInt(commonLine[0]);
  if (!isInteger(tick)) {
    console.error(`Invalid tick event line '${line}'.`);
    return null;
  }
  return [tick, commonLine[1]];
}

function parseCommonLines(lines: string[]): [string, string][] {
  return lines.map(parseCommonLine).filter((a) => a !== null) as [
    string,
    string
  ][];
}

function parseSongSection(lines: string[]): SongSection {
  const result = Object.create(null);
  const parsedLines = parseCommonLines(lines);
  for (const [key, value] of parsedLines) {
    let valueFinal: string | number = value;
    const keyFinal = key.toLowerCase();
    if (quotedStringRegex.test(valueFinal)) {
      valueFinal = valueFinal.replace(quotedStringRegex, "");
    }

    if (numericalSongSections.includes(keyFinal)) {
      valueFinal = Number.parseFloat(valueFinal);
      if (!isFinite(valueFinal)) {
        console.error(
          `Failed to parse numerical song section property '${key} = ${value}'.`
        );
        continue;
      }
    }

    result[keyFinal] = valueFinal;
  }

  if (!("resolution" in result)) {
    throw new Error("Missing resolution in song section.");
  }
  return result as SongSection;
}

function parseSyncTrackEvent([tick, frag]: [
  number,
  string
]): SyncTrackEvent | null {
  const result = frag.match(syncTrackEventRegex);
  if (result === null || result.length !== 3) {
    throw new Error(`Failed to parse sync track event '${frag}'.`);
  }

  if (result[1] === "B") {
    const bpmRaw = Number.parseInt(result[2]);
    if (!isFinite(bpmRaw)) {
      console.error(`Invalid BPM '${frag}'.`);
      return null;
    }

    return {
      bpm: bpmRaw / 1000,
      tick,
    };
  } else if (result[1] === "TS") {
    const ts = result[2].trim().split(/\s+/);
    if (ts.length > 2) {
      console.error(`Invalid TS '${frag}'.`);
      return null;
    }
    const numer = Number.parseInt(ts[1]);
    const denom = ts[2] ? Number.parseInt(ts[2]) : 2;
    if (!isFinite(denom) || !isFinite(denom)) {
      console.error(`Invalid TS '${frag}'.`);
      return null;
    }
    return {
      numerator: numer,
      denominator: Math.pow(denom, 2),
      tick,
    };
  } else {
    console.error(`Unknown sync track event '${frag}'.`);
    return null;
  }
}

function parseSyncTrack(lines: string[]): SyncTrack {
  const events = lines
    .map((line) => {
      const ev = parseTickEventLine(line);
      return ev ? parseSyncTrackEvent(ev) : null;
    })
    .filter((a) => a !== null) as SyncTrackEvent[];

  events.sort((a, b) => a.tick - b.tick);

  const timeSignatures: TimeSignature[] = [];
  const bpms: Bpm[] = [];

  for (const event of events) {
    if ("bpm" in event) {
      bpms.push(event);
    } else {
      timeSignatures.push(event);
    }
  }

  return {
    timeSignatures,
    bpms,
    allEvents: events,
  };
}

export function parseChart(rawChart: string): ParsedChart {
  const lines = rawChart
    .split("\n")
    .map((a) => a.trim())
    .filter((a) => a && a.length > 0);

  const sectionIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (sectionTitleRegex.test(lines[i])) {
      sectionIndices.push(i);
    }
  }

  const sections: Record<string, string[]> = Object.create(null);

  for (let i = 0; i < sectionIndices.length; i++) {
    const startIndex = sectionIndices[i];
    const endIndex = sectionIndices[i + 1] ?? lines.length;
    const sectionTitleMatch = lines[startIndex].match(sectionTitleRegex);

    if (
      endIndex - startIndex > 3 &&
      sectionTitleMatch &&
      sectionTitleMatch.length >= 2
    ) {
      const title = sectionTitleMatch[1];
      sections[title] = lines.slice(startIndex + 2, endIndex - 1);
    }
  }

  for (const sec of requiredSections) {
    if (!(sec in sections)) {
      throw new Error(`Missing [${sec}] section in chart.`);
    }
  }

  const song = parseSongSection(sections["Song"]);
  const { resolution } = song;
  const { timeSignatures, allEvents, bpms } = parseSyncTrack(
    sections["SyncTrack"]
  );
  const timedBpms = getTimedBpms(bpms, song.resolution);

  return {
    song,
    syncTrack: {
      bpms: timedBpms,
      timeSignatures: getTimedTrack(timeSignatures, resolution, timedBpms),
      allEvents: getTimedTrack(allEvents, resolution, timedBpms),
    },
  };
}
