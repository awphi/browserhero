<script lang="ts">
  import { buttonDefs, type FretButtonDef } from "$lib/guitar-utils";

  const controlsToBind: FretButtonDef[] = [
    ...buttonDefs,
    { name: "Strum Up", color: "" },
    { name: "Strum Down", color: "" },
  ];
</script>

<!-- TODO do a redesign of this before making it functional -->

<div class="flex flex-col h-full">
  <div class="flex items-end gap-2 text-primary-content">
    <h1 class="text-3xl">Input Settings</h1>
  </div>
  <hr class="my-2" />
  <div
    class="bg-base-100 rounded-md p-2 border border-base-content border-opacity-20"
  >
    <h1 class="text-2xl font-bold mb-1 text-primary-content">Keyboard</h1>
    <div class="control-grid">
      {#each controlsToBind as control}
        <div class="text-primary-content cell">
          {control.name}
        </div>
        <div class="cell"><kbd class="kbd">^</kbd></div>
      {/each}
    </div>
  </div>
</div>

<style>
  .kbd {
    @apply my-2;
  }

  .cell {
    @apply flex items-center justify-center border border-base-content border-opacity-20;
  }

  .control-grid {
    @apply text-lg grid grid-cols-2 text-base-content p-2;
  }
</style>
