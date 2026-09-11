export function nextIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index + 1) % length;
}

export function prevIndex(index: number, length: number): number {
  if (length === 0) return 0;
  return (index - 1 + length) % length;
}
