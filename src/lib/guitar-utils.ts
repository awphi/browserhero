import type { ChartTrack } from "$lib/chart-parser";

export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}

export interface ButtonDef {
  color: string;
  tapColor: string;
}
