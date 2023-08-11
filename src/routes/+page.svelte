<script lang="ts">
  import Menu from "$lib/components/Menu.svelte";
  import PausePlay from "$lib/components/PausePlay.svelte";
  import { onMount } from "svelte";
  import { activeSong, activeScore } from "$lib/stores";
  import SongMetaDisplay from "$lib/components/SongMetaDisplay.svelte";
  import { loadSongArchiveFromUrl } from "$lib/song-loader";
  import CanvasGuitar from "$lib/components/CanvasGuitar.svelte";
  import ThreeGuitar from "$lib/components/ThreeGuitar.svelte";
  import AudioTrack from "$lib/components/AudioTrack.svelte";
  import ScoreDisplay from "$lib/components/ScoreDisplay.svelte";

  let activeSongPoint = 0;
  let paused = true;

  activeSong.subscribe(() => {
    paused = true;
    activeSongPoint = 0;
  });

  async function loadDebugSong(): Promise<void> {
    activeSong.set("loading");
    const testUrl = new URL("/mr-brightside.7z", import.meta.url).toString();
    try {
      const song = await loadSongArchiveFromUrl(testUrl);
      activeSong.set(song);
    } catch (e) {
      activeSong.set(undefined);
    }
  }

  onMount(() => {
    loadDebugSong();
  });
</script>

<svelte:head>
  <title>BrowserHero</title>
</svelte:head>

<div class="h-full overflow-hidden min-w-[700px]">
  <PausePlay
    class="bottom-2 left-2 absolute z-10"
    bind:paused
    bind:activeSongPoint
  />
  <Menu class="absolute left-0 top-2 z-10" />
  <div class="flex w-full h-full items-center justify-center">
    <CanvasGuitar {activeSongPoint} />
    <div class="score-display-container">
      <ScoreDisplay score={$activeScore} />
    </div>

    <!--<ThreeGuitar {activeSongPoint} /> -->
  </div>
  <div class="absolute top-2 right-2">
    {#if typeof $activeSong === "object"}
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
