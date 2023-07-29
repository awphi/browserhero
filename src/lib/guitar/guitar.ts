import type { Bpm, ParsedChart, TimeSignature, Timed } from "$lib/chart-parser";
import {
  findClosestPosition,
  findLastTickEvent,
  tickToTime,
  timeToTick,
} from "$lib/chart-utils";
import { roundNearest } from "$lib/util";

export class Guitar {
  private readonly _speed: number = 340;

  //private readonly _track: NoteTrack | undefined;
  private readonly _chart: ParsedChart;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _parent: HTMLElement;

  private _time: number = 0;

  constructor(parent: HTMLElement, chart: ParsedChart) {
    this._parent = parent;
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._ctx = this._canvas.getContext("2d")!;
    parent.appendChild(this._canvas);
    this.setSize(this._canvas, this._ctx);
    this._chart = chart;
  }

  private setSize(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) {
    const { width, height } = window.getComputedStyle(canvas);
    const newWidth = Number.parseFloat(width);
    const newHeight = Number.parseFloat(height);

    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(dpr * newWidth);
    canvas.height = Math.round(dpr * newHeight);
    context.scale(dpr, dpr);
  }

  update(seconds: number) {
    this._time = seconds;
    requestAnimationFrame(this.draw.bind(this));
  }

  timeToTick(seconds: number) {
    return timeToTick(
      seconds,
      this._chart.Song.resolution,
      this._chart.SyncTrack.bpms
    );
  }

  tickToTime(tick: number) {
    return tickToTime(
      tick,
      this._chart.Song.resolution,
      this._chart.SyncTrack.bpms
    );
  }

  tickToY(tick: number) {
    return this.timeToY(this.tickToTime(tick));
  }

  timeToY(time: number) {
    return this._canvas.height - time * this._speed + this._time * this._speed;
  }

  yToTime(y: number) {
    return this._canvas.height / this._speed + this._time - y / this._speed;
  }

  yToTick(y: number) {
    return this.timeToTick(this.yToTime(y));
  }

  private draw() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const { _ctx, _time } = this;

    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = "white";
    _ctx.textBaseline = "top";
    _ctx.fillText(`${_time}`, 10, 10);

    this.drawBeatLines();
    this.drawSyncEvents();
  }

  private drawSyncEvents() {
    const { _ctx, _chart, _time } = this;
    const w = this._canvas.width;
    const endTime = this.yToTime(-100);
    _ctx.textBaseline = "middle";
    for (const ev of _chart.SyncTrack.allEvents) {
      if (ev.assignedTime < _time) {
        continue;
      } else if (ev.assignedTime > endTime) {
        break;
      }

      const y = this.timeToY(ev.assignedTime);
      _ctx.beginPath();
      if ("bpm" in ev) {
        _ctx.textAlign = "left";
        _ctx.fillText(`${ev.bpm}bpm`, 5, y);
      } else {
        _ctx.textAlign = "right";
        _ctx.fillText(`${ev.numerator} / ${ev.denominator}`, w - 5, y);
      }
    }
  }

  private drawBeatLines() {
    const { _ctx, _canvas, _chart } = this;
    const w = _canvas.width;
    const h = _canvas.height;
    const res = _chart.Song.resolution;
    const endTick = this.yToTick(-100);
    const startTick = 0;
    const { timeSignatures } = _chart.SyncTrack;

    _ctx.lineWidth = 5;

    let t = startTick;
    let lineIndex = 0;
    let ts = findLastTickEvent(startTick, timeSignatures);
    let beatsPerBar = ts.numerator / ts.denominator / 0.25;

    while (t <= endTick) {
      const y = this.tickToY(t);
      if (y >= 0 && y <= h) {
        // we draw beat lines on half-beats so we divide the denom by two
        const barLineMultiple = beatsPerBar * (ts.denominator / 2);
        if (lineIndex % barLineMultiple === 0) {
          // bar line
          _ctx.strokeStyle = "rgba(25,30,36, 1)";
        } else if (lineIndex % 2 === 0) {
          // even beat line
          _ctx.strokeStyle = "rgba(25,30,36, 0.6)";
        } else {
          // odd beat line
          _ctx.strokeStyle = "rgba(25,30,36, 0.3)";
        }
        _ctx.beginPath();
        _ctx.moveTo(0, y);
        _ctx.lineTo(w, y);
        _ctx.stroke();
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
    this._parent.removeChild(this._canvas);
  }
}
