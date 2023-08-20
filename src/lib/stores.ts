import { writable, type Writable } from "svelte/store";
import { tweened } from "svelte/motion";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusSongSelectorState } from "$lib/chorus";
import type { Difficulty, Instrument } from "./chart-parser";
import {
  getDifficultiesForInstrumentInChart,
  getInstrumentsInChart,
} from "./util";

// state for the song selector component
export const songSelectorState: Writable<ChorusSongSelectorState> = writable({
  searchTerm: "",
  songs: [],
  isExtendable: true,
  extendFrom: 0,
});

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
  try {
    const song = await fn();
    // TODO select instrument/difficulty based off user preferences
    const availableInstruments = getInstrumentsInChart(song.chart);
    const selectedInstrument = availableInstruments[0];
    const availableDifficulties = getDifficultiesForInstrumentInChart(
      song.chart,
      selectedInstrument
    );
    const selectedDifficulty = availableDifficulties[1];

    console.log(selectedDifficulty, selectedInstrument);

    activeSongInstrument.set(selectedInstrument);
    activeSongDifficulty.set(selectedDifficulty);
    activeSong.set(song);
  } catch (e) {
    // TODO error popup
    console.error(e);
    activeSong.set(undefined);
  } finally {
    activeSongState.set("idle");
  }
}
