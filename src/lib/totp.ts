// TOTP (RFC 6238, HMAC-SHA1, 6 digits, 30 s) for authenticator apps, plus backup codes.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { keyedHash } from "./crypto-box";

const STEP_SECONDS = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("Invalid base32 secret");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const generateTotpSecret = () => base32Encode(randomBytes(20));

export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const o = h[h.length - 1] & 0x0f;
  const bin = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/**
 * Checks `token` against the current step +/- 1 (clock drift). Returns the matching step or null.
 * Pass `lastStep` to reject a step that was already used (replay protection).
 */
export function verifyTotp(base32Secret: string, token: string, lastStep?: number | null, now = Date.now()): number | null {
  const clean = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return null;
  const key = base32Decode(base32Secret);
  const cur = currentStep(now);
  for (const step of [cur, cur - 1, cur + 1]) {
    if (lastStep != null && step <= lastStep) continue;
    const expected = Buffer.from(hotp(key, step));
    const given = Buffer.from(clean);
    if (expected.length === given.length && timingSafeEqual(expected, given)) return step;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = "Mustang Mortgage"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/* ---------------- backup codes ---------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = Array.from({ length: 10 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

const normaliseCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
const hashCode = (c: string) => keyedHash(normaliseCode(c), "backup-code");

export const hashBackupCodes = (codes: string[]) => JSON.stringify(codes.map(hashCode));

/** If `input` is an unused backup code, returns the remaining hashed list (the code is consumed); otherwise null. */
export function consumeBackupCode(storedJson: string | null | undefined, input: string): string | null {
  if (!storedJson || normaliseCode(input).length !== 10) return null;
  let list: string[];
  try {
    list = JSON.parse(storedJson) as string[];
  } catch {
    return null;
  }
  const want = Buffer.from(hashCode(input));
  const idx = list.findIndex((h) => {
    const b = Buffer.from(h);
    return b.length === want.length && timingSafeEqual(b, want);
  });
  if (idx < 0) return null;
  return JSON.stringify(list.filter((_, i) => i !== idx));
}

export const backupCodesRemaining = (storedJson: string | null | undefined): number => {
  try {
    return storedJson ? (JSON.parse(storedJson) as string[]).length : 0;
  } catch {
    return 0;
  }
};
