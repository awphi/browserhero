import { writable, type Writable } from "svelte/store";
import { tweened } from "svelte/motion";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusAPISong } from "$lib/chorus";

export const songSelectorSongs: Writable<ChorusAPISong[]> = writable([]);
export const songSelectorSearchTerm: Writable<string> = writable("");
export const activeSong: Writable<SongBundle | "loading" | undefined> =
  writable(undefined);
export const activeSongState: Writable<"loading" | "ready"> =
  writable("loading");
export const activeScore: Writable<number> = tweened(0);
export const activeCombo: Writable<number> = writable(0);
