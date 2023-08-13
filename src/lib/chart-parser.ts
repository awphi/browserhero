import isInteger from "lodash/isInteger";
import isFinite from "lodash/isFinite";
import { getTimedBpms, getTimedTrack } from "./chart-utils";

// TODO refactor this file into several smaller/modular functions with try/catch for better readability

export interface TickEvent {
  tick: number;
}

export interface SimpleEvent extends TickEvent {
  type: "event";
  value: string;
}

export interface Bpm extends TickEvent {
  type: "bpm";
  bpm: number;
}

export interface TimeSignature extends TickEvent {
  type: "ts";
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

export interface NoteEvent extends TickEvent {
  type: "note";
  note: number;
  isHOPO: boolean;
  isChord: boolean;
  forced: boolean;
  tap: boolean;
  duration: number;
}

export interface StarPowerEvent extends TickEvent {
  type: "starpower";
  duration: number;
}

export type PlayEvent = NoteEvent | SimpleEvent | StarPowerEvent;

export type ChartTrack = `${Difficulty}${Instrument}`;

export type ParsedChart = {
  Song: SongSection;
  SyncTrack: TimedTracks<SyncTrack>;
  Events?: Timed<SimpleEvent>[];
} & {
  [instrument in ChartTrack]?: Timed<PlayEvent>[];
};

// Internal types used to build the ParsedChart
interface SyncTrack {
  bpms: Bpm[];
  timeSignatures: TimeSignature[];
  allEvents: SyncTrackEvent[];
}
type SyncTrackEvent = Bpm | TimeSignature;

type SectionParser = (
  title: string,
  lines: string[],
  resolution: number,
  bpms: ParsedChart["SyncTrack"]["bpms"]
) => NonNullable<ParsedChart[keyof Omit<ParsedChart, "Song" | "SyncTrack">]>;

export const difficulties = ["Easy", "Medium", "Hard", "Expert"] as const;
export type Difficulty = (typeof difficulties)[number];

// TODO add support for more instrument types
export const instruments = ["Single", "DoubleBass"] as const;
export type Instrument = (typeof instruments)[number];

const instrumentTrackParsers: {
  [key in Instrument]?: SectionParser;
} = {
  Single: parseSingleSection,
  DoubleBass: parseSingleSection,
};

const requiredSections = ["Song", "SyncTrack"];
const sectionTitleRegex = /^\[(.+)\]$/;
const commonLineRegex = /^(.+)\s+=\s+(.+)$/;
const quotedStringRegex = /^\"|\"$/g;
const syncTrackEventRegex = /^(TS|B)\s+(.+)/;
const simpleEventRegex = /^E\s+(.+)/;
const starPowerEventRegex = /^S\s+2\s+(\d+)/;
const noteEventRegex = /^N\s+(\d+)\s+(\d+)/;
const numericalSongSections = [
  "previewstart",
  "previewend",
  "difficulty",
  "offset",
  "resolution",
];

function parseStringLine(
  line: string,
  sectionTitle: string
): [string, string] | null {
  const res = line.match(commonLineRegex);
  if (res === null || res.length !== 3) {
    console.warn(`Invalid [${sectionTitle}] entry '${line}'.`);
    return null;
  }

  return [res[1], res[2]];
}

function parseTickLine(
  line: string,
  sectionTitle: string
): [number, string] | null {
  const stringLine = parseStringLine(line, sectionTitle);
  if (!stringLine) {
    return null;
  }
  const tick = Number.parseInt(stringLine[0]);
  if (!isInteger(tick)) {
    console.warn(`Invalid [${sectionTitle}] entry '${line}'.`);
    return null;
  }
  return [tick, stringLine[1]];
}

function parseAndSortTickLines(
  lines: string[],
  sectionTitle: string
): [number, string][] {
  let tickEvents = lines
    .map((l) => parseTickLine(l, sectionTitle))
    .filter((a) => a !== null) as [number, string][];
  tickEvents = tickEvents.sort((a, b) => a[0] - b[0]);
  return tickEvents;
}

function parseSongSection(lines: string[]): SongSection {
  const result = Object.create(null);
  const parsedStringLines = lines
    .map((l) => parseStringLine(l, "Song"))
    .filter((a) => a !== null) as [string, string][];
  for (const parsedLine of parsedStringLines) {
    const [key, value] = parsedLine;
    let valueFinal: string | number = value.replace(quotedStringRegex, "");
    const keyFinal = key.toLowerCase();

    if (numericalSongSections.includes(keyFinal)) {
      valueFinal = Number.parseFloat(valueFinal);
      if (!isFinite(valueFinal)) {
        console.warn(`Invalid numerical [Song] entry: '${key} = ${value}'.`);
        continue;
      }
    }

    result[keyFinal] = valueFinal;
  }

  if (!("resolution" in result)) {
    throw new Error("Invalid [Song] section - missing 'resolution'.");
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
      console.warn(`Invalid BPM '${frag}'.`);
      return null;
    }

    return {
      bpm: bpmRaw / 1000,
      tick,
      type: "bpm",
    };
  } else if (result[1] === "TS") {
    const ts = result[2].trim().split(/\s+/);
    if (ts.length > 2) {
      console.warn(`Invalid TS '${frag}'.`);
      return null;
    }
    const numer = Number.parseInt(ts[0]);
    const denom = ts[1] ? Number.parseInt(ts[1]) : 2;
    if (!isFinite(numer) || !isFinite(denom)) {
      console.warn(`Invalid TS '${frag}'.`);
      return null;
    }
    return {
      numerator: numer,
      denominator: Math.pow(2, denom),
      tick,
      type: "ts",
    };
  } else {
    console.warn(`Unknown sync track event '${frag}'.`);
    return null;
  }
}

function parseSyncTrack(lines: string[]): SyncTrack {
  const tickEvents = parseAndSortTickLines(lines, "SyncTrack");
  const timeSignatures: TimeSignature[] = [];
  const bpms: Bpm[] = [];
  const allEvents: SyncTrackEvent[] = [];

  for (const [i, tickEvent] of tickEvents.entries()) {
    const event = parseSyncTrackEvent(tickEvent);
    if (event === null) {
      console.warn(`Invalid [SyncTrack] entry '${lines[i]}'.`);
      continue;
    }

    allEvents.push(event);
    if (event.type === "bpm") {
      bpms.push(event);
    } else {
      timeSignatures.push(event);
    }
  }

  if (!bpms.some((e) => e.tick === 0)) {
    const baseBpm: Bpm = {
      type: "bpm",
      tick: 0,
      bpm: 120,
    };
    allEvents.unshift(baseBpm);
    bpms.unshift(baseBpm);
  }

  if (!timeSignatures.some((e) => e.tick === 0)) {
    const baseTs: TimeSignature = {
      type: "ts",
      tick: 0,
      numerator: 4,
      denominator: 4,
    };
    allEvents.unshift(baseTs);
    timeSignatures.unshift(baseTs);
  }

  return {
    timeSignatures,
    bpms,
    allEvents,
  };
}

function parseSingleSection(
  sectionTitle: string,
  lines: string[],
  resolution: number,
  bpms: Timed<Bpm>[]
): Timed<PlayEvent>[] {
  const tickEvents = parseAndSortTickLines(lines, sectionTitle);
  const validEventParsers = [
    parseNoteEvent,
    parseStarpowerEvent,
    parseSimpleEvent,
  ];
  const result: PlayEvent[] = [];

  function commitNoteBuffer(): void {
    const isChord =
      noteBuffer.filter((a) => a.note !== 5 && a.note !== 6).length > 1;
    // set all the notes modifiers and push to the result array
    noteBuffer.forEach((note) => {
      note.forced = modifierBuffer.forced && !modifierBuffer.tap;
      note.tap = modifierBuffer.tap;
      note.isChord = isChord;
    });
    result.push(...noteBuffer);
    // reset the state
    noteBuffer = [];
    modifierBuffer.forced = false;
    modifierBuffer.tap = false;
  }

  let tick = tickEvents[0][0];
  let noteBuffer: NoteEvent[] = [];
  let modifierBuffer = {
    forced: false,
    tap: false,
  };

  for (const [i, tickEvent] of tickEvents.entries()) {
    if (tickEvent[0] !== tick) {
      commitNoteBuffer();
    }
    tick = tickEvent[0];

    let valid = false;
    for (const parserFn of validEventParsers) {
      const event = parserFn(tickEvent);
      if (event) {
        if (event.type === "note") {
          // note events are commited to the note buffer and commited to the result array once
          // we move on to the next tick
          if (event.note === 5) {
            modifierBuffer.forced = true;
          } else if (event.note === 6) {
            modifierBuffer.tap = true;
          } else {
            noteBuffer.push(event);
          }
        } else {
          result.push(event);
        }
        valid = true;
        break;
      }
    }

    if (!valid) {
      console.warn(`Invalid [${sectionTitle}] entry '${lines[i]}'.`);
    }
  }
  commitNoteBuffer();

  // now set the isHOPO flag on each note based on proximity to other notes and note flags (chord/tap)
  const hopoThreshold = (65 / 192) * resolution;
  const notes = result.filter((a) => a.type === "note") as NoteEvent[];
  const lastSeen: (number | null)[] = new Array(8).fill(null);

  for (const note of notes) {
    // taps can't be HOPOs
    if (!note.tap) {
      // chords can only be HOPOs if forced
      if (note.isChord) {
        note.isHOPO = note.forced;
      } else {
        // otherwise for single notes we use the proximity rule
        const shouldBeHOPO = lastSeen.some((tick, n) => {
          return n !== note.note && tick && note.tick - hopoThreshold <= tick;
        });
        note.isHOPO = note.forced ? !shouldBeHOPO : shouldBeHOPO;
      }
    }

    lastSeen[note.note] = note.tick;
  }

  return getTimedTrack(result, resolution, bpms);
}

function parseStarpowerEvent(
  tickEvent: [number, string]
): StarPowerEvent | null {
  const match = tickEvent[1].match(starPowerEventRegex);
  if (match && match.length === 2) {
    const duration = Number.parseInt(match[1]);
    if (isFinite(duration) && duration > 0) {
      return {
        type: "starpower",
        duration,
        tick: tickEvent[0],
      };
    }
  }

  return null;
}

function parseNoteEvent(tickEvent: [number, string]): NoteEvent | null {
  const match = tickEvent[1].match(noteEventRegex);
  if (match && match.length === 3) {
    const numbers = match.slice(1).map((v) => Number.parseInt(v));
    if (numbers.every((m) => isFinite(m) && m >= 0)) {
      // the flags will be set properly later
      return {
        note: numbers[0],
        duration: numbers[1],
        isHOPO: false,
        forced: false,
        isChord: false,
        tap: false,
        type: "note",
        tick: tickEvent[0],
      };
    }
  }

  return null;
}

function parseSimpleEvent(tickEvent: [number, string]): SimpleEvent | null {
  const frags = tickEvent[1].match(simpleEventRegex);
  if (frags === null || frags.length !== 2) {
    return null;
  }

  const value = frags[1].replace(quotedStringRegex, "");
  return {
    value,
    tick: tickEvent[0],
    type: "event",
  };
}

function parseEventsSection(
  sectionTitle: string,
  lines: string[],
  resolution: number,
  bpms: Timed<Bpm>[]
): NonNullable<ParsedChart["Events"]> {
  const tickEvents = parseAndSortTickLines(lines, sectionTitle);
  const result: SimpleEvent[] = [];
  for (const [i, tickEvent] of tickEvents.entries()) {
    const simpleEvent = parseSimpleEvent(tickEvent);
    if (simpleEvent) {
      result.push(simpleEvent);
    } else {
      console.warn(`Invalid [${sectionTitle}] entry '${lines[i]}'.`);
    }
  }
  return getTimedTrack(result, resolution, bpms);
}

function getSectionParser(title: string): null | SectionParser {
  if (title === "Events") {
    return parseEventsSection;
  }

  for (const instrument of instruments) {
    const parseFn = instrumentTrackParsers[instrument];
    if (parseFn) {
      for (const diff of difficulties) {
        if (title === `${diff}${instrument}`) {
          return parseFn;
        }
      }
    }
  }

  return null;
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

  const Song = parseSongSection(sections["Song"]);
  delete sections["Song"];
  const { resolution } = Song;
  const { timeSignatures, allEvents, bpms } = parseSyncTrack(
    sections["SyncTrack"]
  );
  delete sections["SyncTrack"];
  const timedBpms = getTimedBpms(bpms, Song.resolution);
  const SyncTrack = {
    bpms: timedBpms,
    timeSignatures: getTimedTrack(timeSignatures, resolution, timedBpms),
    allEvents: getTimedTrack(allEvents, resolution, timedBpms),
  };

  const result: Record<string, any> = {
    Song,
    SyncTrack,
  };

  for (const [title, lines] of Object.entries(sections)) {
    const sectionParserFn = getSectionParser(title);
    if (sectionParserFn === null) {
      console.warn(`Unsupported chart section '[${title}]'.`);
    } else {
      result[title] = sectionParserFn(title, lines, resolution, timedBpms);
    }
  }

  return result as ParsedChart;
}
