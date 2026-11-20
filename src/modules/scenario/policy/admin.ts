"use server";
// Lender policy admin — server actions. Staff create/edit drafts; ADMIN publishes, supersedes,
// withdraws and controls panel membership. Published rule/price versions are never mutated:
// editing creates a new draft version with the same ruleKey/recordKey.
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/session";
import { deleteStoredFile, saveFormFile } from "@/lib/storage";
import { FEATURES } from "../facts";
import { getScenarioSettings } from "../settings";
import { CATEGORIES, CHECKS, parseParams } from "./checks";
import { bool, errMessage, fail, many, oneOf, optDate, optInt, optNum, reqNum, text } from "./form";
import { BASE, OCCUPANCIES, PRICING_TYPES, PURPOSES, RATE_TYPES, REPAYMENT_TYPES, SOURCE_KINDS, addDaysSydney, withQuery } from "./meta";

type Done = { to: string; msg: string };

function go(path: string, msg: string, kind: "msg" | "err" = "msg"): never {
  revalidatePath(BASE, "layout");
  redirect(withQuery(path, { [kind]: msg }));
}

/** Runs fn; validation / DB errors redirect to errPath with ?err=, success to result.to with ?msg=. */
async function run(errPath: string, fn: () => Promise<Done>): Promise<never> {
  let r!: Done;
  try {
    r = await fn();
  } catch (e) {
    go(errPath, errMessage(e), "err");
  }
  go(r.to, r.msg);
}

/** Copy of a row without id / timestamps (for creating the next version). */
function omitMeta<T extends { id: number; createdAt: Date; updatedAt: Date }>(row: T): Omit<T, "id" | "createdAt" | "updatedAt"> {
  const copy: Partial<T> = { ...row };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return copy as Omit<T, "id" | "createdAt" | "updatedAt">;
}

const newKey = (p: string) => `${p}_${randomBytes(5).toString("hex")}`;
const idOf = (fd: FormData) => optInt(fd, "id", "id");

async function assertCase(caseId: number | null) {
  if (caseId === null) return;
  const c = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!c) fail(`Case #${caseId} not found`);
}

/* ================================================================ lenders */

export async function saveLenderAction(fd: FormData) {
  const s = await requireStaff();
  const id = idOf(fd);
  await run(id ? `${BASE}/lenders/${id}` : `${BASE}/lenders/new`, async () => {
    const name = text(fd, "name", 120);
    const code = text(fd, "code", 40).toUpperCase();
    if (!name) fail("Lender name is required");
    if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(code)) fail("Code: letters, numbers, - or _ only (e.g. LDR-A)");
    if (await prisma.scnLender.findFirst({ where: { code, ...(id ? { NOT: { id } } : {}) } })) fail(`Code ${code} is already used by another lender`);
    const data: Prisma.ScnLenderUncheckedCreateInput = {
      name, code, accredited: bool(fd, "accredited"), notes: text(fd, "notes", 4000), sort: optInt(fd, "sort", "Sort order") ?? 0,
    };
    // Panel membership changes which lenders every assessment considers → ADMIN only.
    if (s.role === "ADMIN") data.onPanel = bool(fd, "onPanel");
    else if (!id) data.onPanel = false;
    if (id) {
      if (!(await prisma.scnLender.findUnique({ where: { id } }))) fail("Lender not found");
      await prisma.scnLender.update({ where: { id }, data });
      return { to: `${BASE}/lenders/${id}`, msg: "Lender saved." };
    }
    const l = await prisma.scnLender.create({ data });
    return { to: `${BASE}/lenders/${l.id}`, msg: s.role === "ADMIN" ? "Lender created." : "Lender created (not on panel — an admin adds it to the panel)." };
  });
}

export async function deleteLenderAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(id ? `${BASE}/lenders/${id}` : BASE, async () => {
    if (!id) fail("Missing lender");
    const [r, p, src] = await Promise.all([
      prisma.scnPolicyRule.count({ where: { lenderId: id! } }),
      prisma.scnPriceRecord.count({ where: { lenderId: id! } }),
      prisma.scnSource.count({ where: { lenderId: id! } }),
    ]);
    if (r + p + src) fail(`Can't delete: ${r} rule, ${p} price and ${src} source records reference this lender. Untick "On panel" instead.`);
    await prisma.scnLender.delete({ where: { id: id! } });
    return { to: `${BASE}?tab=lenders`, msg: "Lender deleted." };
  });
}

export async function saveProductAction(fd: FormData) {
  await requireStaff();
  const id = idOf(fd);
  const lenderId = optInt(fd, "lenderId", "Lender");
  const errTo = lenderId ? withQuery(`${BASE}/lenders/${lenderId}`, { product: id ?? "new" }) : BASE;
  await run(errTo, async () => {
    if (!lenderId || !(await prisma.scnLender.findUnique({ where: { id: lenderId } }))) fail("Lender not found");
    const name = text(fd, "name", 160);
    const code = text(fd, "code", 40).toUpperCase();
    if (!name) fail("Product name is required");
    if (!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(code)) fail("Product code: letters, numbers, - or _ only");
    if (await prisma.scnProduct.findFirst({ where: { code, ...(id ? { NOT: { id } } : {}) } })) fail(`Product code ${code} is already in use`);
    const purposes = many(fd, "purposes", PURPOSES);
    const occupancies = many(fd, "occupancies", OCCUPANCIES);
    const repaymentTypes = many(fd, "repaymentTypes", REPAYMENT_TYPES);
    if (!purposes.length || !occupancies.length || !repaymentTypes.length) fail("Pick at least one purpose, occupancy and repayment type");
    const minLoan = optNum(fd, "minLoan", "Min loan", 0, 100_000_000);
    const maxLoan = optNum(fd, "maxLoan", "Max loan (product limit)", 0, 100_000_000);
    if (minLoan !== null && maxLoan !== null && minLoan > maxLoan) fail("Min loan is above the max loan");
    const data = {
      lenderId: lenderId!, name, code, purposes, occupancies, repaymentTypes,
      rateType: oneOf(fd, "rateType", RATE_TYPES, "Rate type", "variable"),
      features: many(fd, "features", FEATURES), minLoan, maxLoan, active: bool(fd, "active"), notes: text(fd, "notes", 4000),
    };
    if (id) {
      const p = await prisma.scnProduct.findUnique({ where: { id } });
      if (!p) fail("Product not found");
      if (p!.lenderId !== lenderId) {
        const used = await prisma.scnPolicyRule.count({ where: { productId: id } }) + (await prisma.scnPriceRecord.count({ where: { productId: id } }));
        if (used) fail("Can't move a product with rules or prices to another lender");
      }
      await prisma.scnProduct.update({ where: { id }, data });
    } else await prisma.scnProduct.create({ data });
    return { to: `${BASE}/lenders/${lenderId}`, msg: id ? "Product saved." : "Product added." };
  });
}

export async function deleteProductAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  const lenderId = optInt(fd, "lenderId", "Lender");
  await run(lenderId ? `${BASE}/lenders/${lenderId}` : BASE, async () => {
    if (!id) fail("Missing product");
    const used = (await prisma.scnPolicyRule.count({ where: { productId: id! } })) + (await prisma.scnPriceRecord.count({ where: { productId: id! } }));
    if (used) fail(`Can't delete: ${used} rule/price records reference this product. Untick "Active" instead.`);
    await prisma.scnProduct.delete({ where: { id: id! } });
    return { to: `${BASE}/lenders/${lenderId}`, msg: "Product deleted." };
  });
}

/* ================================================================ sources */

const MAX_FILE = 20 * 1024 * 1024;

export async function saveSourceAction(fd: FormData) {
  const s = await requireStaff();
  const id = idOf(fd);
  await run(id ? `${BASE}/sources/${id}` : withQuery(`${BASE}/sources/new`, { lender: text(fd, "lenderId", 10) }), async () => {
    const existing = id ? await prisma.scnSource.findUnique({ where: { id } }) : null;
    if (id && !existing) fail("Source not found");
    if (existing && existing.status !== "draft") {
      if (existing.status !== "published") fail(`A ${existing.status} source is read-only. Register a new source instead.`);
      if (s.role !== "ADMIN") fail("Only an admin can edit a published source.");
    }
    const kind = oneOf(fd, "kind", SOURCE_KINDS, "Kind");
    const lenderId = optInt(fd, "lenderId", "Lender");
    if (lenderId && !(await prisma.scnLender.findUnique({ where: { id: lenderId } }))) fail("Lender not found");
    const title = text(fd, "title", 200);
    if (!title) fail("Title is required");
    const url = text(fd, "url", 1000);
    if (url && !/^https?:\/\/\S+$/i.test(url)) fail("URL must start with http:// or https://");
    const excerpt = text(fd, "excerpt", 20000);
    if (kind === "bdm_confirmation" && !excerpt) fail("Paste the BDM's written confirmation into Excerpt — it is required for BDM confirmations");
    const caseId = optInt(fd, "caseId", "Case");
    await assertCase(caseId);
    const permStore = bool(fd, "permStore");
    if (existing?.status === "published" && !permStore) fail("A published source must keep storage permission. Withdraw it instead.");
    const file = fd.get("file");
    const upload = file instanceof File && file.size > 0 ? file : null;
    if (upload && upload.size > MAX_FILE) fail("File too large (max 20 MB)");
    const data = {
      kind, lenderId, title, reference: text(fd, "reference", 200), url, excerpt, caseId, bdmName: text(fd, "bdmName", 160),
      receivedAt: optDate(fd, "receivedAt", "Received"), permStore, permAi: bool(fd, "permAi"), permNote: text(fd, "permNote", 2000),
    };
    const row = existing ? await prisma.scnSource.update({ where: { id: existing.id }, data }) : await prisma.scnSource.create({ data: { ...data, createdBy: s.name } });
    const removeOld = existing?.fileId && existing.status === "draft" ? existing.fileId : null;
    if (upload) {
      const f = await saveFormFile(upload, "scenario-sources", `scn-source:${row.id}`);
      await prisma.scnSource.update({ where: { id: row.id }, data: { fileId: f.id } });
      if (removeOld) await deleteStoredFile(removeOld);
    } else if (bool(fd, "removeFile") && removeOld) {
      await prisma.scnSource.update({ where: { id: row.id }, data: { fileId: null } });
      await deleteStoredFile(removeOld);
    }
    return { to: `${BASE}/sources/${row.id}`, msg: existing ? "Source saved." : "Source registered as a draft." };
  });
}

export async function publishSourceAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/sources/${id}`, async () => {
    const src = id ? await prisma.scnSource.findUnique({ where: { id } }) : null;
    if (!src) fail("Source not found");
    if (src!.status !== "draft") fail(`Only draft sources can be published (this one is ${src!.status})`);
    if (!src!.permStore) fail("Can't publish: confirm permission to store/index this material first");
    if (src!.kind === "bdm_confirmation" && !src!.excerpt.trim()) fail("Can't publish: a BDM confirmation needs the written excerpt");
    await prisma.scnSource.update({ where: { id: src!.id }, data: { status: "published" } });
    return { to: `${BASE}/sources/${src!.id}`, msg: src!.permAi ? "Source published." : "Source published. AI transmission is not permitted, so its extracts will not be sent to the AI provider." };
  });
}

async function retireSource(fd: FormData, to: "superseded" | "withdrawn") {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/sources/${id}`, async () => {
    const src = id ? await prisma.scnSource.findUnique({ where: { id } }) : null;
    if (!src) fail("Source not found");
    if (to === "superseded" && src!.status !== "published") fail("Only a published source can be superseded");
    if (to === "withdrawn" && !["draft", "published"].includes(src!.status)) fail(`Source is already ${src!.status}`);
    await prisma.scnSource.update({ where: { id: src!.id }, data: { status: to } });
    const [r, p] = await Promise.all([
      prisma.scnPolicyRule.count({ where: { sourceId: src!.id, status: "published" } }),
      prisma.scnPriceRecord.count({ where: { sourceId: src!.id, status: "published" } }),
    ]);
    const tail = r + p ? ` ${r} published rule(s) and ${p} price record(s) on it are no longer used by assessments — re-key them to the new source.` : "";
    return { to: `${BASE}/sources/${src!.id}`, msg: `Source ${to}.${tail}` };
  });
}
export async function supersedeSourceAction(fd: FormData) {
  await retireSource(fd, "superseded");
}
export async function withdrawSourceAction(fd: FormData) {
  await retireSource(fd, "withdrawn");
}

export async function deleteSourceAction(fd: FormData) {
  await requireStaff();
  const id = idOf(fd);
  await run(`${BASE}/sources/${id}`, async () => {
    const src = id ? await prisma.scnSource.findUnique({ where: { id } }) : null;
    if (!src) fail("Source not found");
    if (src!.status !== "draft") fail("Only draft sources can be deleted — withdraw a published source instead");
    const used = (await prisma.scnPolicyRule.count({ where: { sourceId: src!.id } })) + (await prisma.scnPriceRecord.count({ where: { sourceId: src!.id } }));
    if (used) fail(`Can't delete: ${used} rule/price records cite this source`);
    await prisma.scnSource.delete({ where: { id: src!.id } });
    if (src!.fileId) await deleteStoredFile(src!.fileId);
    return { to: `${BASE}?tab=sources`, msg: "Draft source deleted." };
  });
}

/** Creates draft versions of every published rule/price on `fromId`, pointing at `toId` (to be re-verified and published). */
export async function rekeySourceAction(fd: FormData) {
  const s = await requireStaff();
  const fromId = optInt(fd, "id", "Source");
  const toId = optInt(fd, "toSourceId", "New source");
  await run(`${BASE}/sources/${fromId}`, async () => {
    const [from, to] = await Promise.all([
      fromId ? prisma.scnSource.findUnique({ where: { id: fromId } }) : null,
      toId ? prisma.scnSource.findUnique({ where: { id: toId } }) : null,
    ]);
    if (!from || !to) fail("Choose the new source to re-key to");
    if (from!.id === to!.id) fail("Choose a different source");
    if (!["draft", "published"].includes(to!.status)) fail("The new source must be draft or published");
    const note = `Re-keyed from source #${from!.id} to #${to!.id} — verify against the new source before publishing`;
    let made = 0;
    let skipped = 0;
    const rules = await prisma.scnPolicyRule.findMany({ where: { sourceId: from!.id, status: "published" } });
    for (const r of rules) {
      if (to!.lenderId !== null && to!.lenderId !== r.lenderId) { skipped++; continue; }
      if (await prisma.scnPolicyRule.findFirst({ where: { ruleKey: r.ruleKey, status: "draft" } })) { skipped++; continue; }
      const max = await prisma.scnPolicyRule.aggregate({ where: { ruleKey: r.ruleKey }, _max: { version: true } });
      const rest = omitMeta(r);
      await prisma.scnPolicyRule.create({
        data: { ...rest, params: r.params as Prisma.InputJsonValue, version: (max._max.version ?? r.version) + 1, status: "draft", sourceId: to!.id, verifiedAt: null, reviewDue: null, reviewer: "", reviewerId: null, changeNote: note, createdBy: s.name },
      });
      made++;
    }
    const prices = await prisma.scnPriceRecord.findMany({ where: { sourceId: from!.id, status: "published" } });
    for (const p of prices) {
      if (to!.lenderId !== null && to!.lenderId !== p.lenderId) { skipped++; continue; }
      if (await prisma.scnPriceRecord.findFirst({ where: { recordKey: p.recordKey, status: "draft" } })) { skipped++; continue; }
      const max = await prisma.scnPriceRecord.aggregate({ where: { recordKey: p.recordKey }, _max: { version: true } });
      const rest = omitMeta(p);
      await prisma.scnPriceRecord.create({
        data: { ...rest, version: (max._max.version ?? p.version) + 1, status: "draft", sourceId: to!.id, verifiedAt: null, reviewDue: null, reviewer: "", changeNote: note, createdBy: s.name },
      });
      made++;
    }
    return { to: `${BASE}/sources/${from!.id}`, msg: `${made} draft version(s) created on source #${to!.id}${skipped ? `, ${skipped} skipped (draft already exists or different lender)` : ""}. Verify and publish them from the Review queue.` };
  });
}

/* ================================================================== rules */

async function reviewDefaults(fd: FormData, sessionName: string) {
  const verifiedAt = optDate(fd, "verifiedAt", "Verified on");
  let reviewDue = optDate(fd, "reviewDue", "Review due");
  if (!reviewDue && verifiedAt) reviewDue = addDaysSydney(verifiedAt, (await getScenarioSettings()).reviewDays);
  const reviewer = text(fd, "reviewer", 120) || (verifiedAt ? sessionName : "");
  return { verifiedAt, reviewDue, reviewer };
}

async function assertSourceFor(sourceId: number | null, lenderId: number, caseId: number | null) {
  const src = sourceId ? await prisma.scnSource.findUnique({ where: { id: sourceId } }) : null;
  if (!src) fail("Source is required — register the authorised material on the Sources tab first");
  if (!["draft", "published"].includes(src!.status)) fail(`Source "${src!.title}" is ${src!.status} — pick a current source`);
  if (src!.lenderId !== null && src!.lenderId !== lenderId) fail(`Source "${src!.title}" belongs to another lender`);
  if (src!.caseId !== null && src!.caseId !== caseId) fail(`Source "${src!.title}" is a confirmation for case #${src!.caseId} — set Case to ${src!.caseId}`);
  return src!;
}

export async function saveRuleAction(fd: FormData) {
  const s = await requireStaff();
  const id = idOf(fd);
  await run(id ? withQuery(`${BASE}/rules/${id}`, { edit: 1 }) : withQuery(`${BASE}/rules/new`, { lender: text(fd, "lenderId", 10) }), async () => {
    const existing = id ? await prisma.scnPolicyRule.findUnique({ where: { id } }) : null;
    if (id && !existing) fail("Rule not found");
    const lenderId = optInt(fd, "lenderId", "Lender");
    if (!lenderId || !(await prisma.scnLender.findUnique({ where: { id: lenderId } }))) fail("Lender is required");
    if (existing && existing.lenderId !== lenderId) fail("A rule's lender can't change between versions — create a new rule instead");
    const productId = optInt(fd, "productId", "Product");
    if (productId) {
      const p = await prisma.scnProduct.findUnique({ where: { id: productId } });
      if (!p || p.lenderId !== lenderId) fail("Product doesn't belong to the selected lender");
    }
    const check = oneOf(fd, "check", Object.keys(CHECKS) as string[], "Check");
    const category = oneOf(fd, "category", CATEGORIES, "Category", CHECKS[check].category);
    let raw: unknown = {};
    try {
      raw = JSON.parse(text(fd, "params", 20000) || "{}");
    } catch {
      fail("Parameters are not valid JSON");
    }
    const parsed = parseParams(check, raw);
    if (!parsed.ok) fail(`Parameters: ${parsed.error}`);
    const statement = text(fd, "statement", 2000);
    if (!statement) fail("Statement (the rule as written in the source) is required");
    const caseId = optInt(fd, "caseId", "Case");
    await assertCase(caseId);
    const sourceId = optInt(fd, "sourceId", "Source");
    await assertSourceFor(sourceId, lenderId!, caseId);
    const effectiveFrom = optDate(fd, "effectiveFrom", "Effective from");
    const effectiveTo = optDate(fd, "effectiveTo", "Effective to");
    if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) fail("Effective to is before effective from");
    const rv = await reviewDefaults(fd, s.name);
    const data = {
      lenderId: lenderId!, productId, segment: text(fd, "segment", 120) || "all", category, check,
      params: (parsed as { params: Record<string, unknown> }).params as Prisma.InputJsonValue,
      statement, conditions: text(fd, "conditions", 4000), exceptions: text(fd, "exceptions", 4000), sourceId: sourceId!,
      sourceSection: text(fd, "sourceSection", 200), caseId, effectiveFrom, effectiveTo, ...rv,
      reviewerId: rv.reviewer && rv.reviewer === s.name ? s.uid : null, changeNote: text(fd, "changeNote", 1000),
    };
    if (existing?.status === "draft") {
      await prisma.scnPolicyRule.update({ where: { id: existing.id }, data });
      return { to: `${BASE}/rules/${existing.id}`, msg: "Draft saved." };
    }
    if (existing) {
      const draft = await prisma.scnPolicyRule.findFirst({ where: { ruleKey: existing.ruleKey, status: "draft" } });
      if (draft) fail(`Draft v${draft.version} of this rule already exists (#${draft.id}) — edit that draft instead`);
      const max = await prisma.scnPolicyRule.aggregate({ where: { ruleKey: existing.ruleKey }, _max: { version: true } });
      const row = await prisma.scnPolicyRule.create({ data: { ...data, ruleKey: existing.ruleKey, version: (max._max.version ?? 0) + 1, status: "draft", createdBy: s.name } });
      return { to: `${BASE}/rules/${row.id}`, msg: `Draft v${row.version} created. v${existing.version} stays ${existing.status} until an admin publishes this draft.` };
    }
    const row = await prisma.scnPolicyRule.create({ data: { ...data, ruleKey: newKey("r"), version: 1, status: "draft", createdBy: s.name } });
    return { to: `${BASE}/rules/${row.id}`, msg: "Draft rule created." };
  });
}

export async function publishRuleAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/rules/${id}`, async () => {
    const r = id ? await prisma.scnPolicyRule.findUnique({ where: { id } }) : null;
    if (!r) fail("Rule not found");
    if (r!.status !== "draft") fail(`Only drafts can be published (this version is ${r!.status})`);
    const src = await prisma.scnSource.findUnique({ where: { id: r!.sourceId } });
    if (!src || src.status !== "published") fail("Can't publish: the source must be published first");
    if (!src!.permStore) fail("Can't publish: the source has no storage permission");
    if (!r!.verifiedAt) fail("Can't publish: record the date this rule was verified against the source");
    if (!r!.statement.trim()) fail("Can't publish: statement is empty");
    const p = parseParams(r!.check, r!.params);
    if (!p.ok) fail(`Can't publish: parameters invalid (${p.error})`);
    const [sup] = await prisma.$transaction([
      prisma.scnPolicyRule.updateMany({ where: { ruleKey: r!.ruleKey, status: "published", NOT: { id: r!.id } }, data: { status: "superseded" } }),
      prisma.scnPolicyRule.update({ where: { id: r!.id }, data: { status: "published" } }),
    ]);
    return { to: `${BASE}/rules/${r!.id}`, msg: `Published v${r!.version}${sup.count ? ` — previous version superseded` : ""}.` };
  });
}

export async function withdrawRuleAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/rules/${id}`, async () => {
    const r = id ? await prisma.scnPolicyRule.findUnique({ where: { id } }) : null;
    if (!r) fail("Rule not found");
    if (r!.status !== "published") fail("Only the published version can be withdrawn");
    await prisma.scnPolicyRule.update({ where: { id: r!.id }, data: { status: "withdrawn" } });
    return { to: `${BASE}/rules/${r!.id}`, msg: "Rule withdrawn — assessments no longer use it." };
  });
}

export async function deleteRuleDraftAction(fd: FormData) {
  await requireStaff();
  const id = idOf(fd);
  await run(`${BASE}/rules/${id}`, async () => {
    const r = id ? await prisma.scnPolicyRule.findUnique({ where: { id } }) : null;
    if (!r) fail("Rule not found");
    if (r!.status !== "draft") fail("Only drafts can be deleted");
    await prisma.scnPolicyRule.delete({ where: { id: r!.id } });
    const prev = await prisma.scnPolicyRule.findFirst({ where: { ruleKey: r!.ruleKey }, orderBy: { version: "desc" } });
    return { to: prev ? `${BASE}/rules/${prev.id}` : `${BASE}?tab=rules`, msg: `Draft v${r!.version} deleted.` };
  });
}

/* ================================================================ pricing */

export async function savePriceAction(fd: FormData) {
  const s = await requireStaff();
  const id = idOf(fd);
  await run(id ? withQuery(`${BASE}/pricing/${id}`, { edit: 1 }) : withQuery(`${BASE}/pricing/new`, { product: text(fd, "productId", 10) }), async () => {
    const existing = id ? await prisma.scnPriceRecord.findUnique({ where: { id } }) : null;
    if (id && !existing) fail("Price record not found");
    const productId = optInt(fd, "productId", "Product");
    const product = productId ? await prisma.scnProduct.findUnique({ where: { id: productId } }) : null;
    if (!product) fail("Product is required");
    if (existing && existing.productId !== product!.id) fail("A price record's product can't change between versions — create a new record instead");
    const lvrMin = reqNum(fd, "lvrMin", "LVR from", 0, 100);
    const lvrMax = reqNum(fd, "lvrMax", "LVR to", 0, 100);
    if (lvrMax <= lvrMin) fail("LVR to must be above LVR from");
    const pricingType = oneOf(fd, "pricingType", PRICING_TYPES, "Pricing type", "published");
    const caseId = optInt(fd, "caseId", "Case");
    if (pricingType === "confirmed_quote" && !caseId) fail("A confirmed quote must be linked to a case");
    await assertCase(caseId);
    const sourceId = optInt(fd, "sourceId", "Source");
    await assertSourceFor(sourceId, product!.lenderId, caseId);
    const cashback = optNum(fd, "cashback", "Cashback", 0, 1_000_000) ?? 0;
    const effectiveFrom = optDate(fd, "effectiveFrom", "Effective from");
    const expiresAt = optDate(fd, "expiresAt", "Expires");
    if (effectiveFrom && expiresAt && expiresAt < effectiveFrom) fail("Expiry is before the effective date");
    const rv = await reviewDefaults(fd, s.name);
    const data = {
      lenderId: product!.lenderId, productId: product!.id,
      occupancy: oneOf(fd, "occupancy", OCCUPANCIES, "Occupancy"), repaymentType: oneOf(fd, "repaymentType", REPAYMENT_TYPES, "Repayment type"),
      lvrMin, lvrMax, ratePct: reqNum(fd, "ratePct", "Rate", 0.01, 30), comparisonPct: optNum(fd, "comparisonPct", "Comparison rate", 0.01, 30),
      upfrontFees: optNum(fd, "upfrontFees", "Upfront fees", 0, 100_000) ?? 0, annualFee: optNum(fd, "annualFee", "Annual fee", 0, 10_000) ?? 0,
      monthlyFee: optNum(fd, "monthlyFee", "Monthly fee", 0, 1_000) ?? 0, cashback, cashbackTerms: text(fd, "cashbackTerms", 2000),
      cashbackExpiry: optDate(fd, "cashbackExpiry", "Cashback expiry"), pricingType, caseId, sourceId: sourceId!, sourceSection: text(fd, "sourceSection", 200),
      effectiveFrom, expiresAt, ...rv, changeNote: text(fd, "changeNote", 1000),
    };
    if (existing?.status === "draft") {
      await prisma.scnPriceRecord.update({ where: { id: existing.id }, data });
      return { to: `${BASE}/pricing/${existing.id}`, msg: "Draft saved." };
    }
    if (existing) {
      const draft = await prisma.scnPriceRecord.findFirst({ where: { recordKey: existing.recordKey, status: "draft" } });
      if (draft) fail(`Draft v${draft.version} of this price record already exists (#${draft.id}) — edit that draft instead`);
      const max = await prisma.scnPriceRecord.aggregate({ where: { recordKey: existing.recordKey }, _max: { version: true } });
      const row = await prisma.scnPriceRecord.create({ data: { ...data, recordKey: existing.recordKey, version: (max._max.version ?? 0) + 1, status: "draft", createdBy: s.name } });
      return { to: `${BASE}/pricing/${row.id}`, msg: `Draft v${row.version} created. v${existing.version} stays ${existing.status} until an admin publishes this draft.` };
    }
    const row = await prisma.scnPriceRecord.create({ data: { ...data, recordKey: newKey("p"), version: 1, status: "draft", createdBy: s.name } });
    return { to: `${BASE}/pricing/${row.id}`, msg: "Draft price record created." };
  });
}

export async function publishPriceAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/pricing/${id}`, async () => {
    const p = id ? await prisma.scnPriceRecord.findUnique({ where: { id } }) : null;
    if (!p) fail("Price record not found");
    if (p!.status !== "draft") fail(`Only drafts can be published (this version is ${p!.status})`);
    const src = await prisma.scnSource.findUnique({ where: { id: p!.sourceId } });
    if (!src || src.status !== "published") fail("Can't publish: the source must be published first");
    if (!src!.permStore) fail("Can't publish: the source has no storage permission");
    if (!p!.verifiedAt) fail("Can't publish: record the date this pricing was verified");
    if (p!.expiresAt && p!.expiresAt < new Date()) fail("Can't publish: this pricing has already expired");
    if (p!.pricingType === "confirmed_quote" && !p!.caseId) fail("Can't publish: a confirmed quote needs a case");
    const [sup] = await prisma.$transaction([
      prisma.scnPriceRecord.updateMany({ where: { recordKey: p!.recordKey, status: "published", NOT: { id: p!.id } }, data: { status: "superseded" } }),
      prisma.scnPriceRecord.update({ where: { id: p!.id }, data: { status: "published" } }),
    ]);
    return { to: `${BASE}/pricing/${p!.id}`, msg: `Published v${p!.version}${sup.count ? " — previous version superseded" : ""}.` };
  });
}

export async function withdrawPriceAction(fd: FormData) {
  await requireAdmin();
  const id = idOf(fd);
  await run(`${BASE}/pricing/${id}`, async () => {
    const p = id ? await prisma.scnPriceRecord.findUnique({ where: { id } }) : null;
    if (!p) fail("Price record not found");
    if (p!.status !== "published") fail("Only the published version can be withdrawn");
    await prisma.scnPriceRecord.update({ where: { id: p!.id }, data: { status: "withdrawn" } });
    return { to: `${BASE}/pricing/${p!.id}`, msg: "Price record withdrawn — assessments no longer use it." };
  });
}

export async function deletePriceDraftAction(fd: FormData) {
  await requireStaff();
  const id = idOf(fd);
  await run(`${BASE}/pricing/${id}`, async () => {
    const p = id ? await prisma.scnPriceRecord.findUnique({ where: { id } }) : null;
    if (!p) fail("Price record not found");
    if (p!.status !== "draft") fail("Only drafts can be deleted");
    await prisma.scnPriceRecord.delete({ where: { id: p!.id } });
    const prev = await prisma.scnPriceRecord.findFirst({ where: { recordKey: p!.recordKey }, orderBy: { version: "desc" } });
    return { to: prev ? `${BASE}/pricing/${prev.id}` : `${BASE}?tab=pricing`, msg: `Draft v${p!.version} deleted.` };
  });
}
