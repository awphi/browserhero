<script lang="ts">
  import {
    formatInstrumentName,
    type ChorusAPISong,
    type Instrument,
    difficulties,
  } from "../../chorus";
  import { activeSong } from "../../stores";

  export let song: ChorusAPISong;
  let clazz: string;
  let instruments: Instrument[];
  $: instruments = Object.keys(song.noteCounts) as Instrument[];

  export { clazz as class };

  function abbreviate(str: string, lim: number): string {
    return str.length > lim ? str.slice(0, lim) + "..." : str;
  }

  async function play(): Promise<void> {
    // TODO load song
    /*     console.log("Loading:", song);
    const bundle = await ChorusAPI.fetchSong(song);
    console.log("Loaded:", bundle);
    activeSong.set(bundle); */
  }

  const instrumentIconMap: Record<Instrument, string> = {
    guitar: "ph-guitar ph-fill",
    keys: "ph-piano-keys ph-fill",
    bass: "ph-guitar ph",
    vocals: "ph-microphone-stage ph-fill",
    drums: "ph-record ph-fill",
    rhythm: "ph-hands-clapping ph-fill",
    guitarghl: "ph-guitar ph-fill",
  };
</script>

<div
  class={`flex-col w-full py-2 px-3 rounded-lg bg-base-100 border border-neutral-content border-opacity-20 ${clazz}`}
>
  <div class="flex">
    <div class="flex flex-col flex-1 mr-2">
      <p class="text-primary-content">
        {abbreviate(song.name, 56)}
      </p>
      <p
        class:tooltip={song.artist.length > 16 || song.album.length > 20}
        class="text-sm text-left tooltip-bottom w-fit"
        data-tip={`${song.artist} - ${song.album} (${song.year})`}
      >
        {abbreviate(song.artist, 24)} - {abbreviate(song.album, 32)} ({song.year})
      </p>

      <hr class="w-full border-base-content border-opacity-40 mt-1" />
    </div>

    <button on:click={play} class="btn btn-primary aspect-square">
      <i class="ph-fill ph-play text-2xl mr-1" />
    </button>
  </div>
  <div class="ml-auto flex gap-1 mt-2">
    {#each instruments as instrument}
      <div
        class="bg-base-200 text-base-content border-base-content border border-opacity-20 flex items-center tooltip tooltip-top p-1 rounded-md"
        data-tip={formatInstrumentName(instrument)}
      >
        <i class={`${instrumentIconMap[instrument]} text-lg`} />
        <div class="flex text-sm ml-1">
          {#each difficulties as diff}
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
    <p class="text-xs mt-1">
      Charted by:
      {abbreviate(song.charter, 54)} ({new Date(song.uploadedAt).getFullYear()})
    </p>
  {/if}
</div>

<style lang="postcss">
  .instrument-difficulty-valid {
    @apply text-primary-content underline;
  }
</style>
