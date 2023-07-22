import { writable, type Writable } from "svelte/store";
import type { SongBundle } from "$lib/song-loader";
import type { ChorusAPISong } from "$lib/chorus";

export const songSelectorSongs: Writable<ChorusAPISong[]> = writable([]);
export const songSelectorSearchTerm: Writable<string> = writable("");
export const activeSong: Writable<SongBundle | undefined> = writable(undefined);
