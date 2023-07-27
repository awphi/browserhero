import { Chart } from "chart2json";
import {
  timeBpms,
  type TimedBpm,
  tickToTime,
  type TimedTickEvent,
  getSyncEventsArray,
  type TimedTS,
} from "./guitar-utils";

type NoteTrack =
  | Chart.InstrumentTracks[keyof Chart.InstrumentTracks]
  | undefined;

export class Guitar {
  private readonly _speed: number = 340;

  private readonly _track: NoteTrack | undefined;
  private readonly _chart: Chart.Chart;
  private readonly _canvas: HTMLCanvasElement;
  private readonly _ctx: CanvasRenderingContext2D;
  private readonly _parent: HTMLElement;

  private readonly _bpms: TimedBpm[];
  private readonly _timeSignatures: TimedTS[];
  private _time: number = 0;

  constructor(
    parent: HTMLElement,
    chart: Chart.Chart,
    difficulty: Chart.Difficulty | undefined,
    track: Chart.Instrument | undefined
  ) {
    this._parent = parent;
    this._canvas = document.createElement("canvas");
    this._canvas.style.width = "100%";
    this._canvas.style.height = "100%";
    this._ctx = this._canvas.getContext("2d")!;
    parent.appendChild(this._canvas);
    this.setSize(this._canvas, this._ctx);

    this._chart = chart;
    if (difficulty && track) {
      this._track = chart.difficulties[difficulty]?.[track];
    }

    this._bpms = timeBpms(chart.syncTrack, chart.song.resolution);
    this._timeSignatures = getSyncEventsArray(chart.syncTrack)
      .filter((a) => a.kind === Chart.SyncTrackEventType.TIME_SIGNATURE)
      .map((ev) => ({
        ...ev,
        assignedTime: tickToTime(
          ev.tick,
          this._chart.song.resolution,
          this._bpms
        ),
      })) as TimedTS[];
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

  private draw() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const { _ctx, _time } = this;
    _ctx.clearRect(0, 0, w, h);

    _ctx.fillStyle = "white";
    _ctx.textBaseline = "top";
    _ctx.fillText(`${_time}`, 10, 10);
    _ctx.strokeStyle = "red";
    _ctx.textBaseline = "middle";
    _ctx.textAlign = "left";

    for (const bpm of this._bpms) {
      const y = this.timeToY(bpm.assignedTime);
      _ctx.beginPath();
      _ctx.moveTo(0, y);
      _ctx.lineTo(w / 2, y);
      _ctx.stroke();
      _ctx.fillText(`${bpm.bpm}bpm`, 0, y);
    }

    _ctx.strokeStyle = "orange";
    _ctx.textAlign = "right";
    for (const ts of this._timeSignatures) {
      const y = this.timeToY(ts.assignedTime);
      _ctx.beginPath();
      _ctx.moveTo(w / 2, y);
      _ctx.lineTo(w, y);
      _ctx.stroke();
      _ctx.fillText(
        `${ts.signature.numerator} / ${ts.signature.denominator}`,
        w,
        y
      );
    }
  }

  destroy() {
    this._parent.removeChild(this._canvas);
  }
}
