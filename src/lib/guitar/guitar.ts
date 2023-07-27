import type { Chart } from "chart2json";
import { timeBpms } from "./guitar-utils";

type NoteTrack =
  | Chart.InstrumentTracks[keyof Chart.InstrumentTracks]
  | undefined;

export class Guitar {
  private _track: NoteTrack | undefined;
  private _chart: Chart.Chart;
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _parent: HTMLElement;

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

    console.log(timeBpms(chart.syncTrack, chart.song.resolution));

    /*     Object.keys(this._track!).forEach((tick) => {
      console.log(tick);
    }); */
  }

  private setSize(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D
  ) {
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const { width: compWidth, height: compHeight } =
      window.getComputedStyle(canvas);

    const widthDiff = Math.round(canvas.clientWidth - oldWidth);
    const heightDiff = Math.round(canvas.clientHeight - oldHeight);

    const newWidth = Number.parseFloat(compWidth) - widthDiff;
    const newHeight = Number.parseFloat(compHeight) - heightDiff;

    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(dpr * newWidth);
    canvas.height = Math.round(dpr * newHeight);
    context.scale(dpr, dpr);
  }

  updateTime(seconds: number) {}

  draw() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    this._ctx.clearRect(0, 0, w, h);

    // TODO
  }

  destroy() {
    this._parent.removeChild(this._canvas);
  }
}
