import crypto from "crypto";

const TOTP_WINDOW = 30; // 30 seconds
const TOTP_DIGITS = 6;
const REMEMBER_DAYS = 30;

/**
 * Generate a TOTP secret in base32 format
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(32);
  return base32Encode(randomBytes);
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()
      .match(/.{1,4}/g)
      ?.join("-") || "";
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a TOTP token
 */
export function verifyTotp(secret: string, token: string): boolean {
  if (!secret || !token || token.length !== TOTP_DIGITS) {
    return false;
  }

  const decoded = base32Decode(secret);
  const timeCounter = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

  // Check current and previous/next windows for tolerance
  for (let i = -1; i <= 1; i++) {
    const counter = timeCounter + i;
    const hmac = crypto.createHmac("sha1", decoded);
    hmac.update(Buffer.alloc(8));
    Buffer.from(counter.toString()).copy(hmac.digest().subarray(0, 8));

    const digest = crypto.createHmac("sha1", decoded);
    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));
    digest.update(buffer);

    const hash = digest.digest();
    const offset = hash[hash.length - 1] & 0xf;
    const truncated = (
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)
    );

    const totp = String(truncated % Math.pow(10, TOTP_DIGITS)).padStart(
      TOTP_DIGITS,
      "0"
    );

    if (totp === token) {
      return true;
    }
  }

  return false;
}

/**
 * Generate QR code URL for TOTP setup
 */
export function generateTotpQrUrl(
  secret: string,
  email: string,
  appName: string = "Mustang Mortgage"
): string {
  const encoded = encodeURIComponent(`otpauth://totp/${appName}:${email}?secret=${secret}&issuer=${appName}`);
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
}

/**
 * Check if a backup code is valid and remove it
 */
export function verifyAndUseBackupCode(
  backupCodes: string[],
  code: string
): { valid: boolean; remainingCodes: string[] } {
  const index = backupCodes.findIndex(
    (c) => c.replace(/[^A-Z0-9]/g, "") === code.replace(/[^A-Z0-9]/g, "")
  );

  if (index === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }

  const remainingCodes = backupCodes.filter((_, i) => i !== index);
  return { valid: true, remainingCodes };
}

/**
 * Check if 30-day remember window is still valid
 */
export function isRememberWindowValid(lastPrompt: Date | null): boolean {
  if (!lastPrompt) {
    return false;
  }

  const thirtyDaysAgo = new Date(Date.now() - REMEMBER_DAYS * 24 * 60 * 60 * 1000);
  return lastPrompt > thirtyDaysAgo;
}

/**
 * Base32 encoding (RFC 4648)
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i].toString(2).padStart(8, "0");
  }

  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    result += alphabet[parseInt(chunk, 2)];
  }

  // Add padding
  while (result.length % 8 !== 0) {
    result += "=";
  }

  return result;
}

/**
 * Base32 decoding
 */
function base32Decode(str: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";

  for (const char of str.replace(/=/g, "")) {
    const index = alphabet.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 character");
    bits += index.toString(2).padStart(5, "0");
  }

  const buffer = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }

  return buffer;
}
