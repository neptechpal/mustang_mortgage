// Minimal ZIP writer (STORE method, no compression) for "Download all files".
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function buildZip(files: { name: string; data: Buffer }[]) {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const used = new Set<string>();
  for (const f of files) {
    let name = f.name.replace(/[\\/:*?"<>|]+/g, "");
    let i = 2;
    const dot = name.lastIndexOf(".");
    while (used.has(name)) name = dot > 0 ? `${f.name.slice(0, dot)} (${i++})${f.name.slice(dot)}` : `${f.name} (${i++})`;
    used.add(name);
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(f.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(f.data.length, 18);
    local.writeUInt32LE(f.data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, nameBuf, f.data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt32LE(0, 12);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(f.data.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + f.data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}

/** "J Smith & F Mercury" */
export function applicantSlug(a1: string, a2: string) {
  const fmt = (full: string) => {
    full = full.trim().replace(/\s+/g, " ");
    if (!full) return "";
    const parts = full.split(" ");
    return parts[0].slice(0, 1).toUpperCase() + " " + parts[parts.length - 1];
  };
  const p1 = fmt(a1), p2 = fmt(a2);
  if (p1 && p2) return `${p1} & ${p2}`;
  return p1 || p2 || "Client";
}

export function prettyFilename(people: string, label: string, orig: string, index = 1) {
  const ext = orig.includes(".") ? orig.split(".").pop() : "";
  const base = label.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().replace(/[\\/:*?"<>|]+/g, "");
  const pretty = `${people} - ${base}${index > 1 ? ` - ${index}` : ""}`;
  return ext ? `${pretty}.${ext}` : pretty;
}
