import type { Cf7ClientProps, Cf7Definition } from "./types";
import { renderFormBody } from "./tags";

// Contact Form 7 forms exported from WordPress (wpcf7_contact_form posts).
const LOADERS: Record<number, () => Promise<{ default: Cf7Definition }>> = {
  1767: () => import("./forms/f1767"), // Mustang Enquiry Single Column (offcanvas enquiry drawer)
  2651: () => import("./forms/f2651"), // MM Fact Find (signature + multi-file upload)
  2790: () => import("./forms/f2790"), // MM Form (AFG Flex intake)
};

export const CF7_FORM_IDS = Object.keys(LOADERS).map(Number);

export async function getCf7Definition(id: number): Promise<Cf7Definition | null> {
  const load = LOADERS[id];
  return load ? (await load()).default : null;
}

/** Messages the browser needs for client-side checks (upload limits, required). */
const CLIENT_MESSAGES = ["invalid_required", "validation_error", "upload_file_type_invalid", "upload_file_too_large", "mail_sent_ng"];

export async function getCf7ClientProps(id: number): Promise<Cf7ClientProps | null> {
  const def = await getCf7Definition(id);
  if (!def) return null;
  const { html, scripts } = renderFormBody(def);
  const messages: Record<string, string> = {};
  for (const k of CLIENT_MESSAGES) messages[k] = def.messages[k] ?? "";
  return { formId: def.id, title: def.title, hash: def.hash, bodyHtml: html, scripts, messages };
}
