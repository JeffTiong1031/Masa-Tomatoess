export const NOTE_SELECTION_FILL = 'Highlight';

export function noteSelectionCoversLine(
  startIndex: number,
  endIndex: number,
  lineIndex: number,
): boolean {
  return (
    startIndex !== endIndex &&
    lineIndex >= startIndex &&
    lineIndex <= endIndex
  );
}
