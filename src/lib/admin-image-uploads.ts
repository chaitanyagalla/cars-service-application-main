import { CAR_IMAGE_MAX_UPLOAD_BYTES } from './car-image';

export const MAX_GALLERY_PHOTOS = 15;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export function photoFileError(file: Pick<File, 'name' | 'size' | 'type'>) {
  if (!PHOTO_TYPES.includes(file.type)) return `${file.name}: choose a JPG, PNG or WebP photo.`;
  if (!file.size) return `${file.name}: this file is empty.`;
  if (file.size > CAR_IMAGE_MAX_UPLOAD_BYTES)
    return `${file.name}: choose a photo no larger than 3 MB.`;
  return null;
}
export class PhotoUploadError extends Error {
  constructor(
    message: string,
    public sessionExpired = false,
  ) {
    super(message);
  }
}
// Browsers infer file.type from the filename. Downloaded photos can have a different
// encoding, so send the detected image type instead of trusting the extension.
async function normalizeGalleryPhoto(file: File): Promise<File> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  let type: string;
  let extension: string;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    type = 'image/jpeg';
    extension = 'jpg';
  } else if (bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10') {
    type = 'image/png';
    extension = 'png';
  } else if (
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  ) {
    type = 'image/webp';
    extension = 'webp';
  } else {
    throw new PhotoUploadError(
      'This file is not a JPG, PNG or WebP image. Export it as one of these formats and try again.',
    );
  }
  return new File([file], `${file.name.replace(/\.[^.]+$/, '')}.${extension}`, {
    type,
    lastModified: file.lastModified,
  });
}
export async function uploadGalleryPhoto(file: File): Promise<string> {
  const invalid = photoFileError(file);
  if (invalid) throw new PhotoUploadError(invalid);
  const photo = await normalizeGalleryPhoto(file);
  const body = new FormData();
  body.append('file', photo);
  let response: Response;
  try {
    response = await fetch('/api/admin/uploads', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new PhotoUploadError('The upload could not finish. Check your connection and try again.');
  }
  if (response.status === 401)
    throw new PhotoUploadError('Your session has expired. Sign in again to upload photos.', true);
  if (!response.ok) {
    const messages: Record<number, string> = {
      413: 'Choose a photo no larger than 3 MB.',
      422: 'Choose a valid JPG, PNG or WebP photo.',
      429: 'You have uploaded many photos recently. Please try again later.',
      503: 'Photo uploads are temporarily unavailable. Please contact your website manager.',
    };
    throw new PhotoUploadError(
      messages[response.status] || 'This photo could not be uploaded. Please try again.',
    );
  }
  const data = await response.json().catch(() => null);
  if (typeof data?.url !== 'string' || !data.url.startsWith('https://res.cloudinary.com/'))
    throw new PhotoUploadError('The upload was not confirmed. Please try again.');
  return data.url;
}
export async function uploadGalleryBatch(
  files: File[],
  onUploaded: (urls: string[]) => void,
  onProgress: (processed: number) => void,
) {
  const urls: string[] = [];
  const errors: string[] = [];
  let sessionExpired = false;
  for (const [index, file] of files.entries()) {
    try {
      urls.push(await uploadGalleryPhoto(file));
      onUploaded([...urls]);
    } catch (error) {
      errors.push(
        `${file.name}: ${error instanceof Error ? error.message : 'Please try uploading this photo again.'}`,
      );
      sessionExpired = error instanceof PhotoUploadError && error.sessionExpired;
    }
    onProgress(index + 1);
    if (sessionExpired) break;
  }
  return { urls, errors, sessionExpired };
}
