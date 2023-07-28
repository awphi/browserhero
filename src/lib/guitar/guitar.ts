import type { Bpm, ParsedChart, TimeSignature, Timed } from "$lib/chart-parser";
import {
  findClosestPosition,
  getLastEvent,
  tickToTime,
} from "$lib/chart-utils";

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
    this.update(this._time);
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

  timeToY(time: number) {
    return this._canvas.height - time * this._speed + this._time * this._speed;
  }

  yToTime(y: number) {
    return this._canvas.height / this._speed + this._time - y / this._speed;
  }

  private draw() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const { _ctx, _time } = this;

    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = "white";
    _ctx.textBaseline = "top";
    _ctx.fillText(`${_time}`, 10, 10);

    this.drawFrets();
    this.drawSyncEvents();
  }

  private drawSyncEvents() {
    const { _ctx, _chart, _time } = this;
    const w = this._canvas.width;
    const endTime = this.yToTime(0) + 0.1;
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

  private drawFrets() {
    const { _ctx, _canvas, _chart } = this;
    const w = _canvas.width;
    const endTime = this.yToTime(0) + 0.1;
    const bpms = _chart.SyncTrack.bpms;

    _ctx.lineWidth = 5;
    _ctx.strokeStyle = "#191E24";

    for (let i = 0; i < bpms.length; i++) {
      const bpm = bpms[i];
      const nextBpm: Timed<Bpm> | undefined = bpms[i + 1];
      const ts = getLastEvent(
        bpm.assignedTime,
        this._chart.SyncTrack.timeSignatures,
        false
      );
      // we might need this for coloring properly
      const beatsPerBar = ts.numerator / ts.denominator / 0.25;
      const step = 60 / (ts.denominator / 2) / bpm.bpm;

      let time = bpm.assignedTime;
      let beat = 0;
      // TODO not sure if this is the right way to draw frets but will suffice for now
      while (time < endTime && (!nextBpm || time < nextBpm.assignedTime)) {
        if (beat % 2 === 0) {
          _ctx.strokeStyle = "rgba(25,30,36, 0.6)";
        } else {
          _ctx.strokeStyle = "rgba(25,30,36, 0.3)";
        }
        if (time > this._time) {
          const y = this.timeToY(time);
          _ctx.beginPath();
          _ctx.moveTo(0, y);
          _ctx.lineTo(w, y);
          _ctx.stroke();
        }
        time += step;
        beat++;
      }
    }
  }

  destroy() {
    this._parent.removeChild(this._canvas);
  }
}
