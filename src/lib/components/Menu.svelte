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

  let clazz: string = "";
  let openTab: number | null = null;

  export { clazz as class };
</script>

<div class={`flex ${clazz}`}>
  <div class="menu-container {openTab === null ? 'closed' : 'open'}">
    {#if openTab !== null}
      <div
        class="h-full w-full overflow-hidden"
        transition:fade={{ duration: 300 }}
      >
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
        <i class={`ph-fill ${tab.icon} text-xl`} />
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

  .menu-container {
    transition-property: width;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
    @apply bg-neutral outline-1 outline outline-base-100 my-[1px] rounded-br-lg h-[80vh];
  }

  .closed {
    width: 0px;
  }

  .open {
    width: 500px;
    @apply p-4;
  }
</style>
