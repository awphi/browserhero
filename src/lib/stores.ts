import { writable, type Writable } from "svelte/store";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusAPISong } from "$lib/chorus";
import type { KeyMap } from "./util";

export const songSelectorSongs: Writable<ChorusAPISong[]> = writable([]);
export const songSelectorSearchTerm: Writable<string> = writable("");
export const activeSong: Writable<SongBundle | "loading" | undefined> =
  writable(undefined);
export const activeSongState: Writable<"loading" | "ready"> =
  writable("loading");

// TODO make configurable
export const keyMap: Writable<KeyMap> = writable({
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  ArrowUp: "strum",
  ArrowDown: "strum",
});
