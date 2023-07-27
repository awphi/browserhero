import { Chart } from "chart2json";

export const noteRadius = 40;
const SECONDS_PER_MINUTE = 60;

// helpful interface to merge with chart2json interfaces once we've assigned a time to them
export interface TimedTickEvent {
  tick: number;
  assignedTime: number;
}

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

export function findClosestPosition(
  position: number,
  ticks: TimedTickEvent[]
): number {
  let lowerBound = 0;
  let upperBound = ticks.length - 1;
  let index = -1;

  let midPoint = -1;

  while (lowerBound <= upperBound) {
    midPoint = (lowerBound + upperBound) / 2;
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
  const entries: [string, Chart.Tick<Chart.SyncTrackEvent>][] =
    Object.entries(syncTrack);
  const result: TimedBpm[] = [];
  let time = 0;
  let prevBpm: number = -1;
  let prevBpmTick: number = 0;
  for (const [tickStr, events] of entries) {
    const tick = Number.parseInt(tickStr);
    for (const ev of events) {
      if (ev.kind === Chart.SyncTrackEventType.BPM) {
        // used to set the initial bpm
        if (prevBpm === -1) {
          prevBpm = ev.bpm;
          prevBpmTick = tick;
        }
        time += disToTime(prevBpmTick, tick, resolution, prevBpm);
        result.push({
          ...ev,
          assignedTime: time,
          tick,
        });
        prevBpm = ev.bpm;
        prevBpmTick = tick;
        // break after the first bpm in a tick - we don't support multiple bpm updates in a single tick
        break;
      }
    }
  }

  return result;
}
