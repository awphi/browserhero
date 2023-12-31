<script lang="ts">
  import { loadSongArchiveFromUrl } from "$lib/song-loader";
  import {
    formatInstrumentName,
    type ChorusAPISong,
    type ChorusInstrument,
    chorusDifficulties,
  } from "../../chorus";
  import { loadSong } from "../../stores";
  import { backOff } from "exponential-backoff";
  import { toast } from "@zerodevx/svelte-toast";

  export let song: ChorusAPISong;
  export let disabled: boolean;
  let clazz: string;
  let instruments: ChorusInstrument[];
  $: instruments = Object.keys(song.noteCounts) as ChorusInstrument[];

  export { clazz as class };

  function abbreviate(str: string, lim: number): string {
    return str.length > lim ? str.slice(0, lim) + "..." : str;
  }

  async function fetchSongArchive(): Promise<Response> {
    const res = await fetch(`/api/get-song-archive/${song.id}`);
    if (res.status === 200) {
      return res;
    }

    // throw to force backoff to go again
    const message = await res.json();
    throw message;
  }

  async function play(): Promise<void> {
    loadSong(async () => {
      const res = await backOff(fetchSongArchive, {
        delayFirstAttempt: false,
        numOfAttempts: 5,
      });
      const url = await res.text();
      const song = await loadSongArchiveFromUrl(url);
      return song;
    });
  }

  const instrumentIconMap: Record<ChorusInstrument, string> = {
    guitar: "ph-guitar ph-fill",
    keys: "ph-piano-keys ph-fill",
    bass: "ph-speaker-hifi ph-fill",
    vocals: "ph-microphone-stage ph-fill",
    drums: "ph-record ph-fill",
    rhythm: "ph-hands-clapping ph-fill",
    guitarghl: "ph-x ph-fill",
  };
</script>

<div class="flex-col w-full py-2 px-3 rounded-lg bg-base-100 {clazz}">
  <div class="flex">
    <div class="flex flex-col flex-1 mr-2">
      <p class="text-primary-content">
        {abbreviate(song.name, 56)}
      </p>
      <p
        class:tooltip={song.artist.length > 16 || song.album.length > 20}
        class="text-left tooltip-bottom w-fit"
        data-tip="{song.artist} - {song.album} ({song.year})"
      >
        {abbreviate(song.artist, 24)} - {abbreviate(song.album, 32)} ({song.year})
      </p>

      <hr class="w-full border-base-content border-opacity-40 mt-1" />
    </div>

    <button {disabled} on:click={play} class="btn btn-primary aspect-square">
      <i class="ph-fill ph-play text-2xl mr-1" />
    </button>
  </div>
  <div class="ml-auto flex gap-1 mt-2">
    {#each instruments as instrument}
      <div
        class="bg-base-200 text-base-content border-base-content border border-opacity-20 flex items-center tooltip tooltip-top p-1 rounded-md"
        data-tip={formatInstrumentName(instrument)}
      >
        <i class="{instrumentIconMap[instrument]} text-lg" />
        <div class="flex mx-1">
          {#each chorusDifficulties as diff}
            <p
              class:instrument-difficulty-valid={song.noteCounts[instrument]?.[
                diff
              ]}
            >
              {diff.toUpperCase()}
            </p>
          {/each}
        </div>
      </div>
    {/each}
  </div>
  {#if song.uploadedAt && song.charter}
    <div class=" mt-1 flex gap-1 items-center">
      <p class="text-sm">
        Charted by:
        {abbreviate(song.charter, 54)} ({new Date(
          song.uploadedAt
        ).getFullYear()})
      </p>
      <a class="h-5 hover:contrast-200" href={song.link} target="_blank">
        <i class="ph-fill ph-link" />
      </a>
    </div>
  {/if}
</div>

<style lang="postcss">
  .instrument-difficulty-valid {
    @apply text-primary-content underline;
  }
</style>
