"use client";
// Marketing screen (marketing.php render + JS): contacts, composer, recipients, birthday, history.
import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Cake,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  FlaskConical,
  History,
  Mail,
  Megaphone,
  PenLine,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  Trash2,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  buttonStyles,
  checkboxStyles,
  cn,
  hintStyles,
  inputStyles,
  labelStyles,
  selectStyles,
  tableCls,
  textareaStyles,
  type Tone,
} from "@/components/admin/ui";
import { useToast } from "../ui/client";
import {
  mktFetch,
  mktUpsert,
  mktDelete,
  mktTplLoad,
  mktRecipients,
  mktSignature,
  mktSend,
  mktSendTest,
  mktHistory,
  mktHistoryView,
  mktSyncCases,
  mktAudAdd,
  mktBdaySave,
  mktBdayTest,
} from "../actions/marketing";

type Row = Awaited<ReturnType<typeof mktFetch>>["rows"][number];
type Hist = Awaited<ReturnType<typeof mktHistory>>["rows"][number];
const PRIMARY = buttonStyles({ variant: "primary" });
const GHOST = buttonStyles({ variant: "secondary" });
const XS = buttonStyles({ variant: "secondary", size: "xs" });
const WRAP = "overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
const statusTone = (s: string): Tone => (s === "Active" ? "success" : s === "Trashed" ? "warning" : "danger");
const emptyEdit = {
  id: 0,
  first_name: "",
  last_name: "",
  email: "",
  status: "Active",
  audience: "",
  birthday: "",
};

type View = "contacts" | "compose" | "birthday" | "history";

export default function Marketing({
  me,
  templates,
  initialAudiences,
  bday: bday0,
  isAdmin,
}: {
  me: string;
  templates: { id: number; label: string }[];
  initialAudiences: string[];
  bday: { enabled: number; template_id: number; hour: number };
  isAdmin: boolean;
}) {
  const { show, node } = useToast();
  const [pending, start] = useTransition();
  const [view, setView] = useState<View>("contacts");
  const [aud, setAud] = useState(initialAudiences);
  const [filt, setFilt] = useState({
    q: "",
    source: "",
    status: "Active",
    audience: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ rows: Row[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [edit, setEdit] = useState<typeof emptyEdit | null>(null);
  // composer
  const [tpl, setTpl] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [incSig, setIncSig] = useState(true);
  const [incUnsub, setIncUnsub] = useState(true);
  const [scope, setScope] = useState("selected");
  const [scSource, setScSource] = useState("");
  const [scStatus, setScStatus] = useState("Active");
  const [scAud, setScAud] = useState<string[]>([]);
  const [audOpen, setAudOpen] = useState(false);
  const [recips, setRecips] = useState<{ id: number; email: string; on: boolean }[] | null>(null);
  // birthday
  const [bday, setBday] = useState(bday0);
  // history
  const [hOff, setHOff] = useState(0);
  const [hist, setHist] = useState<{ rows: Hist[]; total: number }>({
    rows: [],
    total: 0,
  });
  const [modal, setModal] = useState<{ subject: string; body: string } | null>(null);
  const per = 10,
    logPer = 20;

  const load = useCallback(async () => {
    try {
      setData(await mktFetch({ ...filt, page, per }));
    } catch {
      show("Failed to load", true);
    }
  }, [filt, page, show]);
  const loadHist = useCallback(async () => setHist(await mktHistory(hOff, logPer)), [hOff]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadHist();
  }, [loadHist]);

  const pages = Math.max(1, Math.ceil(data.total / per));
  const hPages = Math.max(1, Math.ceil(hist.total / logPer));
  const addAudience = async () => {
    const name = prompt("New audience name (e.g., Subscribed, Potential, VIP):");
    if (!name) return;
    const r = await mktAudAdd(name);
    if (r.ok) {
      setAud(r.list);
      show("Audience added");
      return name.trim();
    }
    show("Could not add audience", true);
  };

  const loadRecipients = () =>
    start(async () => {
      if (scope === "selected" && !sel.size) return show("Tick some rows first, then load recipients", true);
      if (scope === "audience" && !scAud.length) return show("Pick at least one audience", true);
      try {
        const rows = await mktRecipients(scope, {
          ids: Array.from(sel),
          q: filt.q,
          source: scope === "source" ? scSource : filt.source,
          status: scope === "filters" ? scStatus : scope === "source" ? scStatus : filt.status,
          audiences: scAud,
          audience: scope === "filters" ? filt.audience : "",
        });
        setRecips(rows.map((r) => ({ ...r, on: true })));
      } catch {
        show("Failed to load recipients", true);
      }
    });

  const onCount = recips ? recips.filter((r) => r.on).length : 0;
  const tabs: { k: View; label: string; icon: LucideIcon; count?: number }[] = [
    { k: "contacts", label: "Contacts", icon: Users, count: data.total },
    {
      k: "compose",
      label: "Compose campaign",
      icon: PenLine,
      count: sel.size || undefined,
    },
    { k: "birthday", label: "Birthday automation", icon: Cake },
    { k: "history", label: "History", icon: History, count: hist.total },
  ];

  return (
    <div>
      <PageHeader
        icon={<Megaphone />}
        title="Marketing"
        description="Contacts, email campaigns via Zoho and birthday automation."
        actions={
          <>
            <button
              className={GHOST}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await mktSyncCases();
                  if (r.ok) {
                    show(`Synced ${r.count} contacts`);
                    load();
                  } else show("Sync failed", true);
                })
              }
            >
              <RefreshCw />
              Sync from cases
            </button>
            <button
              className={PRIMARY}
              onClick={() => {
                setEdit({ ...emptyEdit });
                setView("contacts");
              }}
            >
              <UserPlus />
              Add contact
            </button>
          </>
        }
      />

      {/* Tabs */}
      <nav role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const on = view === t.k;
          const Icon = t.icon;
          return (
            <button
              key={t.k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setView(t.k)}
              className={cn(
                "-mb-px inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                on ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              <Icon className="size-4" />
              {t.label}
              {t.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                    on ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ============ Contacts ============ */}
      <div role="tabpanel" hidden={view !== "contacts"} className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className={cn(inputStyles, "pl-9")}
              placeholder="Search name or email"
              value={filt.q}
              onChange={(e) => (setFilt({ ...filt, q: e.target.value }), setPage(1))}
            />
          </div>
          <select className={cn(selectStyles, "sm:w-auto")} value={filt.source} onChange={(e) => (setFilt({ ...filt, source: e.target.value }), setPage(1))}>
            <option value="">All sources</option>
            <option value="case">From cases</option>
            <option value="manual">Manually added</option>
          </select>
          <select className={cn(selectStyles, "sm:w-auto")} value={filt.status} onChange={(e) => (setFilt({ ...filt, status: e.target.value }), setPage(1))}>
            <option value="">All status</option>
            <option>Active</option>
            <option>Trashed</option>
            <option>Unsubscribed</option>
          </select>
          <select
            className={cn(selectStyles, "sm:w-auto")}
            value={filt.audience}
            onChange={(e) => (setFilt({ ...filt, audience: e.target.value }), setPage(1))}
          >
            <option value="">All audiences</option>
            {aud.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          {sel.size > 0 && (
            <div className="flex items-center gap-2 sm:ml-auto">
              <Badge tone="brand">{sel.size} selected</Badge>
              <button className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={() => setSel(new Set())}>
                Clear
              </button>
              <button
                className={buttonStyles({ variant: "dark", size: "sm" })}
                onClick={() => {
                  setScope("selected");
                  setView("compose");
                }}
              >
                <Mail />
                Email selected
              </button>
            </div>
          )}
        </div>

        {edit && (
          <Card
            title={edit.id ? "Edit contact" : "Add contact"}
            actions={
              <button className={buttonStyles({ variant: "ghost", size: "xs" })} aria-label="Close" onClick={() => setEdit(null)}>
                <X />
              </button>
            }
            footer={
              <div className="flex justify-end gap-2">
                <button className={GHOST} onClick={() => setEdit(null)}>
                  Close
                </button>
                <button
                  className={PRIMARY}
                  onClick={() =>
                    start(async () => {
                      const r = await mktUpsert(edit);
                      if (!r.ok) return show(r.error || "Save failed", true);
                      show("Saved");
                      setEdit(null);
                      load();
                      loadHist();
                    })
                  }
                >
                  <Save />
                  Save
                </button>
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="First name" v={edit.first_name} on={(v) => setEdit({ ...edit, first_name: v })} />
              <Field label="Last name" v={edit.last_name} on={(v) => setEdit({ ...edit, last_name: v })} />
              <Field label="Email" type="email" v={edit.email} on={(v) => setEdit({ ...edit, email: v })} />
              <div>
                <label className={labelStyles}>Status</label>
                <select className={selectStyles} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                  <option>Active</option>
                  <option>Trashed</option>
                  <option>Unsubscribed</option>
                </select>
              </div>
              <Field label="Birthday" type="date" v={edit.birthday} on={(v) => setEdit({ ...edit, birthday: v })} />
              <div>
                <label className={labelStyles}>Audience</label>
                <div className="flex gap-2">
                  <select className={selectStyles} value={edit.audience} onChange={(e) => setEdit({ ...edit, audience: e.target.value })}>
                    <option value="">— none —</option>
                    {aud.map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                  <button
                    className={GHOST}
                    onClick={async () => {
                      const n = await addAudience();
                      if (n) setEdit({ ...edit, audience: n });
                    }}
                  >
                    <Plus />
                    Add new
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className={WRAP}>
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={cn(tableCls.th, "w-10 pr-0")}>
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      className={checkboxStyles}
                      checked={data.rows.length > 0 && data.rows.every((r) => sel.has(r.id))}
                      onChange={(e) => {
                        const s = new Set(sel);
                        data.rows.forEach((r) => (e.target.checked ? s.add(r.id) : s.delete(r.id)));
                        setSel(s);
                      }}
                    />
                  </th>
                  {["Name", "Email", "Source", "Status", "Audience", "Birthday", "Case", "Actions"].map((h) => (
                    <th key={h} className={cn(tableCls.th, h === "Actions" && "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className={cn(tableCls.tr, sel.has(r.id) && "bg-brand-50/40")}>
                    <td className={cn(tableCls.td, "pr-0")}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.email}`}
                        className={checkboxStyles}
                        checked={sel.has(r.id)}
                        onChange={(e) => {
                          const s = new Set(sel);
                          if (e.target.checked) s.add(r.id);
                          else s.delete(r.id);
                          setSel(s);
                        }}
                      />
                    </td>
                    <td className={tableCls.td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.full_name || r.email} size="sm" />
                        <span className="font-medium whitespace-nowrap text-slate-900">{r.full_name || "—"}</span>
                      </div>
                    </td>
                    <td className={cn(tableCls.td, "text-slate-600")}>{r.email}</td>
                    <td className={tableCls.td}>
                      <Badge tone={r.source === "case" ? "info" : "neutral"}>{r.source === "case" ? "From case" : "Manual"}</Badge>
                    </td>
                    <td className={tableCls.td}>
                      <Badge dot tone={statusTone(r.status)}>
                        {r.status}
                      </Badge>
                    </td>
                    <td className={tableCls.td}>{r.audience ? <Badge tone="violet">{r.audience}</Badge> : <span className="text-slate-400">—</span>}</td>
                    <td className={cn(tableCls.td, "whitespace-nowrap tabular-nums")}>{r.birthday || <span className="text-slate-400">—</span>}</td>
                    <td className={tableCls.td}>
                      {r.case_id ? (
                        <Link href={`/admin/cases/${r.case_id}`} className="font-medium text-brand-700 hover:underline">
                          #{r.case_id}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={cn(tableCls.td, "text-right whitespace-nowrap")}>
                      <span className="inline-flex items-center gap-1">
                        <button
                          className={XS}
                          onClick={() =>
                            setEdit({
                              id: r.id,
                              first_name: r.first_name,
                              last_name: r.last_name,
                              email: r.email,
                              status: r.status,
                              audience: r.audience,
                              birthday: r.birthday,
                            })
                          }
                        >
                          <Pencil />
                          Edit
                        </button>
                        <button
                          title="Delete"
                          aria-label="Delete"
                          className={buttonStyles({
                            variant: "ghost",
                            size: "xs",
                            className: "text-red-600 hover:bg-red-50 hover:text-red-700",
                          })}
                          onClick={async () => {
                            if (!confirm("Move this contact to Trash?")) return;
                            const x = await mktDelete(r.id);
                            if (x.ok) {
                              show("Moved to Trash");
                              load();
                            } else show("Delete failed", true);
                          }}
                        >
                          <Trash2 />
                        </button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.rows.length === 0 && (
            <EmptyState
              className="rounded-none border-0"
              icon={<Users />}
              title="No contacts match these filters"
              description="Try a different search or filter, sync contacts from cases, or add one manually."
            />
          )}
          <Pager
            label={`${data.total} contacts`}
            page={page}
            pages={pages}
            prev={page > 1 ? () => setPage(page - 1) : undefined}
            next={page < pages ? () => setPage(page + 1) : undefined}
          />
        </div>
      </div>

      {/* ============ Composer ============ */}
      <div role="tabpanel" hidden={view !== "compose"}>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card
            title="Email composer (Zoho)"
            description="Insert loads subject+body so you can edit placeholders."
            footer={
              <p className="text-xs text-slate-500">
                Placeholders: <Code>{"{{first_name}}"}</Code>, <Code>{"{{full_name}}"}</Code>, <Code>{"{{site_name}}"}</Code>, plus case placeholders when a
                contact is linked to a case.
              </p>
            }
          >
            <div className="space-y-4">
              <div>
                <label className={labelStyles} htmlFor="mkt-tpl">
                  Template (optional)
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select id="mkt-tpl" className={cn(selectStyles, "sm:flex-1")} value={tpl} onChange={(e) => setTpl(e.target.value)}>
                    <option value="">— no template —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      className={GHOST}
                      onClick={async () => {
                        if (!tpl) return show("Choose a template first", true);
                        const r = await mktTplLoad(Number(tpl));
                        if (!r.ok) return show("Could not load template", true);
                        setSubject(r.subject);
                        setBody(r.body);
                        show("Template inserted");
                      }}
                    >
                      <FileText />
                      Insert template
                    </button>
                    <button
                      className={GHOST}
                      onClick={async () => {
                        const s = await mktSignature();
                        if (!s) return show("No signature configured", true);
                        setBody((b) => b + "<div><br></div>" + s);
                        show("Signature inserted");
                      }}
                    >
                      <PenLine />
                      Insert signature
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className={labelStyles} htmlFor="mkt-subject">
                  Subject
                </label>
                <input
                  id="mkt-subject"
                  className={inputStyles}
                  placeholder="Subject (per-contact after merge)"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className={labelStyles} htmlFor="mkt-body">
                  Message
                </label>
                <textarea
                  id="mkt-body"
                  className={cn(textareaStyles, "min-h-[360px] font-mono text-[13px] leading-relaxed")}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            </div>
          </Card>

          <div className="min-w-0 space-y-4">
            <Card
              title="Recipients"
              description={
                <>
                  Choose a scope and click <b>Load recipients</b>. Deselect any before sending.
                </>
              }
            >
              <div className="space-y-1.5">
                {[
                  ["selected", "Selected rows", sel.size ? `${sel.size} ticked` : "none ticked"],
                  ["all", "All contacts", ""],
                  ["source", "By source", ""],
                  ["filters", "By current filters", ""],
                  ["audience", "By audience", ""],
                ].map(([k, l, hint]) => (
                  <label
                    key={k}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors",
                      scope === k ? "border-brand-300 bg-brand-50/60 text-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <input type="radio" name="mkt-scope" className="accent-brand-600" checked={scope === k} onChange={() => setScope(k)} />
                    <span className="flex-1 font-medium">{l}</span>
                    {hint && <span className="text-xs text-slate-500">{hint}</span>}
                  </label>
                ))}
              </div>
              {(scope === "source" || scope === "filters" || scope === "audience") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {scope === "source" && (
                    <select className={cn(selectStyles, "!w-auto")} value={scSource} onChange={(e) => setScSource(e.target.value)}>
                      <option value="">Any source</option>
                      <option value="case">From cases</option>
                      <option value="manual">Manually added</option>
                    </select>
                  )}
                  {(scope === "filters" || scope === "source") && (
                    <select className={cn(selectStyles, "!w-auto")} value={scStatus} onChange={(e) => setScStatus(e.target.value)}>
                      <option value="">Any status</option>
                      <option>Active</option>
                      <option>Trashed</option>
                      <option>Unsubscribed</option>
                    </select>
                  )}
                  <div className="relative">
                    <button className={GHOST} onClick={() => setAudOpen((o) => !o)}>
                      <Users />
                      Pick audiences {scAud.length ? `(${scAud.length} selected)` : "(any)"}
                    </button>
                    {audOpen && (
                      <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl sm:right-auto sm:left-0">
                        {aud.length === 0 && <p className="text-xs text-slate-500">No audiences yet</p>}
                        <div className="max-h-56 space-y-1.5 overflow-y-auto">
                          {aud.map((a) => (
                            <label key={a} className="flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                className={checkboxStyles}
                                checked={scAud.includes(a)}
                                onChange={(e) => setScAud(e.target.checked ? [...scAud, a] : scAud.filter((x) => x !== a))}
                              />{" "}
                              {a}
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex gap-1 border-t border-slate-100 pt-2">
                          <button className={XS} onClick={() => setScAud(aud)}>
                            All
                          </button>
                          <button className={XS} onClick={() => setScAud([])}>
                            None
                          </button>
                          <button className={cn(XS, "ml-auto")} onClick={() => setAudOpen(false)}>
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button className={cn(GHOST, "mt-3 w-full")} disabled={pending} onClick={loadRecipients}>
                <Users />
                Load recipients
              </button>
              {recips && (
                <div className="mt-3 rounded-lg border border-slate-200">
                  {recips.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">No recipients match this scope.</p>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-900 tabular-nums">{recips.filter((r) => r.on).length} recipients loaded</span>
                        <button className={cn(XS, "ml-auto")} onClick={() => setRecips(recips.map((r) => ({ ...r, on: true })))}>
                          Select all
                        </button>
                        <button className={XS} onClick={() => setRecips(recips.map((r) => ({ ...r, on: false })))}>
                          None
                        </button>
                      </div>
                      <div className="max-h-60 space-y-1 overflow-y-auto p-2 text-sm">
                        {recips.map((r, i) => (
                          <label key={r.id} className="flex items-center gap-2 truncate rounded px-1.5 py-1 text-slate-700 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              className={checkboxStyles}
                              checked={r.on}
                              onChange={(e) => setRecips(recips.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))}
                            />{" "}
                            {r.email}
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card title="Send">
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" className={checkboxStyles} checked={incSig} onChange={(e) => setIncSig(e.target.checked)} /> Include default signature
                </label>
                <label className="flex items-center gap-2.5 text-sm text-slate-700">
                  <input type="checkbox" className={checkboxStyles} checked={incUnsub} onChange={(e) => setIncUnsub(e.target.checked)} /> Include unsubscribe
                  link
                </label>
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  className={GHOST}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      if (!me) return show("No user email found", true);
                      const r = await mktSendTest({
                        to: me,
                        template_id: Number(tpl) || 0,
                        subject,
                        body,
                        include_sig: incSig,
                      });
                      if (r.ok) {
                        show(`Test sent to ${me}`);
                        loadHist();
                      } else show("Test failed", true);
                    })
                  }
                >
                  <FlaskConical />
                  Send test to me
                </button>
                <button
                  className={buttonStyles({ variant: "primary", size: "lg" })}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const ids = (recips ?? []).filter((r) => r.on).map((r) => r.id);
                      if (!ids.length) return show("No recipients selected", true);
                      const r = await mktSend({
                        ids,
                        template_id: Number(tpl) || 0,
                        subject,
                        body,
                        include_sig: incSig,
                        include_unsub: incUnsub,
                      });
                      if (r.ok) {
                        show(`Sent ${r.sent} emails` + (r.errors.length ? ` (${r.errors.length} failed)` : ""), r.errors.length > 0 && !r.sent);
                        loadHist();
                      } else show(r.error || "Send failed", true);
                    })
                  }
                >
                  <Send />
                  Send
                  {onCount > 0 && <span className="rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{onCount}</span>}
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* ============ Birthday ============ */}
      <div role="tabpanel" hidden={view !== "birthday"}>
        <Card
          className="max-w-3xl"
          title={
            <span className="flex items-center gap-2">
              Birthday automation
              <Badge dot tone={bday.enabled ? "success" : "neutral"}>
                {bday.enabled ? "On" : "Off"}
              </Badge>
            </span>
          }
          description="Sends the chosen template every year to contacts with a birthday today (Active status). Uses Zoho. “Send test” actually runs today’s send."
          footer={
            <div className="flex flex-wrap justify-end gap-2">
              <button
                className={GHOST}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    if (!bday.template_id) return show("Pick a birthday template first", true);
                    const r = await mktBdayTest(bday.template_id);
                    if (!r.ok) return show(r.error || "Run failed", true);
                    show(`Birthday run: ${r.sent} sent${r.total !== r.sent ? ` of ${r.total}` : ""}${r.notified ? ` — ${r.notified} admin notice(s)` : ""}`);
                    loadHist();
                  })
                }
              >
                <FlaskConical />
                Send test birthday
              </button>
              {isAdmin && (
                <button
                  className={PRIMARY}
                  onClick={async () => {
                    const r = await mktBdaySave({
                      enabled: !!bday.enabled,
                      template_id: bday.template_id,
                      hour: bday.hour,
                    });
                    if (r.ok) show("Birthday automation saved");
                  }}
                >
                  <Save />
                  Save
                </button>
              )}
            </div>
          }
        >
          <label
            className={cn(
              "mb-5 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700",
              isAdmin && "cursor-pointer",
            )}
          >
            <input
              type="checkbox"
              className={checkboxStyles}
              checked={!!bday.enabled}
              disabled={!isAdmin}
              onChange={(e) => setBday({ ...bday, enabled: e.target.checked ? 1 : 0 })}
            />
            <span className="font-medium">Enable</span>
            {!isAdmin && <span className="ml-auto text-xs text-slate-500">Admins only</span>}
          </label>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div>
              <label className={labelStyles} htmlFor="mkt-bday-tpl">
                Template
              </label>
              <select
                id="mkt-bday-tpl"
                className={selectStyles}
                value={bday.template_id || ""}
                onChange={(e) => setBday({ ...bday, template_id: Number(e.target.value) || 0 })}
              >
                <option value="">— Select template —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelStyles} htmlFor="mkt-bday-hour">
                Send at
              </label>
              <select id="mkt-bday-hour" className={selectStyles} value={bday.hour} onChange={(e) => setBday({ ...bday, hour: Number(e.target.value) })}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <p className={hintStyles}>Sydney time</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ============ History ============ */}
      <div role="tabpanel" hidden={view !== "history"}>
        <div className={WRAP}>
          <div className="overflow-x-auto">
            <table className={tableCls.table}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Time</th>
                  <th className={tableCls.th}>Type</th>
                  <th className={tableCls.th}>Note / Subject</th>
                </tr>
              </thead>
              <tbody>
                {hist.rows.map((h) => (
                  <tr key={h.id} className={tableCls.tr}>
                    <td className={cn(tableCls.td, "align-top whitespace-nowrap text-slate-500 tabular-nums")}>
                      {new Date(h.ts).toLocaleString("en-AU", {
                        timeZone: "Australia/Sydney",
                      })}
                    </td>
                    <td className={cn(tableCls.td, "align-top")}>
                      <Badge tone="neutral">{h.type}</Badge>
                    </td>
                    <td className={cn(tableCls.td, "align-top")}>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>
                          {h.note}
                          {h.subject && (
                            <>
                              {" "}
                              — <strong className="text-slate-900">{h.subject}</strong>
                            </>
                          )}
                        </span>
                        {h.has_content && (
                          <button className={XS} onClick={async () => setModal(await mktHistoryView(h.id))}>
                            <Eye />
                            View contents
                          </button>
                        )}
                      </div>
                      {h.recipients.length > 0 && (
                        <details className="mt-1.5 text-xs text-slate-600">
                          <summary className="cursor-pointer font-medium text-brand-700 hover:underline">Show recipients ({h.recipients.length})</summary>
                          <p className="mt-1 break-words">
                            {h.recipients.join(", ")}
                            {h.truncated && " … (truncated)"}
                          </p>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hist.rows.length === 0 && (
            <EmptyState
              className="rounded-none border-0"
              icon={<History />}
              title="No events yet"
              description="Sends, tests and contact changes will be logged here."
            />
          )}
          <Pager
            label={`${hist.total} events`}
            page={Math.floor(hOff / logPer) + 1}
            pages={hPages}
            prev={hOff > 0 ? () => setHOff(Math.max(0, hOff - logPer)) : undefined}
            next={hOff + logPer < hist.total ? () => setHOff(hOff + logPer) : undefined}
          />
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onClick={() => setModal(null)}>
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
              <Mail className="size-4 text-slate-400" />
              <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-900">{modal.subject || "Email content"}</h3>
              <button className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={() => setModal(null)}>
                <X />
                Close
              </button>
            </div>
            <div className="overflow-auto bg-slate-50 p-4">
              <iframe
                title="Email content"
                sandbox=""
                className="h-[60vh] w-full rounded-lg border border-slate-200 bg-white"
                srcDoc={modal.body || "<em>Empty</em>"}
              />
            </div>
          </div>
        </div>
      )}
      {node}
    </div>
  );
}

function Pager({ label, page, pages, prev, next }: { label: string; page: number; pages: number; prev?: () => void; next?: () => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-sm text-slate-600">
      <span className="tabular-nums">{label}</span>
      <span className="ml-auto tabular-nums">
        Page {page} / {pages}
      </span>
      <div className="flex gap-1">
        <button className={XS} disabled={!prev} onClick={prev} aria-label="Previous page">
          <ChevronLeft />
          Prev
        </button>
        <button className={XS} disabled={!next} onClick={next} aria-label="Next page">
          Next
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-700">{children}</code>;
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className={labelStyles}>{label}</label>
      <input type={type} className={inputStyles} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
