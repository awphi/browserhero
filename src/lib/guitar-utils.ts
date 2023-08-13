export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}

export interface FretButtonDef {
  color: string;
  name: string;
}

export interface FretButton extends FretButtonDef {
  isDown: boolean;
  buttonEl?: HTMLDivElement;
}

export const buttonDefs: FretButtonDef[] = [
  {
    color: "rgb(35,155,86)",
    name: "Green Fret",
  },
  {
    color: "rgb(231,76,60)",
    name: "Red Fret",
  },
  {
    color: "rgb(244,208,63)",
    name: "Yellow Fret",
  },
  {
    color: "rgb(52,152,219)",
    name: "Blue Fret",
  },
  {
    color: "rgb(220,118,51)",
    name: "Orange Fret",
  },
];
