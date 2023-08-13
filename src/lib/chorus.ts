import isPlainObject from "lodash/isPlainObject";

export const instruments = [
  "drums",
  "guitar",
  "bass",
  "keys",
  "vocals",
  "rhythm",
  "guitarghl",
] as const;
export const difficulties = ["e", "m", "h", "x"] as const;

const requiredStringKeys = ["name", "album", "artist", "year"] as const;

export type Instrument = (typeof instruments)[number];

export type Difficulty = (typeof difficulties)[number];

export interface ChorusAPISong {
  id: number;
  name: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  charter: string;
  length: number;
  effectiveLength: number;
  lastModified: string;
  uploadedAt: string;
  link: string;
  directLinks: Record<string, string>;
  isPack: boolean;
  hasForced: boolean;
  hasTap: boolean;
  hasSections: boolean;
  hasStarPower: boolean;
  hasSoloSections: boolean;
  is120: boolean;
  hasStems: boolean;
  hasVideo: boolean;
  hasLyrics: boolean;
  hasNoAudio: boolean;
  needsRenaming: boolean;
  isFolder: boolean;
  hasBrokenNotes: boolean;
  hasBackground: boolean;
  noteCounts: {
    [key in Instrument]?: {
      [key in Difficulty]?: number;
    };
  };
  isProcessing: boolean;
  archiveUrl?: string;
}

export function ensureSong(song: unknown): ChorusAPISong | null {
  if (!isPlainObject(song)) {
    return null;
  }

  // just cast it as any since we're gonna do a bunch of mutation on it
  const songObjectMut = song as any;

  // Assert that noteCounts exists and prune out invalid entries
  if (
    "noteCounts" in songObjectMut &&
    isPlainObject(songObjectMut.noteCounts)
  ) {
    Object.keys(songObjectMut.noteCounts).forEach((key) => {
      if (!instruments.includes(key as Instrument)) {
        delete songObjectMut.noteCounts[key];
      }
    });
  } else {
    return null;
  }

  // assert there's still some note counts
  if (Object.keys(songObjectMut.noteCounts!).length === 0) {
    return null;
  }

  // assert there's a valid numerical ID
  if (!("id" in songObjectMut) || typeof songObjectMut.id !== "number") {
    return null;
  }

  // assert all the required string keys exist
  for (const str of requiredStringKeys) {
    if (!(str in songObjectMut) || typeof songObjectMut[str] !== "string") {
      return null;
    }
  }

  // we add the isProcessing key but omit the archiveUrl as undefined implies we don't have them yet
  songObjectMut.isProcessing = false;

  return songObjectMut as ChorusAPISong;
}

export function ensureSongs(songs: unknown[]): ChorusAPISong[] {
  return songs.map(ensureSong).filter((a) => a !== null) as ChorusAPISong[];
}

export function formatInstrumentName(instrument: Instrument): string {
  let base = instrument.slice(0, 1).toUpperCase() + instrument.slice(1);
  if (instrument.endsWith("ghl")) {
    base = base.slice(0, -3) + " (GHL)";
  }

  return base;
}
