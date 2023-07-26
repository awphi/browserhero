export const noteRadius = 40;

export function getNoteX(index: number, stringOffset: number): number {
  return (index + 0.5) * stringOffset;
}
