import { browser } from "$app/environment";
import type {
  ChartTrack,
  NoteEvent,
  ParsedChart,
  Timed,
} from "$lib/chart-parser";
import { findLastTickEvent, tickToTime, timeToTick } from "$lib/chart-utils";
import { getNoteX, type ButtonDef } from "./guitar-utils";

const hopoColour = "#F8EFDD";
const openNoteColour = "#76448A";
const base100Colour = browser
  ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue(
      "--b1"
    )})`
  : "black";

export class CanvasGuitar {
  private readonly speed: number = 900;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly parent: HTMLElement;
  private readonly resizeObserver: ResizeObserver;

  private track: ChartTrack | undefined;
  private time: number = 0;
  private tick: number = 0;
  private endTick: number = 0;

  constructor(
    parent: HTMLElement,
    private readonly chart: ParsedChart,
    private readonly guitarWidth: number,
    private readonly buttons: ButtonDef[],
    private readonly buttonRadius: number,
    private readonly buttonOffset: number,
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

  private updateSize() {
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

  update(seconds: number) {
    this.time = seconds;
    this.tick = this.timeToTick(seconds);
    this.endTick = this.yToTick(0);
    requestAnimationFrame(this.draw.bind(this));
  }

  timeToTick(seconds: number) {
    return timeToTick(
      seconds,
      this.chart.Song.resolution,
      this.chart.SyncTrack.bpms
    );
  }

  tickToTime(tick: number) {
    return tickToTime(
      tick,
      this.chart.Song.resolution,
      this.chart.SyncTrack.bpms
    );
  }

  tickToY(tick: number) {
    return this.timeToY(this.tickToTime(tick));
  }

  timeToY(time: number) {
    const hmod = this.canvas.height / devicePixelRatio;
    return hmod - time * this.speed + this.time * this.speed;
  }

  yToTime(y: number) {
    const hmod = this.canvas.height / devicePixelRatio;
    return hmod / this.speed + this.time - y / this.speed;
  }

  yToTick(y: number) {
    return this.timeToTick(this.yToTime(y));
  }

  private draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const { ctx: _ctx, time: _time } = this;

    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = "white";
    _ctx.textBaseline = "top";
    _ctx.fillText(`${_time}`, 10, 10);

    this.drawBeatLines();
    //this.drawSyncEvents();
    this.drawTrack();
  }

  private drawNote(note: Timed<NoteEvent>): void {
    const { ctx } = this;

    const y = this.timeToY(note.assignedTime);
    const stringOffset = this.guitarWidth / this.buttons.length;

    ctx.strokeStyle = base100Colour;
    ctx.lineCap = "round";
    ctx.lineWidth = 4;

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
    const { chart, track, tick, endTick } = this;
    const chartTrack = track ? chart[track] : undefined;
    if (!chartTrack) {
      return;
    }

    for (const playEvent of chartTrack) {
      const eventEnd =
        playEvent.type === "note"
          ? playEvent.tick + playEvent.duration
          : playEvent.tick;
      if (eventEnd < tick) {
        continue;
      } else if (playEvent.tick > endTick) {
        break;
      }

      if (playEvent.type === "note") {
        this.drawNote(playEvent);
      }
    }
  }

  private drawSyncEvents() {
    const { ctx, chart, tick, endTick } = this;
    const w = this.canvas.width;
    ctx.textBaseline = "middle";
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
  }

  private drawBeatLines() {
    const { ctx, canvas, chart } = this;
    const w = canvas.width;
    const h = canvas.height;
    const res = chart.Song.resolution;
    const startTick = 0;
    const { timeSignatures } = chart.SyncTrack;

    ctx.lineWidth = 5;

    let t = startTick;
    let lineIndex = 0;
    let ts = findLastTickEvent(startTick, timeSignatures);
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

      ts = findLastTickEvent(t, timeSignatures);
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

  destroy() {
    this.parent.removeChild(this.canvas);
    this.resizeObserver.disconnect();
  }
}
