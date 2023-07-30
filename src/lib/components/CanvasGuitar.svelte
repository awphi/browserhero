<script lang="ts">
  import { activeSong } from "../stores";
  import { Guitar } from "$lib/guitar/guitar";
  import {
    buttonOffset,
    buttonRadius,
    getNoteX,
  } from "$lib/guitar/guitar-utils";

  export let activeSongPoint: number;
  export let guitarWidth = 600;

  let guitar: Guitar | undefined;
  let guitarContainer: HTMLDivElement;

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

  $: {
    if (typeof $activeSong === "object" && guitarContainer) {
      guitar = new Guitar(guitarContainer, $activeSong.chart);
    } else {
      if (guitar) {
        guitar.destroy();
      }
      guitar = undefined;
    }
  }
  $: if (guitar) {
    guitar.update(activeSongPoint);
  }
</script>

<div class="guitar" style={`width: ${guitarWidth}px;`}>
  <!--   {#each { length: buttons.length } as _, i}
    <div
      class="string"
      style={`
      left: ${getNoteX(i, guitarWidth / buttons.length)}px;
    `}
    />
  {/each} -->

  <div
    style={`height: calc(100% - ${buttonRadius}px - ${buttonOffset}px);`}
    class="absolute w-full"
    bind:this={guitarContainer}
  />

  {#each buttons as button, i}
    <div
      class="button"
      style={`
    left: ${getNoteX(i, guitarWidth / buttons.length)}px; 
    width: ${buttonRadius * 2}px;
    background-color: ${button.color};
    bottom: ${buttonOffset}px;
  `}
    >
      <div class="rounded-full w-4/5 aspect-square bg-base-100" />
    </div>
  {/each}
</div>

<style lang="postcss">
  .guitar {
    height: 2700px;
    position: absolute;
    bottom: 0;
    //transform: perspective(900px) rotateX(45deg);
    transform-origin: center bottom;
    @apply bg-neutral outline outline-4 outline-base-200;
  }

  .button {
    @apply flex items-center justify-center -translate-x-1/2 aspect-square rounded-full absolute border-base-200 border-4;
  }

  .string {
    @apply h-full absolute outline-2 outline outline-base-200 opacity-25;
  }
</style>
