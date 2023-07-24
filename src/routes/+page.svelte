<script lang="ts">
  import Menu from "$lib/components/Menu.svelte";
  import PausePlay from "$lib/components/PausePlay.svelte";
  import Guitar from "$lib/components/Guitar.svelte";
  import { onMount } from "svelte";
  import { activeSong } from "$lib/stores";
  import SongMetaDisplay from "$lib/components/SongMetaDisplay.svelte";
  import { loadSongArchiveFromUrl } from "$lib/song-loader";

  let activeSongPoint = 0;
  let paused = true;

  activeSong.subscribe(() => {
    paused = true;
    activeSongPoint = 0;
  });

  onMount(async () => {
    const testArchiveUrl = new URL(
      "/test-archive.zip",
      import.meta.url
    ).toString();
    const bundle = await loadSongArchiveFromUrl(testArchiveUrl);
    activeSong.set(bundle);
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
    <Guitar {activeSongPoint} />
  </div>
  {#if $activeSong}
    <SongMetaDisplay
      song={$activeSong}
      bind:activeSongPoint
      class="absolute top-2 right-2"
    />
    <div class="hidden">
      {#each Object.values($activeSong.audio) as audioUrl}
        <audio src={audioUrl} bind:paused bind:currentTime={activeSongPoint} />
      {/each}
    </div>
  {/if}
</div>
