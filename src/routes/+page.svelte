<script lang="ts">
  import Menu from "$lib/components/Menu.svelte";
  import PausePlay from "$lib/components/PausePlay.svelte";
  import { onMount } from "svelte";
  import {
    activeSong,
    activeScore,
    activeSongState,
    activeCombo,
    loadSong,
  } from "$lib/stores";
  import SongMetaDisplay from "$lib/components/SongMetaDisplay.svelte";
  import { loadSongArchiveFromUrl } from "$lib/song-loader";
  import CanvasGuitar from "$lib/components/CanvasGuitar.svelte";
  import ThreeGuitar from "$lib/components/ThreeGuitar.svelte";
  import AudioTrack from "$lib/components/AudioTrack.svelte";
  import ScoreDisplay from "$lib/components/ScoreDisplay.svelte";

  let activeSongPoint = 0;
  let paused = true;

  activeSong.subscribe(() => {
    // reset local state when song changes
    paused = true;
    activeSongPoint = 0;
  });

  onMount(() => {
    const testUrl = new URL(
      //"/mr-brightside.7z",
      "/cowboys-dont-cry.zip",
      import.meta.url
    ).toString();
    loadSong(() => loadSongArchiveFromUrl(testUrl));
  });
</script>

<svelte:head>
  <title>BrowserHero</title>
</svelte:head>

<div class="h-full overflow-hidden min-w-[700px]">
  <div class="bottom-2 left-2 absolute">
    <PausePlay bind:paused bind:activeSongPoint />
  </div>

  <Menu class="absolute left-0 top-2 z-10" />
  <div class="flex w-full h-full items-center justify-center">
    <CanvasGuitar {activeSongPoint} />
    <div class="score-display-container">
      <ScoreDisplay score={$activeScore} combo={$activeCombo} />
    </div>

    <!--<ThreeGuitar {activeSongPoint} /> -->
  </div>
  <div class="absolute top-2 right-2">
    {#if $activeSongState === "idle" && $activeSong}
      <SongMetaDisplay song={$activeSong} bind:activeSongPoint />
      <AudioTrack
        song={$activeSong}
        bind:currentTime={activeSongPoint}
        bind:paused
      />
    {/if}
  </div>
</div>

<style>
  .score-display-container {
    left: calc(50% + 400px);
    @apply absolute bottom-[150px];
  }
</style>
