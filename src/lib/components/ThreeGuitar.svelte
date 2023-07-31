<script lang="ts">
  import { activeSong } from "../stores";
  import { ThreeGuitar } from "$lib/three-guitar";

  export let activeSongPoint: number;

  let guitar: ThreeGuitar | undefined;
  let sceneContainer: HTMLDivElement;

  $: {
    if (guitar) {
      guitar.destroy();
    }

    if (typeof $activeSong === "object" && sceneContainer) {
      guitar = new ThreeGuitar(sceneContainer);
    } else {
      guitar = undefined;
    }
  }
  $: if (guitar) {
    guitar.update(activeSongPoint);
  }
</script>

<div class="w-full h-full" bind:this={sceneContainer} />
