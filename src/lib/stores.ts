import { writable, type Writable } from "svelte/store";
import { tweened } from "svelte/motion";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusSongSelectorState } from "$lib/chorus";

// state for the song selector component
export const songSelectorState: Writable<ChorusSongSelectorState> = writable({
  searchTerm: "",
  songs: [],
  isExtendable: true,
  extendFrom: 0,
});

// state for the currently selected song, its loading state and its current difficulty
export const activeSong: Writable<SongBundle | undefined> = writable(undefined);
export const activeSongState: Writable<"loading" | "idle"> = writable("idle");

// state for the current score/combo
export const activeScore: Writable<number> = tweened(0);
export const activeCombo: Writable<number> = writable(0);

export async function loadSong(fn: () => Promise<SongBundle>): Promise<void> {
  activeSongState.set("loading");
  activeScore.set(0);
  activeCombo.set(0);
  try {
    const song = await fn();
    activeSong.set(song);
  } catch (e) {
    // TODO error popup
    console.error(e);
    activeSong.set(undefined);
  } finally {
    activeSongState.set("idle");
  }
}
