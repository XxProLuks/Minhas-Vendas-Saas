import { randomBytes } from 'crypto';

export function generateToken(length = 48) {
  return randomBytes(length).toString('hex');
}
