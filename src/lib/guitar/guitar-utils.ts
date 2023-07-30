export const buttonRadius = 55;
export const buttonOffset = 20;

export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}
