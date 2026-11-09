import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  photoFileError,
  uploadGalleryBatch,
  uploadGalleryPhoto,
} from '../src/lib/admin-image-uploads';
import { CAR_IMAGE_MAX_UPLOAD_BYTES } from '../src/lib/car-image';

const security = vi.hoisted(() => ({
  currentAdmin: vi.fn(),
  sameOrigin: vi.fn(),
  consumeRateLimit: vi.fn(),
}));
vi.mock('@/lib/security', () => ({
  ...security,
  jsonError: (error: string, status = 400) => Response.json({ error }, { status }),
}));
import { POST } from '../src/app/api/admin/uploads/route';

const fetchMock = vi.fn<typeof fetch>();
const photo = (name = 'car.jpg') =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], name, { type: 'image/jpeg' });
const url = (name: string) => `https://res.cloudinary.com/test/image/upload/${name}.jpg`;
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  security.currentAdmin.mockResolvedValue({ id: 'admin' });
  security.sameOrigin.mockReturnValue(true);
  security.consumeRateLimit.mockResolvedValue(true);
  vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'test-cloud');
  vi.stubEnv('CLOUDINARY_API_KEY', 'test-key');
  vi.stubEnv('CLOUDINARY_API_SECRET', 'test-secret');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('gallery upload using the existing upload endpoint', () => {
  it('uploads a batch of incorrectly named photos using their actual image types', async () => {
    const files = [
      new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'interior.jpg', {
        type: 'image/jpeg',
      }),
      new File(['RIFF0000WEBP'], 'rear.jpg', { type: 'image/jpeg' }),
      new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'front.png', {
        type: 'image/png',
      }),
    ];
    // Reproduce the failure when the original files are sent directly.
    for (const file of files) {
      const body = new FormData();
      body.append('file', file);
      const response = await POST(
        new Request('http://localhost:3000/api/admin/uploads', { method: 'POST', body }),
      );
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        error: 'Image file signature does not match its type',
      });
    }
    expect(fetchMock).not.toHaveBeenCalled();
    const uploadedTypes: string[] = [];
    fetchMock.mockImplementation(async (input, options) => {
      if (input === '/api/admin/uploads')
        return POST(new Request('http://localhost:3000/api/admin/uploads', options));
      const file = (options?.body as FormData).get('file') as File;
      const source = files[uploadedTypes.length];
      expect(await file.arrayBuffer()).toEqual(await source.arrayBuffer());
      uploadedTypes.push(file.type);
      return Response.json({ secure_url: url(String(uploadedTypes.length)) });
    });
    const result = await uploadGalleryBatch(files, vi.fn(), vi.fn());
    expect(result.errors).toEqual([]);
    expect(result.urls).toHaveLength(3);
    expect(uploadedTypes).toEqual(['image/png', 'image/webp', 'image/jpeg']);
  });

  it('rejects non-image contents before sending them to the upload endpoint', async () => {
    const file = new File(['not an image'], 'car.jpg', { type: 'image/jpeg' });
    await expect(uploadGalleryPhoto(file)).rejects.toThrow('Export it as one of these formats');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends selected files through the existing signed server upload in selection order', async () => {
    const urls: string[] = [];
    fetchMock.mockImplementation(async (input, options) => {
      if (input === '/api/admin/uploads')
        return POST(new Request('http://localhost:3000/api/admin/uploads', options));
      expect(input).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
      const form = options?.body as FormData;
      expect(form.get('file')).toBeInstanceOf(File);
      expect(form.get('api_key')).toBe('test-key');
      expect(form.get('signature')).toMatch(/^[a-f0-9]{40}$/);
      expect(form.get('api_secret')).toBeNull();
      const secure_url = url(String(urls.length));
      urls.push(secure_url);
      return Response.json({ secure_url });
    });
    const changed = vi.fn();
    const progress = vi.fn();
    const result = await uploadGalleryBatch(
      [photo('interior.jpg'), photo('rear.jpg'), photo('front.jpg')],
      changed,
      progress,
    );
    expect(result).toEqual({ urls, errors: [], sessionExpired: false });
    expect(new Set(result.urls).size).toBe(3);
    expect(changed.mock.calls.map(([images]) => images.length)).toEqual([1, 2, 3]);
    expect(progress.mock.calls.flat()).toEqual([1, 2, 3]);
    expect(security.consumeRateLimit).toHaveBeenCalledTimes(3);
  });

  it('keeps successes and continues after one failed photo', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ url: url('first') }))
      .mockResolvedValueOnce(new Response('Failed', { status: 502 }))
      .mockResolvedValueOnce(Response.json({ url: url('last') }));
    const changed = vi.fn();
    const result = await uploadGalleryBatch(
      [photo('first.jpg'), photo('failed.jpg'), photo('last.jpg')],
      changed,
      vi.fn(),
    );
    expect(result.urls).toEqual([url('first'), url('last')]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('failed.jpg');
    expect(changed).toHaveBeenLastCalledWith([url('first'), url('last')]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('stops on session expiry and preserves already uploaded photos', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ url: url('first') }))
      .mockResolvedValueOnce(new Response('Unauthorized', { status: 401 }));
    const result = await uploadGalleryBatch([photo(), photo(), photo()], vi.fn(), vi.fn());
    expect(result.urls).toEqual([url('first')]);
    expect(result.sessionExpired).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    new File(['text'], 'document.txt', { type: 'text/plain' }),
    new File([], 'empty.jpg', { type: 'image/jpeg' }),
    new File([new Uint8Array(CAR_IMAGE_MAX_UPLOAD_BYTES + 1)], 'large.jpg', { type: 'image/jpeg' }),
  ])('rejects invalid gallery files before uploading', async (file) => {
    expect(photoFileError(file)).toBeTruthy();
    await expect(uploadGalleryPhoto(file)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([413, 422, 429, 502, 503])(
    'uses friendly error messages for status %s',
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ error: 'Cloudinary configuration details' }, { status }),
      );
      await expect(uploadGalleryPhoto(photo())).rejects.not.toThrow(
        /Cloudinary|HTTPS|configuration/,
      );
    },
  );

  it('reports network failures without retrying an uncertain upload', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(uploadGalleryPhoto(photo())).rejects.toThrow('Check your connection');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([{}, null, { url: 'http://unsafe.example/car.jpg' }])(
    'rejects an invalid success receipt',
    async (data) => {
      fetchMock.mockResolvedValue(Response.json(data));
      await expect(uploadGalleryPhoto(photo())).rejects.toThrow('not confirmed');
    },
  );
});
