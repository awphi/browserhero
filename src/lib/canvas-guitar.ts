import { browser } from "$app/environment";
import type {
  ChartTrack,
  NoteEvent,
  ParsedChart,
  Timed,
} from "$lib/chart-parser";
import {
  disToTime,
  findLastTickEvent,
  tickToTime,
  timeToTick,
} from "$lib/chart-utils";
import { getNoteX, type ButtonDef } from "./guitar-utils";

const hopoColour = "#F8EFDD";
const openNoteColour = "#76448A";
const base100Colour = browser
  ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue(
      "--b1"
    )})`
  : "black";

export class CanvasGuitar {
  private readonly speed: number = 1600;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly parent: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly zappedNotes: Set<NoteEvent> = new Set();

  private track: ChartTrack | undefined;
  private time: number = 0;
  private tick: number = 0;
  private endTick: number = 0;
  // how many ticks beyond the extents of the canvas should we draw notes to ensure partially obscured notes are still drawn
  private noteDrawMargin: number = 0;
  private notesInHitZone: NoteEvent[] = [];

  constructor(
    parent: HTMLElement,
    private readonly chart: ParsedChart,
    private readonly guitarWidth: number,
    private readonly buttons: ButtonDef[],
    private readonly buttonRadius: number,
    track?: ChartTrack
  ) {
    this.parent = parent;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx = this.canvas.getContext("2d")!;
    this.chart = chart;
    this.resizeObserver = new ResizeObserver(this.updateSize.bind(this));
    this.resizeObserver.observe(this.parent);
    this.setTrack(track);
    parent.appendChild(this.canvas);
    this.updateSize();
  }

  setTrack(track?: ChartTrack): void {
    this.track = track;
  }

  isOnComboWith(lastHitNoteTick: number): boolean {
    const hopoThreshold = (65 / 192) * this.chart.Song.resolution;
    return lastHitNoteTick - hopoThreshold <= this.tick;
  }

  private updateSize(): void {
    const { canvas, ctx } = this;
    const { width, height } = window.getComputedStyle(canvas);
    const newWidth = Number.parseFloat(width);
    const newHeight = Number.parseFloat(height);

    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(dpr * newWidth);
    canvas.height = Math.round(dpr * newHeight);
    ctx.scale(dpr, dpr);
    this.draw();
  }

  update(seconds: number): void {
    this.time = seconds;
    this.tick = this.timeToTick(seconds);
    this.endTick = this.yToTick(0);
    // this calculate may not be necessary every update
    // - could maybe compute a static value for the chart based on its highest bpm and its resolution
    this.noteDrawMargin = Math.max(
      this.yToTick(-this.buttonRadius, false) - this.endTick,
      this.yToTick(this.canvas.height + this.buttonRadius, false) - this.tick
    );
    requestAnimationFrame(this.draw.bind(this));
  }

  timeToTick(seconds: number): number {
    return timeToTick(
      seconds,
      this.chart.Song.resolution,
      this.chart.SyncTrack.bpms
    );
  }

  tickToTime(tick: number): number {
    return tickToTime(
      tick,
      this.chart.Song.resolution,
      this.chart.SyncTrack.bpms
    );
  }

  tickToY(tick: number): number {
    return this.timeToY(this.tickToTime(tick));
  }

  timeToY(time: number): number {
    const hmod = this.canvas.height / devicePixelRatio;
    // nudge everything up by the offset of our buttons (the circumference of a button)
    return (
      hmod - time * this.speed + this.time * this.speed - this.buttonRadius * 2
    );
  }

  yToTime(y: number, adjust: boolean = true): number {
    const hmod = this.canvas.height / devicePixelRatio;
    // adjust down by the offset of our buttons - the gap under the buttons should represent time in the past
    const adjustedY = adjust ? y + this.buttonRadius * 2 : y;
    return hmod / this.speed + this.time - adjustedY / this.speed;
  }

  yToTick(y: number, adjust: boolean = true): number {
    return this.timeToTick(this.yToTime(y, adjust));
  }

  private draw() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBeatLines();
    this.drawTrack();
    this.drawDebug();
  }

  private drawNote(note: Timed<NoteEvent>, hitZoneY: number): void {
    const { ctx, canvas, notesInHitZone } = this;

    const y = this.timeToY(note.assignedTime);
    const stringOffset = this.guitarWidth / this.buttons.length;

    if (y <= canvas.height && y >= hitZoneY) {
      notesInHitZone.push(note);
    }

    ctx.strokeStyle = base100Colour;
    ctx.lineCap = "round";
    ctx.lineWidth = 4;
    ctx.setLineDash([]);

    // open note
    if (note.note === 7) {
      const x1 = getNoteX(0, stringOffset) - this.buttonRadius + 8;
      const x2 = getNoteX(4, stringOffset) + this.buttonRadius - 8;
      const openNoteHeight = this.buttonRadius / 2;
      ctx.fillStyle = note.isHOPO ? hopoColour : openNoteColour;
      ctx.beginPath();
      ctx.roundRect(
        x1,
        y - openNoteHeight,
        x2 - x1,
        openNoteHeight * 2,
        Number.MAX_SAFE_INTEGER
      );
      ctx.fill();
      ctx.stroke();
    } else {
      const button = this.buttons[note.note];
      const x = getNoteX(note.note, stringOffset);

      if (note.duration > 0) {
        const durationWidth = 16;
        const yEnd = this.tickToY(note.tick + note.duration);
        ctx.strokeStyle = base100Colour;
        ctx.fillStyle = button.color;
        ctx.beginPath();
        ctx.roundRect(
          x - durationWidth / 2,
          yEnd,
          durationWidth,
          y - yEnd,
          Number.MAX_SAFE_INTEGER
        );
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = button.color;
      ctx.beginPath();
      ctx.arc(x, y, this.buttonRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = note.isHOPO ? hopoColour : base100Colour;
      ctx.beginPath();
      ctx.arc(x, y, (this.buttonRadius * 2) / 3 - 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();

      if (note.tap) {
        ctx.strokeStyle = hopoColour;
        ctx.beginPath();
        ctx.arc(x, y, (this.buttonRadius * 2) / 3 - 8, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }

  private drawTrack(): void {
    const { chart, track, tick, endTick, zappedNotes, noteDrawMargin } = this;
    const chartTrack = track ? chart[track] : undefined;
    if (!chartTrack) {
      return;
    }

    const hitZoneY = this.getHitZoneLimitY();
    this.notesInHitZone = [];

    for (const playEvent of chartTrack) {
      const eventEnd =
        playEvent.type === "note"
          ? playEvent.tick + playEvent.duration
          : playEvent.tick;
      if (eventEnd < tick - noteDrawMargin) {
        continue;
      } else if (playEvent.tick > endTick + noteDrawMargin) {
        break;
      }

      if (playEvent.type === "note" && !zappedNotes.has(playEvent)) {
        this.drawNote(playEvent, hitZoneY);
      }
    }
  }

  private getHitZoneLimitY(): number {
    return this.canvas.height - this.buttonRadius * 4;
  }

  getNotesInHitArea(): NoteEvent[] {
    return [...this.notesInHitZone];
  }

  private drawDebug(): void {
    const { ctx, chart, tick, endTick, time } = this;
    const w = this.canvas.width;

    ctx.font = "30px monospace";
    ctx.fillStyle = "white";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "white";

    // draw sync
    for (const ev of chart.SyncTrack.allEvents) {
      if (ev.tick < tick) {
        continue;
      } else if (ev.tick > endTick) {
        break;
      }

      const y = this.timeToY(ev.assignedTime);
      ctx.beginPath();
      if (ev.type === "bpm") {
        ctx.textAlign = "left";
        ctx.fillText(`${ev.bpm}bpm`, 5, y);
      } else {
        ctx.textAlign = "right";
        ctx.fillText(`${ev.numerator} / ${ev.denominator}`, w - 5, y);
      }
    }

    ctx.textAlign = "center";
    ctx.setLineDash([w / 100, w / 50]);
    ctx.beginPath();
    const hitZoneY = this.getHitZoneLimitY();
    ctx.moveTo(0, hitZoneY);
    ctx.lineTo(w, hitZoneY);
    ctx.stroke();
    ctx.fillText(`${time.toFixed(2)}s - ${tick}t`, w / 2, hitZoneY + 28);
  }

  // TODO add some way of hitting duration notes and changing their color whilst in that state
  zapNote(note: NoteEvent): void {
    this.zappedNotes.add(note);
  }

  clearZappedNotes(): void {
    this.zappedNotes.clear();
  }

  private drawBeatLines(): void {
    const { ctx, canvas, chart } = this;
    const w = canvas.width;
    const h = canvas.height;
    const res = chart.Song.resolution;
    const startTick = 0;
    const { timeSignatures } = chart.SyncTrack;

    ctx.setLineDash([]);
    ctx.lineWidth = 5;

    let t = startTick;
    let lineIndex = 0;
    let ts = timeSignatures[findLastTickEvent(startTick, timeSignatures)];
    let beatsPerBar = ts.numerator / ts.denominator / 0.25;

    while (t <= this.endTick) {
      const y = this.tickToY(t);
      if (y >= 0 && y <= h) {
        // we draw beat lines on half-beats so we divide the denom by two
        const barLineMultiple = beatsPerBar * (ts.denominator / 2);
        if (lineIndex % barLineMultiple === 0) {
          // bar line
          ctx.strokeStyle = "rgba(25,30,36, 1)";
        } else if (lineIndex % 2 === 0) {
          // even beat line
          ctx.strokeStyle = "rgba(25,30,36, 0.6)";
        } else {
          // odd beat line
          ctx.strokeStyle = "rgba(25,30,36, 0.3)";
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ts = timeSignatures[findLastTickEvent(t, timeSignatures)];
      const newBeatsPerBar = ts.numerator / ts.denominator / 0.25;
      if (newBeatsPerBar !== beatsPerBar) {
        lineIndex = 0;
        beatsPerBar = newBeatsPerBar;
      }
      const stepDivisor = ts.denominator / 2;
      t += res / stepDivisor;
      lineIndex++;
    }
  }

  destroy(): void {
    this.parent.removeChild(this.canvas);
    this.resizeObserver.disconnect();
  }
}
