<script lang="ts">
  import type { SongBundle } from "$lib/song-loader";
  import type Crunker from "crunker";
  import { onMount } from "svelte";

  export let song: SongBundle;
  export let paused: boolean = true;
  export let currentTime: number = 0;

  let audioUrl: string | null = null;
  let crunker: Crunker | null = null;

  onMount(async () => {
    const { default: Crunker } = await import("crunker");
    crunker = new Crunker();
  });

  $: if (song && crunker) {
    audioUrl = null;

    crunker
      .fetchAudio(...Object.values(song.audio))
      .then((audios) => crunker!.mergeAudio(audios))
      .then((buf) => {
        audioUrl = crunker!.export(buf).url;
      });
  }
</script>

{#if audioUrl}
  <audio class="hidden" src={audioUrl} bind:paused bind:currentTime />
{/if}
