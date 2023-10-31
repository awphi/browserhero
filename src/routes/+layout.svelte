<script>
  import "../app.css";
  import "@phosphor-icons/web/fill";
  import { SvelteToast } from "@zerodevx/svelte-toast";
</script>

<div class="contents">
  <slot />
  <SvelteToast options={{ duration: 2000, reversed: true }} />
</div>

<style lang="postcss">
  :global(:root) {
    --toastContainerBottom: 2rem;
    --toastBackground: hsl(var(--n));
    --toastMargin: 0.5rem 0 0rem 0;
    --toastBarBackground: hsl(var(--p));
  }

  :global(._toastContainer) {
    display: flex;
    flex-direction: column-reverse;
  }
</style>
