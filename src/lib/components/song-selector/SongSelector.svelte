<script lang="ts">
  import DUMMY_DATA from "../../assets/dummy-data";
  import SongCard from "./SongCard.svelte";
  import { activeSongState, loadSong, songSelectorState } from "../../stores";
  import { onMount } from "svelte";
  import type { ChorusAPISong } from "../../chorus";
  import { loadSongArchiveFromFile } from "$lib/song-loader";

  let status: "extending" | "idle" | "searching" = "idle";
  let displayedSongs: ChorusAPISong[] = $songSelectorState.songs;
  let lastSearchTerm = $songSelectorState.searchTerm;
  let uploadedArchive: FileList;

  onMount(() => {
    if ($songSelectorState.songs.length <= 0) {
      search(false);
    }
  });

  async function search(extend: boolean = false): Promise<void> {
    status = extend ? "extending" : "searching";

    // if we're extending the current search use the last search term rather than the current input text
    const term = extend ? lastSearchTerm : $songSelectorState.searchTerm;

    // if we're not extending then load some dummy data to blur out in the results window
    if (!extend) {
      $songSelectorState.extendFrom = 0;
      displayedSongs = DUMMY_DATA;
      lastSearchTerm = $songSelectorState.searchTerm;
    }

    const params = new URLSearchParams({
      query: term,
      from: extend ? $songSelectorState.searchTerm.toString() : "0",
    });
    const result = await fetch(`/api/search-songs?${params}`);
    const json = await result.json();
    $songSelectorState.isExtendable = json.originalLength >= 20;
    if ($songSelectorState.isExtendable) {
      $songSelectorState.extendFrom += 20;
    }
    displayedSongs = extend ? [...displayedSongs, ...json.songs] : json.songs;
    $songSelectorState.songs = displayedSongs;

    status = "idle";
  }

  $: if (uploadedArchive && uploadedArchive.length > 0) {
    loadSong(() => loadSongArchiveFromFile(uploadedArchive[0]));
  }
</script>

<div class="flex flex-col h-full">
  <div class="join w-full mb-3">
    <input
      type="text"
      placeholder="Search chorus.fightthe.pw..."
      class="input flex-1 join-item input-bordered"
      bind:value={$songSelectorState.searchTerm}
      on:keypress={(ev) => {
        if (ev.key === "Enter") {
          search();
        }
      }}
    />

    <button
      class="btn border-base-content border join-item border-opacity-20 aspect-square"
      on:click={() => search()}
    >
      {#if status !== "idle"}
        <span class="loading loading-infinity h-full" />
      {:else}
        <i class="ph-fill ph-magnifying-glass text-lg" />
      {/if}
    </button>
  </div>
  <div
    class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden rounded-lg gap-2 pr-1"
    class:disabled={status === "searching"}
  >
    {#each displayedSongs as song}
      <SongCard
        disabled={$activeSongState === "loading"}
        {song}
        class={status === "searching" ? "blur-sm" : ""}
      />
    {/each}
    {#if $songSelectorState.isExtendable}
      <button
        class="btn btn-primary btn-sm"
        disabled={status !== "idle"}
        on:click={() => search(true)}>Load more...</button
      >
    {/if}
  </div>
  <div class="divider">OR</div>
  <input
    bind:files={uploadedArchive}
    type="file"
    class="file-input file-input-bordered w-full"
  />
</div>

<style lang="postcss">
  input[type="file"]::file-selector-button {
    @apply bg-base-200;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-base-100 rounded-full;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-base-content bg-opacity-75 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-opacity-100;
  }

  .disabled {
    @apply pointer-events-none select-none;
  }
</style>
