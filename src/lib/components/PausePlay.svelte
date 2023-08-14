<script lang="ts">
  export let paused: boolean;
  export let activeSongPoint: number;
</script>

<div class="join">
  <button class="btn join-item" on:click={() => (paused = !paused)}>
    {#if paused}
      <i class="ph-fill ph-play text-lg" />
    {:else}
      <i class="ph-fill ph-pause text-lg" />
    {/if}
  </button>
  <button
    class="btn join-item bg-primary"
    on:click={() => {
      activeSongPoint = 0;
      paused = true;
    }}
  >
    <i class="ph-fill ph-arrow-counter-clockwise text-lg" />
  </button>
</div>

<style lang="postcss">
  .btn {
    @apply bg-neutral hover:bg-neutral-focus;
  }
</style>
