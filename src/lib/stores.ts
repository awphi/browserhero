import { writable, type Writable } from "svelte/store";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusAPISong } from "$lib/chorus";
import type { ScoreInfo } from "./util";

export const songSelectorSongs: Writable<ChorusAPISong[]> = writable([]);
export const songSelectorSearchTerm: Writable<string> = writable("");
export const activeSong: Writable<SongBundle | "loading" | undefined> =
  writable(undefined);
export const activeSongState: Writable<"loading" | "ready"> =
  writable("loading");
export const activeScore: Writable<ScoreInfo> = writable({
  score: 0,
  combo: 0,
});
