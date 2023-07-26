<script lang="ts">
  import type { Chart } from "chart2json";
  import { activeSong } from "../src/lib/stores";

  // constants the define the look/feel of the guitar
  export let guitarWidth = 700;
  export let buttonCount = 5;
  export let buttonMargin = 20;
  export let pxPerTick = 3;

  let buttons = [
    {
      color: "#239B56",
    },
    {
      color: "#E74C3C",
    },
    {
      color: "#F4D03F",
    },
    {
      color: "#3498DB",
    },
    {
      color: "#DC7633",
    },
  ];

  let track: Chart.InstrumentTracks[keyof Chart.InstrumentTracks] | undefined =
    undefined;
  $: {
    if (typeof $activeSong === "object") {
      // TODO make this use difficulty & instrument selection from menu
      track = $activeSong.chart.difficulties["Expert"]?.["Single"];
    } else {
      track = undefined;
    }
  }

  // how many seconds we are into the active song (fractional)
  export let activeSongPoint: number;

  // some client data on how big things are on screen/where to position them
  let guitarHeight: number = 0;
  let stringOffset: number = 0;
  let noteWidth: number;

  $: noteWidth = guitarWidth / buttonCount - buttonMargin;
  $: stringOffset = guitarWidth / buttonCount;

  // timing information for the current playback of the active song
  // `point` is the end result - it tells us how many tick we're into the current song
  // it's used to position frets and notes
  let resolution: number = 192;
  let point: number = 0;
  let lastUpdate: number = 0;
  let bpm: number = 60;

  // to place frets equidistantly we use a rounded guitar height
  // this value is rounded to resolution * 4 (the length in ticks of a full note)
  let guitarHeightRounded: number = 0;
  $: guitarHeightRounded =
    Math.ceil(guitarHeight / (resolution * 4)) * resolution * 4;

  // set the resolution + currentSyncKeys when the active song changes
  $: if (typeof $activeSong === "object") {
    resolution = $activeSong.chart.song.resolution;
    currentSyncKeys = Object.keys($activeSong.chart.syncTrack);
  }

  // a list of keys to the current song's sync track that we've not yet processed - used to determine BPM
  let currentSyncKeys: string[] = [];

  // calculate how many ticks occured in the delta time given a resolution and a bpm
  function getTicks(bpm: number, resolution: number, dt: number): number {
    return dt === 0 ? 0 : (bpm / 60) * resolution * dt;
  }

  function getNoteX(index: number, stringOffset: number): number {
    return (index + 0.5) * stringOffset;
  }

  function getNoteY(tick: number, point: number) {
    return tick * pxPerTick - point * pxPerTick;
  }

  function getFretPosition(
    idx: number,
    guitarHeight: number,
    point: number
  ): number {
    // 110 is the 50px offset of the notebar + the note button radius (60px)
    const guitarHeightFromNotebar = guitarHeight - 110;
    const totalOffset = point * pxPerTick + guitarHeightFromNotebar;
    return (idx * resolution + totalOffset) % guitarHeightRounded;
  }

  // reset the sync keys if the song is restarted & guitar point
  $: if (activeSongPoint === 0 && typeof $activeSong === "object") {
    currentSyncKeys = Object.keys($activeSong.chart.syncTrack);
    point = 0;
    lastUpdate = 0;
  }

  // update the current point
  $: if (typeof $activeSong === "object") {
    if (currentSyncKeys.length > 0) {
      const nextSync = currentSyncKeys[0];
      const tick = Number.parseInt(nextSync);
      if (point >= tick) {
        const events = $activeSong.chart.syncTrack[tick];
        events.forEach((e) => {
          if (e.kind === 0) {
            console.log("BPM Update: ", e.bpm);
            bpm = e.bpm;
          }
        });
        currentSyncKeys = currentSyncKeys.slice(1);
      }
    }

    point += getTicks(bpm, resolution, activeSongPoint - lastUpdate);
    lastUpdate = activeSongPoint;
  }
</script>

<div
  bind:clientHeight={guitarHeight}
  class="guitar"
  style={`width: ${guitarWidth}px;`}
>
  {#each { length: buttonCount } as _, i}
    <div
      class="string"
      style={`
        left: ${getNoteX(i, stringOffset)}px;
      `}
    />
  {/each}
  {#each buttons as button, i}
    <div
      class="button"
      style={`
        left: ${getNoteX(i, stringOffset)}px; 
        width: ${noteWidth}px;
        background-color: ${button.color};
      `}
    />
  {/each}

  {#each { length: guitarHeightRounded / resolution } as _, i}
    <div
      class="fret outline-base-100"
      class:opacity-100={i % 4 === 0}
      class:opacity-30={i % 4 !== 0}
      style={`top: ${getFretPosition(i, guitarHeight, point)}px;`}
    />
  {/each}

  {#if track}
    {#each Object.entries(track) as [tick, tickInfo]}
      <div
        class="note-box"
        style={`bottom: ${getNoteY(Number.parseInt(tick), point)}px;`}
      >
        {#each tickInfo[0].lanes as lane}
          <div
            class="note"
            style={`
            left: ${getNoteX(lane.lane - 1, stringOffset)}px; 
            background-color: ${buttons[lane.lane - 1]?.color ?? "transparent"};
            width: ${noteWidth}px;
            `}
          />
        {/each}
      </div>
    {/each}
  {/if}
</div>

<style lang="postcss">
  .guitar {
    height: 274vh;
    position: absolute;
    bottom: 0;
    transform: perspective(100vh) rotateX(30deg);
    transform-origin: center bottom;
    @apply bg-neutral outline outline-4 outline-base-200;
  }

  .fret {
    width: 100%;
    @apply absolute outline-[3px] outline -z-10;
  }

  .note-box {
    @apply absolute;
  }

  .note {
    @apply -translate-x-1/2 absolute rounded-full aspect-square;
  }

  .string {
    @apply h-full absolute outline-2 outline outline-base-200;
  }

  .button {
    @apply note bottom-[50px] border-base-200 border-4;
  }
</style>
