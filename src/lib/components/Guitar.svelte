<script lang="ts">
  import { activeSong } from "../stores";

  // constants the define the look of the guitar
  export let guitarWidth = 700;
  export let buttonCount = 5;
  export let buttonMargin = 20;

  // how many seconds we are into the active song (fractional)
  export let activeSongPoint: number;

  // some client data on how big things are on screen/where to position them
  let guitarHeight: number = 0;
  let stringOffset: number = 0;

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
  $: if ($activeSong) {
    resolution = $activeSong.chart.song.resolution;
    currentSyncKeys = Object.keys($activeSong.chart.syncTrack);
  }

  // a list of keys to the current song's sync track that we've not yet processed - used to determine BPM
  let currentSyncKeys: string[] = [];

  $: stringOffset = guitarWidth / buttonCount;

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

  // calculate how many ticks occured in the delta time given a resolution and a bpm
  function getTicks(bpm: number, resolution: number, dt: number): number {
    return dt === 0 ? 0 : (bpm / 60) * resolution * dt;
  }

  function getFretPosition(
    idx: number,
    guitarHeight: number,
    point: number
  ): number {
    // 110 is the 50px offset of the notebar + the note button radius (60px)
    const guitarHeightFromNotebar = guitarHeight - 110;
    const totalOffset = point + guitarHeightFromNotebar;
    return (idx * resolution + totalOffset) % guitarHeightRounded;
  }

  // reset the sync keys if the song is restarted & guitar point
  $: if (activeSongPoint === 0 && $activeSong) {
    currentSyncKeys = Object.keys($activeSong.chart.syncTrack);
    point = 0;
    lastUpdate = 0;
  }

  // update the current point
  $: if ($activeSong) {
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
        left: ${(i + 0.5) * stringOffset}px;
      `}
    />
  {/each}
  {#each buttons as button, i}
    <div
      class="button"
      style={`
        left: ${(i + 0.5) * stringOffset}px; 
        width: ${guitarWidth / buttonCount - buttonMargin}px;
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

  .string {
    @apply h-full absolute outline-2 outline outline-base-200;
  }

  .button {
    @apply aspect-square rounded-full absolute -translate-x-1/2 bottom-[50px] border-base-200 border-4;
  }
</style>
