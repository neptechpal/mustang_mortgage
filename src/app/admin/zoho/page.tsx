import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { CheckCircle2, FlaskConical, KeyRound, Mail, PenLine, Plug, Save, Stethoscope, Unplug, XCircle } from "lucide-react";
import { Alert, Badge, buttonStyles, Card, checkboxStyles, Field, inputStyles, LinkButton, PageHeader, selectStyles, textareaStyles } from "@/components/admin/ui";
import { getZoho, saveZoho, ZOHO_DCS, zohoConnected, getCrmOptions, saveMailSettings, type ZohoDc } from "@/modules/crm-extra/lib/opts";
import { ZOHO_REDIRECT, ZOHO_SCOPE, disconnectZoho } from "@/modules/crm-extra/lib/zoho";
import { ConfirmButton } from "@/modules/crm-extra/ui/client";

export const metadata = { title: "Zoho Mail" };
export const dynamic = "force-dynamic";

async function save(fd: FormData) {
  "use server";
  await requireAdmin();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const dc = (ZOHO_DCS as string[]).includes(g("dc")) ? (g("dc") as ZohoDc) : "com.au";
  const cur = await getZoho();
  const patch: Record<string, unknown> = {
    dc,
    clientId: g("clientId"),
    fromEmail: g("fromEmail"),
    alias1: g("alias1"),
    alias2: g("alias2"),
    label: g("label"),
    inboxFolder: g("inboxFolder"),
    sentFolder: g("sentFolder"),
    accountId: g("accountId") || cur.accountId,
  };
  if (g("clientSecret")) patch.clientSecret = g("clientSecret");
  if (dc !== cur.dc) Object.assign(patch, { access: "", accessExp: 0 });
  await saveZoho(patch);
  await saveMailSettings({ signatureHtml: String(fd.get("signatureHtml") ?? ""), autoAppendSignature: fd.get("autoAppend") === "1" });
  revalidatePath("/admin/zoho");
  redirect("/admin/zoho?saved=1");
}

async function disconnect() {
  "use server";
  await requireAdmin();
  await disconnectZoho();
  redirect("/admin/zoho?disconnected=1");
}

export default async function ZohoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const z = await getZoho();
  const o = await getCrmOptions();
  const connected = zohoConnected(z);
  const F = ({ name, label, value, type = "text", ph, hint }: { name: string; label: string; value: string; type?: string; ph?: string; hint?: string }) => (
    <Field label={label} htmlFor={`zo-${name}`} hint={hint}>
      <input id={`zo-${name}`} name={name} type={type} defaultValue={value} placeholder={ph} className={inputStyles} autoComplete="off" />
    </Field>
  );
  return (
    <div className="max-w-5xl">
      <PageHeader
        icon={<Mail />}
        title="Zoho Mail"
        description="Send CRM email through Zoho and sync replies into each case’s Email Trail."
        actions={
          <>
            <LinkButton href="/admin/diagnostics" variant="secondary">
              <Stethoscope /> Diagnostics
            </LinkButton>
            <LinkButton href="/admin/zoho/trail-test" variant="secondary">
              <FlaskConical /> Trail Test
            </LinkButton>
          </>
        }
      />
      <div className="space-y-6">
        {(sp.saved || sp.connected || sp.disconnected || sp.err) && (
          <div className="space-y-2">
            {sp.saved && <Alert tone="success">Settings saved.</Alert>}
            {sp.connected && <Alert tone="success">Connected to Zoho Mail.</Alert>}
            {sp.disconnected && <Alert tone="warning">Disconnected from Zoho.</Alert>}
            {sp.err === "oauth" && <Alert tone="danger">OAuth failed.</Alert>}
            {sp.err === "creds" && <Alert tone="danger">Enter and save the Client ID and Client Secret first.</Alert>}
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center gap-4 p-5">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ${connected ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-red-50 text-red-600 ring-red-200"}`}>
              {connected ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium tracking-wider text-slate-500 uppercase">Status</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {connected ? <Badge tone="success" dot>Connected</Badge> : <Badge tone="danger" dot>Not connected to Zoho</Badge>}
                {z.accountId && <Badge>Account ID {z.accountId}</Badge>}
                <Badge tone="info">DC zoho.{z.dc}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {connected && (
                <form action={disconnect}>
                  <ConfirmButton className={buttonStyles({ variant: "danger" })} confirm="Disconnect Zoho Mail? Emails will fall back to SMTP and syncing will stop.">
                    <Unplug /> Disconnect
                  </ConfirmButton>
                </form>
              )}
              <a href="/api/zoho/start" className={buttonStyles({ variant: "primary" })}>
                <Plug /> {connected ? "Reconnect Zoho" : "Connect Zoho"}
              </a>
            </div>
          </div>
          <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 text-sm text-slate-600">
            <p>
              In the Zoho API console create a <em>Server-based application</em> with this redirect URI:{" "}
              <code className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-xs break-all text-slate-800">{ZOHO_REDIRECT()}</code>
            </p>
            <p>
              Scope requested: <code className="font-mono text-xs break-all text-slate-700">{ZOHO_SCOPE}</code>
            </p>
          </div>
        </section>

        <form action={save} className="space-y-6">
          <Card
            title={
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-slate-400" /> API credentials
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Zoho data center" htmlFor="zo-dc">
                <select id="zo-dc" name="dc" defaultValue={z.dc} className={selectStyles}>
                  {ZOHO_DCS.map((d) => (
                    <option key={d} value={d}>
                      zoho.{d}
                    </option>
                  ))}
                </select>
              </Field>
              <F name="clientId" label="Client ID" value={z.clientId} />
              <F name="clientSecret" label="Client Secret" value="" type="password" ph={z.clientSecret ? "•••••••• (saved — leave blank to keep)" : ""} />
              <F name="accountId" label="Account ID (auto-discovered)" value={z.accountId} />
            </div>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-2">
                <Mail className="size-4 text-slate-400" /> Mailbox &amp; sync
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <F name="fromEmail" label="Email From Address" value={z.fromEmail} ph={o.fromEmail} />
              <F name="label" label="Zoho label for sent CRM mail" value={z.label} />
              <F name="alias1" label="Alias 1" value={z.alias1} />
              <F name="alias2" label="Alias 2" value={z.alias2} />
              <F name="inboxFolder" label="Inbox folderId (override)" value={z.inboxFolder} />
              <F name="sentFolder" label="Sent folderId (override)" value={z.sentFolder} />
            </div>
          </Card>
          <Card
            title={
              <span className="flex items-center gap-2">
                <PenLine className="size-4 text-slate-400" /> Signature
              </span>
            }
            footer={
              <div className="flex justify-end">
                <button className={buttonStyles({ variant: "primary" })}>
                  <Save /> Save settings
                </button>
              </div>
            }
          >
            <Field label="Email signature (HTML)" htmlFor="zo-sig">
              <textarea id="zo-sig" name="signatureHtml" rows={6} defaultValue={o.signatureHtml} className={`${textareaStyles} font-mono text-xs`} />
            </Field>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="autoAppend" value="1" defaultChecked={o.autoAppendSignature} className={checkboxStyles} /> Automatically append the signature to outgoing emails
            </label>
          </Card>
        </form>
      </div>
    </div>
  );
}
