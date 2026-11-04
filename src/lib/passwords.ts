import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_BYTES = 72;
export function validNewPassword(password: string) {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    Buffer.byteLength(password, 'utf8') <= PASSWORD_MAX_BYTES
  );
}
export function hashPassword(password: string) {
  if (!validNewPassword(password))
    throw new Error('Use at least 12 characters and no more than 72 UTF-8 bytes');
  return bcrypt.hash(password, 12);
}
// Keep missing-account checks as expensive as existing-account checks.
const DUMMY_PASSWORD_HASH = '$2b$12$8ZB5GQDv9o9S1dn7knxT4eWH53A7Q8K5jQcQxFtXhaX0F6LhfxIfK';
export function verifyPassword(password: string, passwordHash?: string) {
  return bcrypt.compare(password, passwordHash || DUMMY_PASSWORD_HASH);
}
