<script lang="ts">
  import { Chart } from "chart2json";
  import { activeSong } from "../stores";
  import { Guitar } from "$lib/guitar/guitar";
  export let activeSongPoint: number;

  let guitar: Guitar | undefined;
  let guitarContainer: HTMLDivElement;

  $: {
    if (typeof $activeSong === "object" && guitarContainer) {
      guitar = new Guitar(
        guitarContainer,
        $activeSong.chart,
        Chart.Difficulty.EXPERT,
        Chart.Instrument.SINGLE
      );
    } else {
      if (guitar) {
        guitar.destroy();
      }
      guitar = undefined;
    }
  }
  $: if (guitar) {
    guitar.updateTime(activeSongPoint);
  }
</script>

<div class="guitar" bind:this={guitarContainer} />

<style lang="postcss">
  .guitar {
    height: 274vh;
    width: 500px;
    position: absolute;
    bottom: 0;
    //transform: perspective(100vh) rotateX(30deg);
    transform-origin: center bottom;
    @apply bg-neutral outline outline-4 outline-base-200;
  }
</style>
