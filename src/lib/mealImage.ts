export const FULL_MAX_EDGE = 800;
export const THUMB_MAX_EDGE = 200;

const WEBP_QUALITY = 0.82;

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

async function drawTo(bitmap: ImageBitmap, maxEdge: number): Promise<Blob> {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/webp', WEBP_QUALITY);
  });
}

export async function resizeToPair(
  file: File,
): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await createImageBitmap(file);
  const [full, thumb] = await Promise.all([
    drawTo(bitmap, FULL_MAX_EDGE),
    drawTo(bitmap, THUMB_MAX_EDGE),
  ]);
  bitmap.close();
  return { full, thumb };
}
