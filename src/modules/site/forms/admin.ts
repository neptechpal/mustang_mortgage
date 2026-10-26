import { prisma } from "@/lib/db";
import { deleteStoredFile } from "@/lib/storage";
import { getCf7Definition } from "../cf7/registry";
import { scanTags } from "../cf7/tags";
import { LEAD_FIELDS } from "../lead/definition";

export type SubmissionFile = { field: string; fileId: string; name: string; size: number; mimeType: string; kind: "upload" | "signature" };

export const FORM_LABELS: Record<string, string> = {
  "cf7:1767": "Mustang Enquiry (offcanvas)",
  "cf7:2651": "MM Fact Find",
  "cf7:2790": "MM Form (AFG Flex intake)",
  "mmf:3012": "Contact page lead form",
  newsletter: "Newsletter sign-up",
};

export const submissionFiles = (files: unknown): SubmissionFile[] => (Array.isArray(files) ? (files as SubmissionFile[]) : []);

/** Field rows in form order with human labels where known. */
export async function submissionRows(formKey: string, data: Record<string, unknown>) {
  const order: { key: string; label: string }[] = [];
  if (formKey.startsWith("cf7:")) {
    const def = await getCf7Definition(Number(formKey.slice(4)));
    if (def) for (const t of scanTags(def.template)) if (t.name && t.basetype !== "submit") order.push({ key: t.name, label: t.name });
  } else if (formKey.startsWith("mmf:")) {
    for (const f of LEAD_FIELDS) order.push({ key: f.key, label: f.label });
  }
  for (const k of Object.keys(data)) if (!k.startsWith("_") && !order.some((o) => o.key === k)) order.push({ key: k, label: k });
  return order.map((o) => {
    const v = data[o.key];
    return { ...o, value: Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v) };
  });
}

export async function deleteSubmission(id: number) {
  const sub = await prisma.formSubmission.findUnique({ where: { id } });
  if (!sub) return;
  for (const f of submissionFiles(sub.files)) await deleteStoredFile(f.fileId).catch(() => undefined);
  await prisma.formSubmission.delete({ where: { id } });
}
