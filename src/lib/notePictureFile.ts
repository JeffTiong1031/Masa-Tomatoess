import { fitWithin, toBase64 } from './mealImage';
import { NOTE_PIC_MAX_EDGE } from './notePicture';

const WEBP_QUALITY = 0.82;

export async function shrinkNotePicture(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(
    bitmap.width,
    bitmap.height,
    NOTE_PIC_MAX_EDGE,
  );
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((next) => resolve(next!), 'image/webp', WEBP_QUALITY);
  });
  return `data:image/webp;base64,${toBase64(await blob.arrayBuffer())}`;
}
