import type { Difficulty, Instrument } from "./chart-parser";

export interface UserSettings {
  difficulty: Difficulty;
  instrument: Instrument;
  speed: number;
}
