<script lang="ts">
  import type { SongBundle } from "$lib/song-loader";

  export let song: SongBundle;
  export let paused: boolean = true;
  export let currentTime: number = 0;

  let otherAudioTracks: HTMLAudioElement[] = [];

  let audioUrls: string[];
  $: audioUrls = Object.values(song.audio);

  // Manually re-sync all the other audio tracks to the master track on pause
  $: if (paused) {
    for (let i = 0; i < otherAudioTracks.length; i++) {
      otherAudioTracks[i].currentTime = currentTime;
    }
  }
</script>

<div class="hidden">
  <audio src={audioUrls[0]} bind:paused bind:currentTime />
  {#each audioUrls.slice(1) as audioUrl, i}
    <audio bind:this={otherAudioTracks[i]} src={audioUrl} bind:paused />
  {/each}
</div>
