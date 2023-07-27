import type { Bpm, TickEvent, Timed } from "./chart-parser";

const SECONDS_PER_MINUTE = 60;

export function disToTime(
  tickStart: number,
  tickEnd: number,
  resolution: number,
  bpm: number
) {
  return (((tickEnd - tickStart) / resolution) * SECONDS_PER_MINUTE) / bpm;
}

export function getTimedBpms(bpms: Bpm[], resolution: number): Timed<Bpm>[] {
  const result: Timed<Bpm>[] = [];
  let time = 0;
  let prevBpm = bpms[0];
  for (const ev of bpms) {
    time += disToTime(prevBpm.tick, ev.tick, resolution, prevBpm.bpm);
    result.push({
      ...ev,
      assignedTime: time,
    });
    prevBpm = ev;
  }

  return result;
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

export function findClosestPosition(tick: number, events: TickEvent[]): number {
  let lowerBound = 0;
  let upperBound = events.length - 1;
  let index = -1;

  let midPoint = -1;

  while (lowerBound <= upperBound) {
    midPoint = Math.floor((lowerBound + upperBound) / 2);
    index = midPoint;

    if (events[midPoint].tick == tick) {
      break;
    } else {
      if (events[midPoint].tick < tick) {
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
  tick: number,
  resolution: number,
  bpms: Timed<Bpm>[]
) {
  let previousBPMPos = findClosestPosition(tick, bpms);
  if (bpms[previousBPMPos].tick > tick) --previousBPMPos;

  const prevBPM = bpms[previousBPMPos];
  let time = prevBPM.assignedTime;
  time += disToTime(prevBPM.tick, tick, resolution, prevBPM.bpm);

  return time;
}

export function getTimedTrack<T extends TickEvent>(
  arr: T[],
  resolution: number,
  bpms: Timed<Bpm>[]
): Timed<T>[] {
  return arr.map((a) => ({
    ...a,
    assignedTime: tickToTime(a.tick, resolution, bpms),
  }));
}
