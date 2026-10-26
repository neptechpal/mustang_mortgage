import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./db";

// Private uploads (client documents, signatures, fact-find snapshots).
// Never written under /public; served only via authorised route handlers
// using readStoredFile().

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || "./storage/private");

const BLOCKED_EXT = /\.(php\d?|phtml|phar|exe|sh|bat|cmd|js|mjs|html?|svg)$/i;

export function safeName(name: string) {
  const base = path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(-120);
  return base || "file";
}

export async function saveFile(opts: { data: Buffer; originalName: string; mimeType: string; folder: string; owner?: string }) {
  if (BLOCKED_EXT.test(opts.originalName)) throw new Error("File type not allowed");
  const folder = opts.folder.replace(/[^\w\-/]/g, "_").replace(/\.\./g, "");
  const rel = path.posix.join(folder, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${safeName(opts.originalName)}`);
  const abs = path.join(STORAGE_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, opts.data);
  return prisma.storedFile.create({
    data: { path: rel, originalName: opts.originalName, mimeType: opts.mimeType || "application/octet-stream", size: opts.data.length, owner: opts.owner ?? "" },
  });
}

export async function saveFormFile(file: File, folder: string, owner?: string) {
  return saveFile({ data: Buffer.from(await file.arrayBuffer()), originalName: file.name, mimeType: file.type, folder, owner });
}

export async function readStoredFile(id: string) {
  const rec = await prisma.storedFile.findUnique({ where: { id } });
  if (!rec) return null;
  const abs = path.join(STORAGE_DIR, rec.path);
  if (!abs.startsWith(STORAGE_DIR)) return null;
  const data = await fs.readFile(abs).catch(() => null);
  return data ? { rec, data } : null;
}

export async function deleteStoredFile(id: string) {
  const rec = await prisma.storedFile.findUnique({ where: { id } });
  if (!rec) return;
  await fs.unlink(path.join(STORAGE_DIR, rec.path)).catch(() => undefined);
  await prisma.storedFile.delete({ where: { id } });
}
