<script lang="ts">
  import {
    formatTimespan,
    getDifficultiesForInstrumentInChart,
    getInstrumentsInChart,
  } from "../util";
  import type { SongBundle } from "$lib/song-loader";
  import { activeSongDifficulty, activeSongInstrument } from "$lib/stores";

  export let activeSongPoint: number;
  export let song: SongBundle;

  let songLengthSeconds: number = 0;

  let albumCover: string = "";
  $: songLengthSeconds = Number.parseInt(song.ini.song_length) / 1000;
  $: {
    let images = Object.keys(song.images);
    const albumKey = images.find((k) => k.includes("album"));
    if (albumKey) {
      albumCover = song.images[albumKey];
    }
  }

  export { clazz as class };
</script>

<div
  class="outline-1 outline outline-base-100 bg-neutral px-2 py-1 rounded-md w-80"
>
  <h1 class="text-primary-content text-2xl font-bold">
    {song.ini.name}
  </h1>
  <h2>
    {song.ini.artist} - {song.ini.album} ({song.ini.year})
  </h2>
  <hr class="w-full border-base-content border-opacity-40 my-1" />
  <img
    src={albumCover}
    alt={`${song.ini.name} Album Cover`}
    class="rounded-md border-base-content border-opacity-20 border-2 w-52 aspect-square m-auto"
  />
  <!-- TODO allow scrubbing with this progress bar -->
  <progress
    class="progress mt-2 progress-primary w-full"
    value={activeSongPoint}
    max={songLengthSeconds}
  />
  <div class="flex justify-between">
    <p>{formatTimespan(activeSongPoint)}</p>
    <p>-{formatTimespan(songLengthSeconds - activeSongPoint)}</p>
  </div>
  <div class="flex gap-2 mt-2">
    <select
      bind:value={$activeSongDifficulty}
      class="select flex-1 select-bordered select-sm"
    >
      {#each getDifficultiesForInstrumentInChart(song.chart, "Single") as difficulty}
        <option value={difficulty}>{difficulty}</option>
      {/each}
    </select>
    <select
      bind:value={$activeSongInstrument}
      class="select flex-1 select-bordered select-sm"
    >
      {#each getInstrumentsInChart(song.chart) as instrument}
        <option value={instrument}>{instrument}</option>
      {/each}
    </select>
  </div>
</div>
