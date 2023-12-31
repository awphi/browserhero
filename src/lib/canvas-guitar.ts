import { browser, dev } from "$app/environment";
import type {
  ChartTrack,
  NoteEvent,
  ParsedChart,
  Timed,
} from "$lib/chart-parser";
import { findLastTickEvent, tickToTime, timeToTick } from "$lib/chart-utils";
import { getNoteX, type FretButtonDef } from "./guitar-utils";

const hopoColour = "#F8EFDD";
const baseSpeed = 1600;
const openNoteColour = "#76448A";
const base100Colour = browser
  ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue(
      "--b1"
    )})`
  : "black";

export class CanvasGuitar {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly parent: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly zappedNotes: Set<NoteEvent> = new Set();

  private speed: number = baseSpeed;
  private chart: ParsedChart | undefined;
  private track: ChartTrack | undefined;
  private time: number = 0;
  private tick: number = 0;
  private endTick: number = 0;
  // how many ticks beyond the extents of the canvas should we draw notes to ensure partially obscured notes are still drawn
  private noteDrawMargin: number = 0;
  private notesInHitArea: NoteEvent[] = [];

  constructor(
    parent: HTMLElement,
    private readonly guitarWidth: number,
    private readonly buttons: FretButtonDef[],
    private readonly buttonRadius: number,
    track?: ChartTrack
  ) {
    this.parent = parent;
    this.canvas = document.createElement("canvas");
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.ctx = this.canvas.getContext("2d")!;
    this.resizeObserver = new ResizeObserver(this.updateSize.bind(this));
    this.resizeObserver.observe(this.parent);
    this.setTrack(track);
    parent.appendChild(this.canvas);
    this.updateSize();
  }

  setChart(chart?: ParsedChart): void {
    this.chart = chart;
    this.update(this.time);
  }

  setTrack(track?: ChartTrack): void {
    this.track = track;
    this.update(this.time);
  }

  setSpeedMultiplier(multi: number): void {
    this.speed = baseSpeed * multi;
    this.update(this.time);
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
      this.yToTick(this.canvasHeight + this.buttonRadius, false) - this.tick
    );
    requestAnimationFrame(this.draw.bind(this));
  }

  timeToTick(seconds: number): number {
    if (!this.chart) {
      return 0;
    }

    return timeToTick(
      seconds,
      this.chart.Song.resolution,
      this.chart.SyncTrack.bpms
    );
  }

  tickToTime(tick: number): number {
    if (!this.chart) {
      return 0;
    }

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
    // nudge everything up by the offset of our buttons (the circumference of a button)
    return (
      this.canvasHeight -
      time * this.speed +
      this.time * this.speed -
      this.buttonRadius * 2
    );
  }

  yToTime(y: number, adjust: boolean = true): number {
    // adjust down by the offset of our buttons - the gap under the buttons should represent time in the past
    const adjustedY = adjust ? y + this.buttonRadius * 2 : y;
    return this.canvasHeight / this.speed + this.time - adjustedY / this.speed;
  }

  yToTick(y: number, adjust: boolean = true): number {
    return this.timeToTick(this.yToTime(y, adjust));
  }

  private get canvasWidth(): number {
    return this.canvas.width / devicePixelRatio;
  }

  private get canvasHeight(): number {
    return this.canvas.height / devicePixelRatio;
  }

  private draw() {
    window.devicePixelRatio = 2;
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawBeatLines();
    this.drawTrack();
    if (import.meta.env.DEV) {
      this.drawDebug();
    }
  }

  private drawNote(note: Timed<NoteEvent>, hitZoneY: number): void {
    const { ctx, notesInHitArea } = this;

    const y = this.timeToY(note.assignedTime);
    const stringOffset = this.guitarWidth / this.buttons.length;

    if (y <= this.canvasHeight && y >= hitZoneY) {
      notesInHitArea.push(note);
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
    const chartTrack = track && chart ? chart[track] : undefined;
    if (!chartTrack) {
      return;
    }

    const hitZoneY = this.getHitZoneLimitY();
    this.notesInHitArea = [];

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
    return this.canvas.height / devicePixelRatio - this.buttonRadius * 5;
  }

  getNotesInHitArea(): NoteEvent[] {
    return [...this.notesInHitArea];
  }

  private drawDebug(): void {
    const { ctx, chart, tick, endTick, time, track } = this;
    if (!chart) {
      return;
    }

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
        const text = `${ev.numerator} / ${ev.denominator}`;
        ctx.fillText(text, this.canvasWidth - 5, y);
      }
    }

    ctx.textAlign = "center";
    ctx.beginPath();
    const hitZoneY = this.getHitZoneLimitY();
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.rect(0, hitZoneY, this.canvasWidth, this.canvasHeight - hitZoneY);
    ctx.fill();
    ctx.fillStyle = "white";
    const text = `${track} - ${time.toFixed(2)}s - ${tick}t`;
    ctx.fillText(text, this.canvasWidth / 2, this.canvasHeight - 16);
  }

  // TODO add some way of hitting duration notes and changing their color whilst in that state
  zapNote(note: NoteEvent): void {
    this.zappedNotes.add(note);
  }

  clearZappedNotes(): void {
    this.zappedNotes.clear();
  }

  isZapped(note: NoteEvent): boolean {
    return this.zappedNotes.has(note);
  }

  private drawBeatLines(): void {
    const { ctx, chart } = this;

    if (!chart) {
      return;
    }

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
      if (y >= 0 && y <= this.canvasHeight) {
        // we draw beat lines on half-beats so we divide the denom by two
        if (lineIndex % beatsPerBar === 0) {
          // bar line
          ctx.strokeStyle = "rgba(25,30,36, 1)";
        } else {
          // even beat line
          ctx.strokeStyle = "rgba(25,30,36, 0.6)";
        }
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvasWidth, y);
        ctx.stroke();
      }

      ts = timeSignatures[findLastTickEvent(t, timeSignatures)];
      const newBeatsPerBar = ts.numerator / ts.denominator / 0.25;
      if (newBeatsPerBar !== beatsPerBar) {
        lineIndex = 0;
        beatsPerBar = newBeatsPerBar;
      }
      t += res;
      lineIndex++;
    }
  }

  destroy(): void {
    this.parent.removeChild(this.canvas);
    this.resizeObserver.disconnect();
  }
}
