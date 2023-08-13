<script lang="ts">
  import { activeSong, activeScore, activeCombo } from "../stores";
  import { CanvasGuitar } from "$lib/canvas-guitar";
  import { getNoteX, type FretButton, buttonDefs } from "$lib/guitar-utils";
  import { onMount } from "svelte";
  import type { NoteEvent } from "$lib/chart-parser";
  import isEqual from "lodash/isEqual";
  import { InputManager, type ButtonAction } from "$lib/input-manager";

  export let activeSongPoint: number;
  export let guitarWidth = 700;
  export let buttonRadius = 60;

  let guitar: CanvasGuitar;
  let inputManager: InputManager;
  let guitarContainer: HTMLDivElement;
  let lastNotesInHitArea: NoteEvent[] | undefined;

  const buttons: FretButton[] = buttonDefs.map((b) => ({
    ...b,
    isDown: false,
  }));

  function canTap(note: NoteEvent): boolean {
    return note.tap || (note.isHOPO && $activeCombo >= 1);
  }

  function getFirstChordInHitArea():
    | (NoteEvent | undefined)[]
    | NoteEvent
    | null {
    const notes = guitar.getNotesInHitArea().filter((n) => !guitar.isZapped(n));
    if (notes.length === 0) {
      return null;
    }

    const result: NoteEvent[] = new Array(buttons.length).fill(undefined);
    for (const note of notes) {
      if (note.tick !== notes[0].tick) {
        break;
      }

      if (note.note === 7) {
        return note;
      }

      result[note.note] = note;
    }

    return result;
  }

  function hitNotes(isTap: boolean): void {
    const chord = getFirstChordInHitArea();
    if (chord !== null) {
      console.log(isTap ? "tap" : "strum", chord);
      if (Array.isArray(chord)) {
        const buttonState = buttons.map((b) => b.isDown);
        const chordRequiredButtonState = chord.map(
          (note) => note !== undefined
        );
        const canHit =
          !isTap || chord.every((note) => note === undefined || canTap(note));
        if (isEqual(buttonState, chordRequiredButtonState) && canHit) {
          $activeCombo += 1;
          for (const note of chord) {
            if (note) {
              activeScore.update((c) => c + 100);
              guitar.zapNote(note);
              animateButton(note.note);
            }
          }
          return;
        }
      } else if (chord.note === 7) {
        const areAllButtonsUp = buttons.every((b) => !b.isDown);
        if (areAllButtonsUp && (!isTap || canTap(chord))) {
          activeScore.update((c) => c + 100);
          guitar.zapNote(chord);
          for (let i = 0; i < buttons.length; i++) {
            animateButton(i);
          }
        }
      }
    }

    // if we didn't return above then there was no chord or the incorrect chord was input
    // therefore if this hit was a strum it counts as overstrumming so drop the combo
    if (!isTap) {
      $activeCombo = 0;
    }
  }

  function animateButton(btn: number): void {
    const el = buttons[btn].buttonEl;
    if (!el) {
      return;
    }

    el.animate(
      [
        {
          transform: "translateY(-20px)",
          boxShadow: "rgba(0, 0, 0, 0.5) 0px 20px 0px",
        },
        {},
      ],
      {
        duration: 150,
        iterations: 1,
      }
    );
  }

  function processInputs(): void {
    let shouldTap = false;
    for (let i = 0; i < buttons.length; i++) {
      const action = i.toString() as ButtonAction;
      const wasDown = buttons[i].isDown;
      const shouldBeDown = inputManager.getButtonState(action) !== "inactive";
      if (shouldBeDown !== wasDown) {
        buttons[i].isDown = shouldBeDown;
        shouldTap = true;
      }
    }

    const shouldStrum =
      inputManager.getButtonState("strum-down") === "pressed" ||
      inputManager.getButtonState("strum-up") === "pressed";

    // if we should tap or strum then we should check if we hit the correct chord
    if (shouldStrum || shouldTap) {
      // we only count the input as a tap if we didn't press strum on this same input tick
      hitNotes(!shouldStrum && shouldTap);
    }
  }

  function processComboUpdate(): void {
    const nextNotesInHitArea = guitar.getNotesInHitArea();
    if (lastNotesInHitArea) {
      // find all the notes that were in the hit area and aren't anymore
      const notes = lastNotesInHitArea.filter(
        (n) => !nextNotesInHitArea.includes(n)
      );
      for (const note of notes) {
        // check if any weren't zapped and drop the combo if so
        if (!guitar.isZapped(note)) {
          $activeCombo = 0;
          break;
        }
      }
    }
    lastNotesInHitArea = nextNotesInHitArea;
  }

  onMount(() => {
    inputManager = new InputManager();
    guitar = new CanvasGuitar(
      guitarContainer,
      guitarWidth,
      buttonDefs,
      buttonRadius,
      "ExpertSingle"
    );

    return () => {
      guitar.destroy();
      inputManager.destroy();
    };
  });

  $: if (activeSongPoint === 0 && guitar) {
    guitar.clearZappedNotes();
  }

  $: {
    if (typeof $activeSong === "object" && guitarContainer) {
      guitar.setChart($activeSong.chart);
    }
  }

  $: if (guitar) {
    guitar.update(activeSongPoint);
    inputManager.update();
    processInputs();
    processComboUpdate();
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

  <div
    class="absolute translate-y-1/2 bg-base-100 h-1 w-full left-0"
    style="bottom: {buttonRadius * 2}px"
  />

  {#each buttons as button, i}
    <div
      class="button"
      style="left: {getNoteX(
        i,
        guitarWidth / buttons.length
      )}px; width: {buttonRadius *
        2}px; background-color: {button.color}; bottom: {buttonRadius}px;"
    >
      <div
        class="button-center button-center"
        class:pressed={button.isDown}
        bind:this={buttons[i].buttonEl}
      />
    </div>
  {/each}
</div>

<style lang="postcss">
  .button-center {
    @apply bg-base-100 rounded-full w-2/3 aspect-square absolute;
    transition-property: all;
    transition-duration: 100ms;
    box-shadow: rgba(0, 0, 0, 0.5) 0px 10px 0px;
    transform: translateY(-10px);
  }

  .pressed {
    box-shadow: rgba(0, 0, 0, 0.5) 0px 0px 0px;
    transform: translateY(0px);
    @apply bg-base-300;
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
