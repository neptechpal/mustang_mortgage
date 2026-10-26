// Zoho Mail API client (port of includes/zoho.php + HTTP helpers).
// Secrets are kept in settings ("crmx.zoho") and never logged.
import { dcBase, getZoho, saveZoho, fromAddress, SITE_URL } from "./opts";
import { indexAdd } from "./threading";

export const ZOHO_SCOPE = "ZohoMail.messages.CREATE,ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.READ";
export const ZOHO_REDIRECT = () => `${SITE_URL}/api/zoho/callback`;

export type HttpRes = { code: number; body: any; raw: string; error?: string }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function http(url: string, init: RequestInit = {}): Promise<HttpRes> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(30000) });
    const raw = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    return { code: res.status, body, raw };
  } catch (e) {
    return { code: 0, body: null, raw: "", error: e instanceof Error ? e.message : String(e) };
  }
}

const form = (o: Record<string, string>) => new URLSearchParams(o).toString();

/** Returns a valid access token (refreshing when within 60s of expiry) or null. */
export async function zohoToken(): Promise<string | null> {
  const z = await getZoho();
  const now = Math.floor(Date.now() / 1000);
  if (z.access && now < Number(z.accessExp) - 60) return z.access;
  if (!z.refresh) return null;
  const [acct] = dcBase(z.dc);
  const r = await http(`${acct}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({ refresh_token: z.refresh, client_id: z.clientId, client_secret: z.clientSecret, grant_type: "refresh_token" }),
  });
  if (r.body?.access_token) {
    await saveZoho({ access: r.body.access_token, accessExp: now + Number(r.body.expires_in ?? 3600) });
    return r.body.access_token as string;
  }
  return null;
}

export async function authorizeUrl(state: string) {
  const z = await getZoho();
  const [acct] = dcBase(z.dc);
  return (
    `${acct}/oauth/v2/auth?response_type=code&client_id=${encodeURIComponent(z.clientId)}` +
    `&scope=${encodeURIComponent(ZOHO_SCOPE)}&redirect_uri=${encodeURIComponent(ZOHO_REDIRECT())}` +
    `&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`
  );
}

/** OAuth callback: exchange code, store tokens, auto-discover accountId. */
export async function exchangeCode(code: string): Promise<{ ok: boolean; error?: string }> {
  const z = await getZoho();
  const [acct, mail] = dcBase(z.dc);
  const r = await http(`${acct}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form({
      grant_type: "authorization_code",
      client_id: z.clientId,
      client_secret: z.clientSecret,
      redirect_uri: ZOHO_REDIRECT(),
      code,
    }),
  });
  if (!r.body?.refresh_token) return { ok: false, error: "OAuth failed" };
  const now = Math.floor(Date.now() / 1000);
  const patch: Record<string, unknown> = {
    refresh: r.body.refresh_token,
    access: r.body.access_token,
    accessExp: now + Number(r.body.expires_in ?? 3600),
  };
  const acc = await http(`${mail}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${r.body.access_token}` } });
  const id = acc.body?.data?.[0]?.accountId;
  if (id) patch.accountId = String(id);
  await saveZoho(patch);
  return { ok: true };
}

export async function disconnectZoho() {
  await saveZoho({ refresh: "", access: "", accessExp: 0 });
}

/** Authenticated request against {mailBase}/api/accounts/{accountId}{path}. */
export async function zohoApi(path: string, init: RequestInit = {}): Promise<HttpRes> {
  const z = await getZoho();
  const token = await zohoToken();
  if (!token) return { code: 0, body: null, raw: "", error: "Not connected to Zoho." };
  if (!z.accountId) return { code: 0, body: null, raw: "", error: "Zoho account id missing." };
  const [, mail] = dcBase(z.dc);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Zoho-oauthtoken ${token}`);
  return http(`${mail}/api/accounts/${z.accountId}${path}`, { ...init, headers });
}

/** GET {mailBase}/api/accounts (no account id). */
export async function zohoAccounts(): Promise<HttpRes> {
  const z = await getZoho();
  const token = await zohoToken();
  if (!token) return { code: 0, body: null, raw: "", error: "Not connected to Zoho." };
  const [, mail] = dcBase(z.dc);
  return http(`${mail}/api/accounts`, { headers: { Authorization: `Zoho-oauthtoken ${token}` } });
}

export const bareAddr = (s: string) => s.trim().replace(/^.*<(.+)>.*$/, "$1").trim().toLowerCase();

/**
 * Port of MMCRM_Zoho::send(). Adds the [MM#id] subject tag and the
 * <!--MMCASE:id--> marker, posts the message, then indexes RFC Message-ID,
 * Zoho messageId, conversationId and recipient contacts to the case.
 */
export async function zohoSend(
  caseId: number,
  to: string,
  subject: string,
  html: string,
  cc = "",
  bcc = "",
  from?: string,
): Promise<{ ok: true; messageId: string; conversationId: string; rfcId: string; subject: string } | { ok: false; error: string }> {
  const z = await getZoho();
  if (!(await zohoToken())) return { ok: false, error: "Not connected to Zoho." };
  if (!z.accountId) return { ok: false, error: "Zoho account id missing." };
  let subj = subject;
  if (caseId) {
    const tag = `[MM#${caseId}]`;
    if (!subj.includes(tag)) subj = `${tag} ${subj}`;
  }
  const payload: Record<string, string> = {
    fromAddress: from || (await fromAddress()),
    toAddress: to,
    subject: subj,
    content: html + (caseId ? `<!--MMCASE:${caseId}-->` : ""),
    mailFormat: "html",
  };
  if (cc) payload.ccAddress = cc;
  if (bcc) payload.bccAddress = bcc;
  const r = await zohoApi("/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (r.error) return { ok: false, error: r.error };
  if (r.code < 200 || r.code >= 300) return { ok: false, error: `Zoho send failed: HTTP ${r.code} — ${r.raw.slice(0, 500)}` };
  const mid = String(r.body?.data?.messageId ?? "");
  let conv = String(r.body?.data?.conversationId ?? "");
  let rfc = "";
  if (mid && caseId) {
    const m = await zohoApi(`/messages/${mid}?includeHeaders=true`);
    const d = m.body?.data;
    if (d) {
      conv = conv || String(d.conversationId ?? "");
      const hdrs: { name?: string; value?: string }[] = Array.isArray(d.headers) ? d.headers : Array.isArray(d.internetHeaders) ? d.internetHeaders : [];
      for (const h of hdrs) if (String(h.name ?? "").toLowerCase() === "message-id") { rfc = String(h.value ?? "").trim(); break; }
    }
    if (!rfc) {
      const raw = await zohoApi(`/messages/${mid}/original`);
      if (raw.raw) {
        const head = raw.raw.split(/\r?\n\r?\n/, 1)[0] ?? "";
        const mm = head.replace(/\r?\n[ \t]+/g, " ").match(/\bMessage-ID:\s*(<[^>]+>)/i);
        if (mm) rfc = mm[1].trim();
      }
    }
    if (rfc) await indexAdd("rfc", rfc, caseId);
  }
  if (caseId) {
    if (mid) await indexAdd("msg", mid, caseId);
    if (conv) await indexAdd("conv", conv, caseId);
    const all = [to, cc, bcc].filter(Boolean).join(",").toLowerCase();
    for (const a of all.split(/[;,]/)) {
      const addr = bareAddr(a);
      if (addr) await indexAdd("contact", addr, caseId);
    }
  }
  if (mid && z.label) await labelMessage(mid, z.label).catch(() => undefined);
  return { ok: true, messageId: mid, conversationId: conv, rfcId: rfc, subject: subj };
}

async function labelMessage(messageId: string, label: string) {
  const f = await zohoApi("/folders");
  const list: { displayName?: string; folderId?: string }[] = f.body?.data ?? [];
  const hit = list.find((x) => (x.displayName ?? "").toLowerCase() === label.toLowerCase());
  if (!hit?.folderId) return;
  await zohoApi(`/messages/${messageId}/labels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ labelIds: [hit.folderId] }),
  });
}

/** ms → s when > 9999999999, else Date.parse. Returns unix seconds (0 when unknown). */
export function toUnix(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number" || /^\d+$/.test(String(v))) {
    const n = Number(v);
    return n > 9999999999 ? Math.floor(n / 1000) : n;
  }
  const t = Date.parse(String(v));
  return isNaN(t) ? 0 : Math.floor(t / 1000);
}

export const msgId = (m: Record<string, unknown>) => String(m.messageId ?? m.id ?? m.message_id ?? m.MID ?? "");

/** Resolve Inbox / Sent folder ids (settings overrides win). */
export async function resolveFolders(): Promise<{ inbox: string; sent: string; folders: Record<string, unknown>[]; res: HttpRes }> {
  const z = await getZoho();
  const res = await zohoApi("/folders");
  const folders: Record<string, unknown>[] = Array.isArray(res.body?.data) ? res.body.data : [];
  let inbox = z.inboxFolder;
  let sent = z.sentFolder;
  for (const f of folders) {
    const name = String(f.folderName ?? f.displayName ?? "").toLowerCase();
    const path = String(f.path ?? "").toLowerCase();
    const type = String(f.folderType ?? "").toLowerCase();
    if (!inbox && (name === "inbox" || type === "inbox" || path.includes("/inbox"))) inbox = String(f.folderId);
    if (!sent && (name === "sent" || type === "sent" || path.includes("/sent"))) sent = String(f.folderId);
  }
  return { inbox, sent, folders, res };
}

export type ListAttempt = { strategy: string; code: number; count: number; raw: string };

/**
 * Message-list strategy ladder used by sync (A–C) and diagnostics (all 5):
 *  1 POST form /messages/view  2 POST JSON /messages/view  3 GET /messages/view
 *  4 GET /folders/{fid}/messages  5 GET /messages?folderId=
 */
export async function listMessages(folderId: string, limit: number, strategies = [1, 2, 3, 4, 5]) {
  const attempts: ListAttempt[] = [];
  const pickList = (b: any): Record<string, unknown>[] => // eslint-disable-line @typescript-eslint/no-explicit-any
    Array.isArray(b?.data) ? b.data : Array.isArray(b?.data?.messages) ? b.data.messages : [];
  for (const s of strategies) {
    let r: HttpRes;
    let label = "";
    if (s === 1) {
      label = "POST form /messages/view";
      r = await zohoApi("/messages/view", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ folderId, start: "0", limit: String(limit) }),
      });
    } else if (s === 2) {
      label = "POST JSON /messages/view";
      r = await zohoApi("/messages/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, start: 0, limit }),
      });
    } else if (s === 3) {
      label = "GET /messages/view";
      r = await zohoApi(`/messages/view?folderId=${encodeURIComponent(folderId)}&start=0&limit=${limit}`);
    } else if (s === 4) {
      label = "GET /folders/{fid}/messages";
      r = await zohoApi(`/folders/${encodeURIComponent(folderId)}/messages?start=0&limit=${limit}`);
    } else {
      label = "GET /messages?folderId=";
      r = await zohoApi(`/messages?folderId=${encodeURIComponent(folderId)}&start=0&limit=${limit}`);
    }
    const list = pickList(r.body);
    attempts.push({ strategy: label, code: r.code, count: list.length, raw: (r.raw || r.error || "").slice(0, 1024) });
    if (r.code >= 200 && r.code < 300 && list.length) return { list, strategy: label, attempts, raw: r.raw };
  }
  return { list: [] as Record<string, unknown>[], strategy: "", attempts, raw: "" };
}
