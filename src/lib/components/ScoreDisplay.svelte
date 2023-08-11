<script lang="ts">
  import type { ScoreInfo } from "$lib/util";

  export let score: ScoreInfo;
</script>

<div class="flex flex-col text-right text-primary-content">
  <div class="flex items-center z-10 text-2xl font-bold">
    <div
      class="bg-neutral shadow-lg w-[167px] px-2 rounded-md border border-base-100 pr-5 pb-[3px]"
    >
      <p>{Math.min(score.score, 999999999).toLocaleString()}</p>
    </div>
    <div
      class="w-12 h-12 border-base-100 border bg-neutral rounded-full -ml-4 flex items-center justify-center pb-[3px]"
    >
      <p>-</p>
    </div>
  </div>

  <div
    class="w-20 -mt-2 ml-2 bg-neutral px-2 rounded-b-md border-base-100 border-b border-x pb-[1px]"
  >
    <p>{score.combo}</p>
  </div>
</div>
