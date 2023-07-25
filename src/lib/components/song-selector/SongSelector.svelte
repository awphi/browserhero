<script lang="ts">
  import DUMMY_DATA from "../../assets/dummy-data";
  import SongCard from "./SongCard.svelte";
  import {
    activeSongState,
    songSelectorSearchTerm,
    songSelectorSongs,
  } from "../../stores";
  import { onDestroy, onMount } from "svelte";
  import type { ChorusAPISong } from "../../chorus";

  let searching = false;
  let loadedSongs: ChorusAPISong[] = [];
  let isDummy = true;
  let inputText = "";
  let lastSearchTerm = inputText;
  let canExtend = true;
  let extendFrom = 0;

  $: isDummy = loadedSongs === DUMMY_DATA;

  onMount(() => {
    if ($songSelectorSearchTerm) {
      inputText = $songSelectorSearchTerm;
    }

    if ($songSelectorSongs.length > 0) {
      loadedSongs = $songSelectorSongs;
    } else {
      search(false);
    }
  });

  onDestroy(() => {
    if (!isDummy && loadedSongs.length > 0) {
      songSelectorSongs.set(loadedSongs);
    }

    songSelectorSearchTerm.set(inputText);
  });

  async function search(extend: boolean = false): Promise<void> {
    searching = true;

    // if we're not extending then load some dummy data to blur out in the results window
    if (!extend) {
      extendFrom = 0;
      loadedSongs = DUMMY_DATA;
    }

    // if we're extending the current search use the last search term rather than the current input text
    const term = extend ? lastSearchTerm : inputText;

    if (!extend) {
      lastSearchTerm = inputText;
    }

    const params = new URLSearchParams({
      query: term,
      from: extend ? extendFrom.toString() : "0",
    });
    const result = await fetch(`/api/search-songs?${params}`);
    const json = await result.json();
    canExtend = json.originalLength >= 20;
    if (canExtend) {
      extendFrom += 20;
    }
    loadedSongs = extend ? [...loadedSongs, ...json.songs] : json.songs;

    searching = false;
  }
</script>

<div class="flex flex-col h-full">
  <div class="join w-full mb-3">
    <input
      type="text"
      placeholder="Search chorus.fightthe.pw..."
      class="input flex-1 join-item input-bordered"
      bind:value={inputText}
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
      {#if searching}
        <span class="loading loading-infinity h-full" />
      {:else}
        <i class="ph-fill ph-magnifying-glass text-lg" />
      {/if}
    </button>
  </div>
  <div
    class="flex-1 flex flex-col overflow-y-auto overflow-x-hidden rounded-lg gap-2"
    class:disabled={isDummy}
  >
    {#each loadedSongs as song}
      <SongCard
        disabled={$activeSongState === "loading"}
        {song}
        class={isDummy ? "blur-sm" : ""}
      />
    {/each}
    {#if canExtend}
      <button
        class="btn btn-primary btn-sm"
        disabled={searching}
        on:click={() => search(true)}>Load more...</button
      >
    {/if}
  </div>
  <div class="divider">OR</div>
  <input type="file" class="file-input file-input-bordered w-full" />
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
