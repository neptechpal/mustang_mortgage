/**
 * Minimal, dependency-free XLSX reader (enough for the NSW DCJ Rent & Sales tables).
 * Reads the zip central directory, inflates the parts we need, and returns each
 * worksheet as an array of rows (cell values as strings, `null` for empty cells).
 * Not a general-purpose parser: no formulas, styles, dates or zip64.
 */
import { inflateRawSync } from "node:zlib";

type ZipEntries = Map<string, Buffer>;

function readZip(buf: Buffer): ZipEntries {
  // End of central directory record: signature 0x06054b50, search backwards.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("xlsx: not a zip file (no EOCD record)");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out: ZipEntries = new Map();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("xlsx: bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`xlsx: bad local header for ${name}`);
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compSize);
    if (method === 0) out.set(name, Buffer.from(raw));
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`xlsx: unsupported compression method ${method} for ${name}`);
  }
  return out;
}

function decodeXml(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function textOf(fragment: string): string {
  // Concatenate every <t>…</t> run (rich text has several).
  let s = "";
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fragment))) s += m[1];
  return decodeXml(s);
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export type Sheet = (string | null)[][];

/** Parse an .xlsx buffer into { sheetName: rows }. */
export function readXlsx(buf: Buffer): Record<string, Sheet> {
  const zip = readZip(buf);
  const get = (name: string) => {
    const b = zip.get(name);
    if (!b) throw new Error(`xlsx: missing part ${name}`);
    return b.toString("utf8");
  };

  const shared: string[] = [];
  if (zip.has("xl/sharedStrings.xml")) {
    const xml = get("xl/sharedStrings.xml");
    const re = /<si>([\s\S]*?)<\/si>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) shared.push(textOf(m[1]));
  }

  const rels = new Map<string, string>();
  {
    const xml = get("xl/_rels/workbook.xml.rels");
    const re = /<Relationship\b([^>]*)\/?>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml))) {
      const id = /\bId="([^"]+)"/.exec(m[1])?.[1];
      const target = /\bTarget="([^"]+)"/.exec(m[1])?.[1];
      if (id && target) rels.set(id, target.replace(/^\/?xl\//, "").replace(/^\//, ""));
    }
  }

  const result: Record<string, Sheet> = {};
  const wb = get("xl/workbook.xml");
  const sheetRe = /<sheet\b([^>]*)\/?>/g;
  let sm: RegExpExecArray | null;
  while ((sm = sheetRe.exec(wb))) {
    const name = decodeXml(/\bname="([^"]+)"/.exec(sm[1])?.[1] ?? "");
    const rid = /\br:id="([^"]+)"/.exec(sm[1])?.[1];
    const target = rid ? rels.get(rid) : undefined;
    if (!name || !target) continue;
    const xml = get(`xl/${target}`);
    const rows: Sheet = [];
    const rowRe = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
    let rm: RegExpExecArray | null;
    while ((rm = rowRe.exec(xml))) {
      const rIdx = Number(/\br="(\d+)"/.exec(rm[1])?.[1] ?? rows.length + 1) - 1;
      const row: (string | null)[] = [];
      const body = rm[2] ?? "";
      const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
      let cm: RegExpExecArray | null;
      while ((cm = cellRe.exec(body))) {
        const attrs = cm[1];
        const inner = cm[2] ?? "";
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
        let value: string | null = null;
        if (type === "inlineStr") value = textOf(inner);
        else {
          const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
          if (v !== undefined) value = type === "s" ? (shared[Number(v)] ?? null) : decodeXml(v);
        }
        const ci = ref ? colIndex(ref) : row.length;
        while (row.length < ci) row.push(null);
        row[ci] = value;
      }
      while (rows.length < rIdx) rows.push([]);
      rows[rIdx] = row;
    }
    result[name] = rows;
  }
  return result;
}
