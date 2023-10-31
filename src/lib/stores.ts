import { get, writable, type Writable } from "svelte/store";
import { tweened } from "svelte/motion";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusSongSelectorState } from "$lib/chorus";
import type { Difficulty, Instrument } from "./chart-parser";
import {
  getDifficultiesForInstrumentInChart,
  getInstrumentsInChart,
} from "./util";
import type { UserSettings } from "./types";
import { storable } from "./storable";
import { toast } from "@zerodevx/svelte-toast";

// state for the song selector component
export const songSelectorState: Writable<ChorusSongSelectorState> = writable({
  searchTerm: "",
  songs: [],
  isExtendable: true,
  extendFrom: 0,
});

export const userSettingsState: Writable<UserSettings> = storable(
  "bh_settings",
  {
    difficulty: "Expert",
    instrument: "Single",
    speed: 1,
  }
);

// state for the currently selected song
export const activeSong: Writable<SongBundle | undefined> = writable(undefined);
export const activeSongState: Writable<"loading" | "idle"> = writable("idle");
export const activeSongDifficulty: Writable<Difficulty> = writable("Expert");
export const activeSongInstrument: Writable<Instrument> = writable("Single");

// state for the current score
export const activeScore: Writable<number> = tweened(0);
export const activeCombo: Writable<number> = writable(0);

export async function loadSong(fn: () => Promise<SongBundle>): Promise<void> {
  activeSongState.set("loading");
  activeScore.set(0);
  activeCombo.set(0);
  toast.push("Fetching song...");
  try {
    const song = await fn();
    const settings = get(userSettingsState);

    const availableInst = getInstrumentsInChart(song.chart);
    const selectedInstrument = availableInst.includes(settings.instrument)
      ? settings.instrument
      : availableInst[0];

    const availableDiff = getDifficultiesForInstrumentInChart(
      song.chart,
      selectedInstrument
    );
    const selectedDifficulty = availableDiff.includes(settings.difficulty)
      ? settings.difficulty
      : availableDiff[0];

    console.log(selectedDifficulty, selectedInstrument);

    activeSongInstrument.set(selectedInstrument);
    activeSongDifficulty.set(selectedDifficulty);
    activeSong.set(song);
    toast.pop(0);
    toast.push("Finished loading song!");
  } catch (e) {
    toast.push(`Failed to load song - ${e}.`);
    console.error(e);
    activeSong.set(undefined);
  } finally {
    activeSongState.set("idle");
  }
}
