import { writable, type Writable } from "svelte/store";
import { tweened } from "svelte/motion";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusSongSelectorState } from "$lib/chorus";

export const songSelectorState: Writable<ChorusSongSelectorState> = writable({
  searchTerm: "",
  songs: [],
  isExtendable: true,
  extendFrom: 0,
});
export const activeSong: Writable<SongBundle | "loading" | undefined> =
  writable(undefined);
export const activeScore: Writable<number> = tweened(0);
export const activeCombo: Writable<number> = writable(0);
