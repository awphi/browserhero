<script lang="ts">
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
      component: undefined,
    },
  ] as const;

  let clazz: string = "";
  let openTab: number | null = null;

  export { clazz as class };
</script>

<div class={`flex ${clazz}`}>
  {#if openTab !== null}
    <div
      class="bg-neutral outline-1 outline outline-base-100 my-[1px] p-4 rounded-br-lg h-[80vh] w-[500px]"
    >
      <svelte:component this={tabs[openTab].component} />
    </div>
  {/if}
  <div class="join join-vertical rounded-l-none">
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
</style>
