"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getLinks, saveLinks, newId, cleanUrl, type CustomLink } from "../lib/links";

function fromForm(fd: FormData, creating: boolean): Omit<CustomLink, "id"> {
  const order = parseInt(String(fd.get("order") ?? "0"), 10) || 0;
  return {
    label: String(fd.get("label") ?? "").trim(),
    url: cleanUrl(String(fd.get("url") ?? "")),
    group: String(fd.get("group") ?? "").trim(),
    target: fd.get("target") ? 1 : 0,
    modal: creating ? (fd.has("modal_present") ? (fd.get("modal") ? 1 : 0) : 1) : fd.get("modal") ? 1 : 0,
    order: order <= 0 ? 9999 : order,
    notes: String(fd.get("notes") ?? "").trim(),
    icon: String(fd.get("icon") ?? "").trim(),
  };
}

export async function linkCreate(fd: FormData) {
  await requireAdmin();
  const rows = await getLinks();
  rows.push({ id: newId(), ...fromForm(fd, true) });
  await saveLinks(rows);
  revalidatePath("/admin/links");
  redirect("/admin/links?updated=1");
}

export async function linkUpdate(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const rows = await getLinks();
  const i = rows.findIndex((r) => r.id === id);
  if (i >= 0) rows[i] = { id, ...fromForm(fd, false) };
  await saveLinks(rows);
  revalidatePath("/admin/links");
  redirect("/admin/links?updated=1");
}

export async function linkDelete(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  await saveLinks((await getLinks()).filter((r) => r.id !== id));
  revalidatePath("/admin/links");
  redirect("/admin/links?deleted=1");
}
