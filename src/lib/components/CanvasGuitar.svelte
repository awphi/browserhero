<script lang="ts">
  import { activeSong } from "../stores";
  import { Guitar } from "$lib/guitar/guitar";
  import { getNoteX, type ButtonDef } from "$lib/guitar/guitar-utils";

  export let activeSongPoint: number;
  export let guitarWidth = 600;
  export let buttonRadius = 55;
  export let buttonOffset = 20;

  let guitar: Guitar | undefined;
  let guitarContainer: HTMLDivElement;

  let buttons: ButtonDef[] = [
    {
      color: "rgb(35,155,86)",
      tapColor: "rgba(35,155,86, 0.5)",
    },
    {
      color: "rgb(231,76,60)",
      tapColor: "rgba(231,76,60, 0.5)",
    },
    {
      color: "rgb(244,208,63)",
      tapColor: "rgba(244,208,63, 0.5)",
    },
    {
      color: "rgb(52,152,219)",
      tapColor: "rgba(52,152,219, 0.5)",
    },
    {
      color: "rgb(220,118,51)",
      tapColor: "rgba(220,118,51, 0.5)",
    },
  ];

  $: {
    if (guitar) {
      guitar.destroy();
    }

    if (typeof $activeSong === "object" && guitarContainer) {
      guitar = new Guitar(
        guitarContainer,
        $activeSong.chart,
        guitarWidth,
        buttons,
        buttonRadius,
        buttonOffset,
        "ExpertSingle"
      );
    } else {
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
      <div class="rounded-full w-2/3 aspect-square bg-base-100" />
    </div>
  {/each}
</div>

<style lang="postcss">
  .guitar {
    height: 2000px;
    position: absolute;
    bottom: 0;
    transform: perspective(900px) rotateX(45deg);
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
