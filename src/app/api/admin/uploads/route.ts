import { createHash } from 'node:crypto';
import { currentAdmin, sameOrigin, jsonError, consumeRateLimit } from '@/lib/security';
export const runtime = 'nodejs';
// Optional signed server-side Cloudinary upload; cloud API secret is NEVER sent to the browser.
export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError('Invalid origin', 403);
  const admin = await currentAdmin();
  if (!admin) return jsonError('Unauthorized', 401);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud))
    return jsonError('Cloudinary uploads not configured. Use an HTTPS image URL instead.', 503);
  if (Number(req.headers.get('content-length') || 0) > 4 * 1024 * 1024)
    return jsonError('File too large (max 3MB)', 413);
  if (!(await consumeRateLimit(`upload:${admin.id}`, 30, 3600)))
    return jsonError('Upload rate limit reached', 429);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError('Invalid upload form', 400);
  }
  const file = form.get('file');
  if (
    !(file instanceof File) ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 3 * 1024 * 1024 ||
    file.size === 0
  )
    return jsonError('Upload one JPEG, PNG or WebP image under 3MB', 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (
    (file.type === 'image/jpeg' && !jpeg) ||
    (file.type === 'image/png' && !png) ||
    (file.type === 'image/webp' && !webp)
  )
    return jsonError('Image file signature does not match its type', 422);
  const folder = 'universal-selfdrive-cars';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest('hex');
  const body = new FormData();
  body.append('file', file, 'upload');
  body.append('api_key', key);
  body.append('timestamp', timestamp);
  body.append('folder', folder);
  body.append('signature', signature);
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (
      !res.ok ||
      typeof data.secure_url !== 'string' ||
      !data.secure_url.startsWith('https://res.cloudinary.com/')
    )
      return jsonError('Image hosting provider rejected the upload', 502);
    return Response.json({ url: data.secure_url }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return jsonError('Image upload provider unavailable', 502);
  }
}
