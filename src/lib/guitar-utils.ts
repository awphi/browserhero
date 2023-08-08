export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}

export interface ButtonDef {
  color: string;
}

export interface Button extends ButtonDef {
  isDown: boolean;
}

export const buttonDefs: ButtonDef[] = [
  {
    color: "rgb(35,155,86)",
  },
  {
    color: "rgb(231,76,60)",
  },
  {
    color: "rgb(244,208,63)",
  },
  {
    color: "rgb(52,152,219)",
  },
  {
    color: "rgb(220,118,51)",
  },
];
