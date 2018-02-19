import * as crypto from 'crypto';

export const ALPHA_NUMERIC = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function genSecureAlphaNumeric(size: number): string {
  const secure = crypto.randomBytes(size);
  const charLen = ALPHA_NUMERIC.length;
  let ascii = '';
  for (const byte of secure) {
    // Range from ASCII
    ascii += ALPHA_NUMERIC[byte % charLen];
  }
  return ascii;
}
