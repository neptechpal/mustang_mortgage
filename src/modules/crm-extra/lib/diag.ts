// Diagnostics / trail-test probes (diagnostics.php, trail_test.php).
import { getZoho } from "./opts";
import { zohoApi, zohoToken, resolveFolders, listMessages, msgId, toUnix } from "./zoho";
import { ymdHi } from "./cases";
import { addrOnly, addrList } from "./sync";

export const BUILDS = { core: "core-AU-2025-08-14+ph-picker", sync: "sync-AU-incremental+convindex-2025-08-13", diag: "diag-multi-list+scalar-2025-08-13" };

const when = (m: Record<string, unknown>) => {
  const t = toUnix(m.receivedTime ?? m.sentTime ?? m.sentDateInGMT);
  return t ? ymdHi(t * 1000) : "";
};

/** Trail Test: 5 newest messages from Inbox + Sent. */
export async function trailProbe(): Promise<string> {
  const z = await getZoho();
  const L: string[] = ["Build: trail-min-probe-2025-08-13", "WP Timezone: Australia/Sydney", `Zoho DC: ${z.dc}`, `AccountId: ${z.accountId || "(none)"}`, ""];
  if (!(await zohoToken())) return [...L, "No Zoho OAuth access token. Re-connect in Settings."].join("\n");
  if (!z.accountId) return [...L, "No Zoho accountId in Settings."].join("\n");
  const f = await resolveFolders();
  for (const [name, fid] of [["INBOX", f.inbox], ["SENT", f.sent]] as const) {
    if (!fid) {
      L.push(`${name} not found.`, "");
      continue;
    }
    const r = await zohoApi(`/messages/view?folderId=${encodeURIComponent(fid)}&start=0&limit=5`);
    L.push(`== ${name} (folderId ${fid}) ==`, `HTTP ${r.code}`, (r.raw || r.error || "").slice(0, 300), "");
    const list: Record<string, unknown>[] = Array.isArray(r.body?.data) ? r.body.data : [];
    for (const m of list.slice(0, 5)) {
      const t = toUnix(m.receivedTime ?? m.sentTime);
      const ts = t ? new Date(t * 1000).toISOString().replace("T", " ").slice(0, 19) : "";
      L.push(`${ts} | ${String(m.fromAddress ?? m.from ?? "") || "(no from)"} | ${String(m.subject ?? "") || "(no subject)"} | MID: ${msgId(m)}`);
    }
    L.push("");
  }
  return L.join("\n");
}

export async function diagFolderLists(limit = 15) {
  const f = await resolveFolders();
  const out: { name: string; fid: string; strategy: string; raw: string; attempts: { strategy: string; code: number; count: number }[]; rows: { when: string; from: string; to: string; subject: string; messageId: string }[] }[] = [];
  for (const [name, fid] of [["Inbox", f.inbox], ["Sent", f.sent]] as const) {
    if (!fid) {
      out.push({ name, fid: "", strategy: "", raw: "", attempts: [], rows: [] });
      continue;
    }
    const r = await listMessages(fid, limit);
    const rows = [];
    for (const m of r.list.slice(0, limit)) {
      const id = msgId(m);
      const d = id ? await zohoApi(`/messages/${id}?includeContent=true&includeHeaders=true`) : null;
      const x = (d?.body?.data ?? m) as Record<string, unknown>;
      rows.push({
        when: when(m),
        from: addrOnly(String(x.fromAddress ?? m.fromAddress ?? m.from ?? "")),
        to: addrList(x.toAddress ?? m.toAddress ?? m.to).join(", "),
        subject: String(x.subject ?? m.subject ?? ""),
        messageId: id,
      });
    }
    out.push({ name, fid, strategy: r.strategy, raw: r.raw.slice(0, 1024), attempts: r.attempts.map(({ strategy, code, count }) => ({ strategy, code, count })), rows });
  }
  return { folders: f, lists: out };
}

export async function rawListProbe(): Promise<string> {
  const f = await resolveFolders();
  const L: string[] = [];
  for (const [name, fid] of [["INBOX", f.inbox], ["SENT", f.sent]] as const) {
    if (!fid) {
      L.push(`${name}: No folderId`, "");
      continue;
    }
    const r = await listMessages(fid, 15);
    L.push(`== ${name} (${fid}) strategy: ${r.strategy || "none succeeded"} ==`);
    for (const a of r.attempts) L.push(`  ${a.strategy}: HTTP ${a.code}, ${a.count} item(s)`);
    L.push("RAW (512): " + r.raw.slice(0, 512));
    for (const m of r.list) L.push(`${when(m)} | ${String(m.fromAddress ?? "")} | ${String(m.subject ?? "")} | ${msgId(m)}`);
    L.push("");
  }
  return L.join("\n");
}

export async function messageProbe(mid: string): Promise<string> {
  const d = await zohoApi(`/messages/${encodeURIComponent(mid)}?includeContent=true&includeHeaders=true`);
  const o = await zohoApi(`/messages/${encodeURIComponent(mid)}/original`);
  return [`MessageId: ${mid}`, `DETAIL HTTP ${d.code}`, JSON.stringify(d.body ?? d.raw, null, 2), "", `RAW LENGTH: ${o.raw.length}`, o.raw.slice(0, 20000)].join("\n");
}
