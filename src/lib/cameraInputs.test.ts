import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync('src/components/meals/CameraButton.tsx', 'utf8');

function fileInputs(): string[] {
  return SOURCE.split('<input')
    .slice(1)
    .map((chunk) => chunk.slice(0, chunk.indexOf('/>')))
    .filter((chunk) => chunk.includes("type=\"file\""));
}

describe('the photo button', () => {
  it('offers two ways in, not one', () => {
    expect(fileInputs()).toHaveLength(2);
  });

  it('keeps one input pointed straight at the camera', () => {
    const camera = fileInputs().filter((input) => input.includes('capture='));
    expect(camera).toHaveLength(1);
    expect(camera[0]).toContain('capture="environment"');
  });

  it('leaves the other free of capture, so a phone offers the gallery', () => {
    const gallery = fileInputs().filter((input) => !input.includes('capture='));
    expect(gallery).toHaveLength(1);
    expect(gallery[0]).toContain('accept="image/*"');
  });
});
