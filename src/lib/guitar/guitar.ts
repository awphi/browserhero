import type { ParsedChart } from "$lib/chart-parser";

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
    this.update(this._time);
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

    this.drawSyncEvents();
  }

  private drawSyncEvents() {
    const { _ctx, _chart, _time } = this;
    const w = this._canvas.width;
    const endTime = this.yToTime(0) + 0.1;
    _ctx.textBaseline = "middle";
    for (const ev of _chart.syncTrack.allEvents) {
      if (ev.assignedTime < _time) {
        continue;
      } else if (ev.assignedTime > endTime) {
        break;
      }

      const y = this.timeToY(ev.assignedTime);
      _ctx.beginPath();
      if ("bpm" in ev) {
        _ctx.strokeStyle = "red";
        _ctx.textAlign = "left";
        _ctx.moveTo(0, y);
        _ctx.lineTo(w / 2, y);
        _ctx.stroke();
        _ctx.fillText(`${ev.bpm}bpm`, 0, y);
      } else {
        _ctx.strokeStyle = "orange";
        _ctx.textAlign = "right";
        _ctx.moveTo(w / 2, y);
        _ctx.lineTo(w, y);
        _ctx.stroke();
        const text = `${ev.numerator} / ${ev.denominator}`;
        _ctx.fillText(`${text}bpm`, 0, y);
      }
    }
  }

  destroy() {
    this._parent.removeChild(this._canvas);
  }
}
