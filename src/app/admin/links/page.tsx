import { requireAdmin, requireStaff } from "@/lib/session";
import { ExternalLink, Link2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Alert, Badge, buttonStyles, Card, checkboxStyles, EmptyState, Field, inputStyles, LinkButton, PageHeader, tableCls, textareaStyles } from "@/components/admin/ui";
import { ConfirmButton } from "@/modules/crm-extra/ui/client";
import { getLinks } from "@/modules/crm-extra/lib/links";
import { linkCreate, linkUpdate, linkDelete } from "@/modules/crm-extra/actions/links";
import LinkOpen from "@/modules/crm-extra/components/LinkOpen";
import CustomLinks from "@/modules/crm-extra/components/CustomLinks";

export const metadata = { title: "Custom Links" };
export const dynamic = "force-dynamic";

export default async function LinksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const sp = await searchParams;
  const links = await getLinks();
  // Non-admins get the launchpad view only (manager is manage_options in WP).
  if (s.role !== "ADMIN")
    return (
      <div>
        <PageHeader icon={<Link2 />} title="Custom Links" description="Handy lender portals, calculators and tools in one place." />
        <CustomLinks />
      </div>
    );
  await requireAdmin();
  const editing = sp.edit ? links.find((l) => l.id === sp.edit) : undefined;
  const desc = (
    <>
      Click the URL to open normally. Use the <b className="font-semibold text-slate-700">Open</b> button to follow your preferred behavior (modal vs new tab). Shortcode:{" "}
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">[mmcrm_links]</code> →{" "}
      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">&lt;CustomLinks /&gt;</code>
    </>
  );
  const delBtn = buttonStyles({ variant: "ghost", size: "xs", className: "text-red-600 hover:bg-red-50 hover:text-red-700" });
  return (
    <div>
      <PageHeader
        icon={<Link2 />}
        title="Custom Links"
        description={desc}
        actions={
          <LinkButton variant="primary" href="/admin/links#mmx-link-form">
            <Plus /> Add link
          </LinkButton>
        }
      />
      {sp.updated && (
        <Alert tone="success" className="mb-4">
          Saved.
        </Alert>
      )}
      {sp.deleted && (
        <Alert tone="danger" className="mb-4">
          Deleted.
        </Alert>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {links.length === 0 ? (
            <EmptyState icon={<Link2 />} title="No links yet — add one below." description="Links you add appear on the launchpad for every staff member." />
          ) : (
            <>
              <div className={`${tableCls.wrap} hidden md:block`}>
                <table className={tableCls.table}>
                  <thead className={tableCls.thead}>
                    <tr>
                      {["Label / URL", "Group", "Open", "Actions"].map((h) => (
                        <th key={h} className={`${tableCls.th} ${h === "Actions" ? "text-right" : ""}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((l) => (
                      <tr key={l.id} className={`${tableCls.tr} ${editing?.id === l.id ? "bg-brand-50/50" : ""}`}>
                        <td className={tableCls.td}>
                          <div className="max-w-[340px] min-w-[200px]">
                            <div className="font-medium text-slate-900">{l.label || <span className="font-normal text-slate-400">(no label)</span>}</div>
                            {l.url ? (
                              <a
                                href={l.url}
                                target={l.target ? "_blank" : undefined}
                                rel={l.target ? "noopener" : undefined}
                                className="mt-0.5 flex items-center gap-1 text-xs text-brand-700 hover:text-brand-800 hover:underline"
                              >
                                <span className="truncate">{l.url}</span>
                                {!!l.target && <ExternalLink className="size-3 shrink-0" />}
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className={tableCls.td}>{l.group ? <Badge>{l.group}</Badge> : <span className="text-slate-400">—</span>}</td>
                        <td className={tableCls.td}>
                          <Badge tone={l.modal ? "violet" : "neutral"}>{l.modal ? "Modal" : "Link"}</Badge>
                        </td>
                        <td className={`${tableCls.td} whitespace-nowrap`}>
                          <div className="flex justify-end gap-1">
                            {l.url && <LinkOpen url={l.url} label={l.label} modal={!!l.modal} target={!!l.target} />}
                            <LinkButton href={`/admin/links?edit=${l.id}#mmx-link-form`} variant="ghost" size="xs" title="Edit" aria-label="Edit">
                              <Pencil />
                            </LinkButton>
                            <form action={linkDelete}>
                              <input type="hidden" name="id" value={l.id} />
                              <ConfirmButton className={delBtn} confirm="Delete this link?">
                                <Trash2 aria-label="Delete" />
                              </ConfirmButton>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 md:hidden">
                {links.map((l) => (
                  <div key={l.id} className="rounded-xl border border-slate-200/80 bg-white p-4 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1 font-semibold text-slate-900">{l.label || "(no label)"}</div>
                      <Badge tone={l.modal ? "violet" : "neutral"}>{l.modal ? "Modal" : "Link"}</Badge>
                    </div>
                    <div className="mt-0.5 text-xs break-all text-slate-500">{l.url}</div>
                    <div className="mt-3 flex gap-1">
                      {l.url && <LinkOpen url={l.url} label={l.label} modal={!!l.modal} target={!!l.target} />}
                      <LinkButton href={`/admin/links?edit=${l.id}#mmx-link-form`} variant="secondary" size="xs">
                        <Pencil /> Edit
                      </LinkButton>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <Card
          id="mmx-link-form"
          className="xl:sticky xl:top-6"
          title={editing ? "Edit Link" : "Add New Link"}
          description={editing ? `Editing “${editing.label || editing.url}”` : "Add a link to the shared launchpad."}
        >
          <form key={editing?.id ?? "new"} action={editing ? linkUpdate : linkCreate} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <input type="hidden" name="modal_present" value="1" />
            <Field label="Label" htmlFor="ln-label" required>
              <input id="ln-label" name="label" required defaultValue={editing?.label} className={inputStyles} />
            </Field>
            <Field label="URL" htmlFor="ln-url" required>
              <input id="ln-url" name="url" type="url" required defaultValue={editing?.url} placeholder="https://…" className={inputStyles} />
            </Field>
            <Field label="Group (optional)" htmlFor="ln-group">
              <input id="ln-group" name="group" defaultValue={editing?.group} className={inputStyles} />
            </Field>
            <Field label="Order" htmlFor="ln-order">
              <input id="ln-order" name="order" type="number" min={0} defaultValue={editing?.order ?? 0} className={inputStyles} />
            </Field>
            <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:col-span-2 xl:col-span-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="target" value="1" defaultChecked={!!editing?.target} className={checkboxStyles} /> Open URL in new tab
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="modal" value="1" defaultChecked={editing ? !!editing.modal : true} className={checkboxStyles} /> Use modal for “Open” button
              </label>
              <p className="text-xs text-slate-500">
                Tip: Clicking the URL always uses the new-tab setting above. The <b className="font-semibold">Open</b> button uses the modal setting.
              </p>
            </div>
            <Field label="Notes (optional)" htmlFor="ln-notes" className="sm:col-span-2 xl:col-span-1">
              <textarea id="ln-notes" name="notes" rows={2} defaultValue={editing?.notes} className={textareaStyles} />
            </Field>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <button className={buttonStyles({ variant: "primary" })}>
                {editing ? <Save /> : <Plus />}
                {editing ? "Update Link" : "Add Link"}
              </button>
              {editing && (
                <LinkButton href="/admin/links" variant="secondary">
                  Cancel
                </LinkButton>
              )}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
