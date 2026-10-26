import crypto from "crypto";
import bcrypt from "bcryptjs";

// Verifies passwords migrated from WordPress.
// Supports WP >= 6.8 ("$wp$2y$..." bcrypt over HMAC-SHA384), plain bcrypt,
// legacy phpass ("$P$" / "$H$") and very old MD5 hashes.

const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function encode64(input: Buffer, count: number): string {
  let output = "";
  let i = 0;
  do {
    let value = input[i++];
    output += ITOA64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    output += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= input[i] << 16;
    output += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    output += ITOA64[(value >> 18) & 0x3f];
  } while (i < count);
  return output;
}

function phpassCrypt(password: string, setting: string): string {
  const countLog2 = ITOA64.indexOf(setting[3]);
  if (countLog2 < 7 || countLog2 > 30) return "*";
  let count = 1 << countLog2;
  const salt = setting.substring(4, 12);
  if (salt.length !== 8) return "*";
  const pw = Buffer.from(password, "utf8");
  let hash = crypto.createHash("md5").update(Buffer.concat([Buffer.from(salt, "binary"), pw])).digest();
  do {
    hash = crypto.createHash("md5").update(Buffer.concat([hash, pw])).digest();
  } while (--count);
  return setting.substring(0, 12) + encode64(hash, 16);
}

function normalizeBcrypt(hash: string) {
  // bcryptjs understands $2a$/$2b$; PHP emits $2y$ which is equivalent.
  return hash.replace(/^\$2y\$/, "$2b$");
}

export function verifyWpPassword(password: string, hash: string): boolean {
  if (!hash) return false;
  if (hash.startsWith("$wp")) {
    const pre = crypto.createHmac("sha384", "wp-sha384").update(password).digest("base64");
    return bcrypt.compareSync(pre, normalizeBcrypt(hash.substring(3)));
  }
  if (/^\$2[aby]\$/.test(hash)) return bcrypt.compareSync(password, normalizeBcrypt(hash));
  if (hash.startsWith("$P$") || hash.startsWith("$H$")) {
    const computed = phpassCrypt(password, hash);
    return computed.length === hash.length && crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  }
  if (hash.length <= 32) return crypto.createHash("md5").update(password).digest("hex") === hash;
  return false;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}
