"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { deleteSubmission } from "@/modules/site/forms/admin";

export async function deleteSubmissionAction(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("id"));
  if (Number.isInteger(id)) await deleteSubmission(id);
  revalidatePath("/admin/submissions");
  redirect(String(formData.get("back") || "/admin/submissions"));
}

export async function setSubmissionStatusAction(formData: FormData) {
  await requireStaff();
  const id = Number(formData.get("id"));
  const status = formData.get("status") === "read" ? "read" : "new";
  if (Number.isInteger(id)) await prisma.formSubmission.update({ where: { id }, data: { status } });
  revalidatePath("/admin/submissions");
  revalidatePath(`/admin/submissions/${id}`);
}
