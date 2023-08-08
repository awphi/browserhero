<script lang="ts">
  import { activeSong, keyMap } from "../stores";
  import { CanvasGuitar } from "$lib/canvas-guitar";
  import { getNoteX, type Button, buttonDefs } from "$lib/guitar-utils";
  import { onMount } from "svelte";
  import type { NoteEvent } from "$lib/chart-parser";
  import isEqual from "lodash/isEqual";

  export let activeSongPoint: number;
  export let guitarWidth = 700;
  export let buttonRadius = 60;

  let guitar: CanvasGuitar | undefined;
  let guitarContainer: HTMLDivElement;
  let canStrum: boolean = true;
  let lastHitNoteTick: number = -Infinity;

  let buttons: Button[] = buttonDefs.map((b) => ({ ...b, isDown: false }));

  activeSong.subscribe(() => {
    guitar?.clearZappedNotes();
  });

  function canTap(note: NoteEvent): boolean {
    return note.tap || (note.isHOPO && guitar!.isOnComboWith(lastHitNoteTick));
  }

  function getFirstChordInHitArea(): (NoteEvent | undefined)[] | null {
    const notes = guitar!.getNotesInHitArea();
    if (notes.length === 0) {
      return null;
    }

    const result: NoteEvent[] = new Array(buttons.length).fill(undefined);
    for (const note of notes) {
      if (note.tick !== notes[0].tick) {
        break;
      }

      result[note.note] = note;
    }

    return result;
  }

  function strum(isTap: boolean): void {
    if (!isTap) {
      canStrum = false;
    }
    const chord = getFirstChordInHitArea();
    if (chord === null) {
      return;
    }
    console.log(isTap ? "tap" : "strum", chord);

    const buttonState = buttons.map((b) => b.isDown);
    const chordRequiredButtonState = chord.map((note) => note !== undefined);
    if (
      isEqual(buttonState, chordRequiredButtonState) &&
      (!isTap || chord.every((note) => note === undefined || canTap(note)))
    ) {
      for (const note of chord) {
        if (note) {
          lastHitNoteTick = note.tick;
          guitar!.zapNote(note);
        }
      }
    }
  }

  function keyDown(e: KeyboardEvent) {
    const action = $keyMap[e.key];
    if (action !== undefined && guitar) {
      if (action === "strum" && canStrum) {
        strum(false);
      } else if (typeof action === "number") {
        buttons[action].isDown = true;
        strum(true);
      }
    }
  }

  function keyUp(e: KeyboardEvent) {
    const action = $keyMap[e.key];
    if (action !== undefined && guitar) {
      if (action === "strum") {
        canStrum = true;
      } else if (typeof action === "number") {
        buttons[action].isDown = false;
        strum(true);
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    return () => {
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("keydown", keyDown);
    };
  });

  $: {
    if (guitar) {
      guitar.destroy();
    }

    if (typeof $activeSong === "object" && guitarContainer) {
      guitar = new CanvasGuitar(
        guitarContainer,
        $activeSong.chart,
        guitarWidth,
        buttonDefs,
        buttonRadius,
        "MediumSingle"
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
    style="background: linear-gradient(#0B0D0F, transparent); height: 300px; width: {guitarWidth +
      8}px; "
    class="absolute z-20 -left-1 -top-1"
  />

  <div class="absolute w-full h-full" bind:this={guitarContainer} />

  {#each buttons as button, i}
    <div
      class="button"
      style="left: {getNoteX(
        i,
        guitarWidth / buttons.length
      )}px; width: {buttonRadius *
        2}px; background-color: {button.color}; bottom: {buttonRadius}px;"
    >
      <div class="button-center button-center-lower" />
      <div
        class="button-center button-center-upper"
        class:pressed={button.isDown}
      />
    </div>
  {/each}
</div>

<style lang="postcss">
  .button > * {
    @apply w-2/3 aspect-square absolute;
  }

  .button-center-upper {
    @apply bg-base-100 rounded-full;
    transition-property: all;
    transition-duration: 100ms;
    box-shadow: rgba(0, 0, 0, 0.5) 0px 10px 0px;
    transform: translateY(-10px);
  }

  .pressed {
    box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 0px;
    transform: translateY(0px);
  }

  .button {
    @apply flex items-center justify-center -translate-x-1/2 aspect-square rounded-full absolute border-4 border-base-100;
  }

  .guitar {
    height: 2000px;
    position: absolute;
    bottom: 0;
    transform: perspective(900px) rotateX(45deg);
    transform-origin: center bottom;
    background: linear-gradient(
      90deg,
      hsl(213.3, 17.6%, 16%),
      hsl(213.3, 17.6%, 18%),
      hsl(213.3, 17.6%, 21%),
      hsl(213.3, 17.6%, 22%),
      hsl(213.3, 17.6%, 21%),
      hsl(213.3, 17.6%, 18%),
      hsl(213.3, 17.6%, 16%)
    );
    @apply outline outline-4 outline-base-300;
  }

  .string {
    @apply h-full absolute outline-2 outline outline-base-300 opacity-25;
  }
</style>
