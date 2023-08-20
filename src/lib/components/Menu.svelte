<script lang="ts">
  import { fade } from "svelte/transition";
  import ControlsMenu from "./ControlsMenu.svelte";
  import Settings from "./Settings.svelte";
  import SongSelector from "./song-selector/SongSelector.svelte";

  const tabs = [
    {
      icon: "ph-music-notes",
      title: "Chart Selector",
      component: SongSelector,
    },
    {
      icon: "ph-gear",
      title: "General Settings",
      component: Settings,
    },
    {
      icon: "ph-game-controller",
      title: "Controls Settings",
      component: ControlsMenu,
    },
  ] as const;

  let openTab: number | null = null;
</script>

<div class="container {openTab === null ? 'closed' : 'open'}">
  <div
    class="w-[500px] h-[80vh] p-4 bg-neutral outline-1 outline outline-base-100 my-[1px] rounded-br-lg"
  >
    {#if openTab !== null}
      <div class="h-full w-full" transition:fade={{ duration: 300 }}>
        <svelte:component this={tabs[openTab].component} />
      </div>
    {/if}
  </div>
  <div class="rounded-l-none join join-vertical">
    {#each tabs as tab, index}
      <button
        class="btn join-item tooltip tooltip-right w-14 h-14"
        class:selected={openTab === index}
        data-tip={tab.title}
        on:click={() => (openTab = index === openTab ? null : index)}
      >
        <i class="ph-fill {tab.icon} text-xl" />
      </button>
    {/each}
  </div>
</div>

<style lang="postcss">
  .btn {
    @apply bg-neutral hover:bg-neutral-focus;
  }

  .btn.selected {
    @apply bg-primary hover:bg-primary-focus text-primary-content;
  }

  .container {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    @apply flex absolute w-auto;
  }

  .open {
    left: 0;
  }

  .closed {
    left: -500px;
  }
</style>
