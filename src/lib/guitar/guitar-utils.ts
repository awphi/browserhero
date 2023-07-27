import { Chart } from "chart2json";

const SECONDS_PER_MINUTE = 60;

export const buttonRadius = 40;
export const buttonOffset = 20;

export interface TickEvent {
  tick: number;
}

export interface TimedTickEvent extends TickEvent {
  assignedTime: number;
}

export type TimedTS = TimedTickEvent & Chart.TimeSignature;
export type TimedBpm = TimedTickEvent & Chart.Bpm;

export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}

// see https://github.com/FireFox2000000/Moonscraper-Chart-Editor/blob/e93654829af2dd28a83285b30166df55cc088e98/Moonscraper%20Chart%20Editor/Assets/Scripts/Game/Charts/TickFunctions.cs#L20
export function disToTime(
  tickStart: number,
  tickEnd: number,
  resolution: number,
  bpm: number
) {
  return (((tickEnd - tickStart) / resolution) * SECONDS_PER_MINUTE) / bpm;
}

export function timeToDis(
  timeStart: number,
  timeEnd: number,
  resolution: number,
  bpm: number
) {
  return Math.round(
    (((timeEnd - timeStart) * bpm) / SECONDS_PER_MINUTE) * resolution
  );
}

export function findClosestPosition(
  position: number,
  ticks: TimedTickEvent[]
): number {
  let lowerBound = 0;
  let upperBound = ticks.length - 1;
  let index = -1;

  let midPoint = -1;

  while (lowerBound <= upperBound) {
    midPoint = Math.floor((lowerBound + upperBound) / 2);
    index = midPoint;

    if (ticks[midPoint].tick == position) {
      break;
    } else {
      if (ticks[midPoint].tick < position) {
        // data is in upper half
        lowerBound = midPoint + 1;
      } else {
        // data is in lower half
        upperBound = midPoint - 1;
      }
    }
  }

  return index;
}

export function tickToTime(
  position: number,
  resolution: number,
  bpms: TimedBpm[]
) {
  let previousBPMPos = findClosestPosition(position, bpms);
  if (bpms[previousBPMPos].tick > position) --previousBPMPos;

  const prevBPM = bpms[previousBPMPos];
  let time = prevBPM.assignedTime;
  time += disToTime(prevBPM.tick, position, resolution, prevBPM.bpm);

  return time;
}

export function timeBpms(
  syncTrack: Chart.SyncTrackSection,
  resolution: number
): TimedBpm[] {
  const events = getSyncEventsArray(syncTrack).filter(
    (a) => a.kind === Chart.SyncTrackEventType.BPM
  ) as (TickEvent & Chart.Bpm)[];
  const result: TimedBpm[] = [];
  let time = 0;
  let prevBpm = events[0];
  for (const ev of events) {
    if (ev.kind === Chart.SyncTrackEventType.BPM) {
      time += disToTime(prevBpm.tick, ev.tick, resolution, prevBpm.bpm);
      result.push({
        ...ev,
        assignedTime: time,
      });
      prevBpm = ev;
    }
  }

  return result;
}

export function getSyncEventsArray(
  syncTrack: Chart.SyncTrackSection
): (TickEvent & Chart.SyncTrackEvent)[] {
  const entries: [string, Chart.Tick<Chart.SyncTrackEvent>][] =
    Object.entries(syncTrack);
  return entries
    .map(([tickStr, evs]) => {
      const tick = Number.parseInt(tickStr);
      return evs.map((ev) => ({ ...ev, tick }));
    })
    .filter((a) => a !== undefined)
    .flat();
}

export function timeToTick(time: number, resolution: number, bpms: TimedBpm[]) {
  if (time < 0) time = 0;

  let position = 0;

  let prevBPM = bpms[0];

  // Search for the last bpm
  for (let i = 0; i < bpms.length; ++i) {
    const bpmInfo = bpms[i];
    if (bpmInfo.assignedTime >= time) break;
    else prevBPM = bpmInfo;
  }

  position = prevBPM.tick;
  position += timeToDis(prevBPM.assignedTime, time, resolution, prevBPM.bpm);

  return position;
}
