<script lang="ts">
  import { difficulties, instruments } from "$lib/chart-parser";
  import { userSettingsState } from "$lib/stores";
</script>

<div class="flex flex-col h-full">
  <div class="flex items-end gap-2 text-primary-content">
    <h1 class="text-3xl">Settings</h1>
    <div class="flex-1" />
    <span class="text-sm text-neutral-content"
      >Last updated @ {new Date().toLocaleString()}</span
    >
  </div>
  <hr class="my-2" />
  <div class="settings-box">
    <h1 class="text-xl text-primary-content">Gameplay Settings</h1>
    <hr class="my-2" />

    <div class="settings-grid">
      <span>Preferred Difficulty:</span>
      <select
        bind:value={$userSettingsState.difficulty}
        class="select select-primary select-sm text-primary-content"
      >
        {#each difficulties as diff}
          <option value={diff}>{diff}</option>
        {/each}
      </select>
      <span>Preferred Instrument:</span>
      <select
        bind:value={$userSettingsState.instrument}
        class="select select-primary text-primary-content select-sm"
      >
        {#each instruments as instrument}
          <option value={instrument}>{instrument}</option>
        {/each}
      </select>
      <span>Speed:</span>
      <div class="flex gap-2">
        <input
          type="range"
          min="0.1"
          max="5"
          step="0.1"
          bind:value={$userSettingsState.speed}
          class="range range-primary"
        />
        <div class="flex items-center">
          <i class="ph-fill ph-arrow-fat-left text-primary -mr-[10px]" />
          <div
            class="bg-primary text-right text-primary-content rounded-md px-2"
          >
            {$userSettingsState.speed.toFixed(1)}x
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .settings-box {
    @apply bg-base-100 rounded-lg border border-neutral-content border-opacity-20 px-3 py-2 flex flex-col;
  }

  .settings-grid {
    grid-template-columns: 1fr 1.5fr;
    @apply grid items-center gap-2;
  }

  hr {
    @apply opacity-20 w-full;
  }
</style>
