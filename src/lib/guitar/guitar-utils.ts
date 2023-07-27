export const buttonRadius = 40;
export const buttonOffset = 20;

export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}
