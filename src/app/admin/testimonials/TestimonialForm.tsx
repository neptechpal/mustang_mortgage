import { Save, Trash2 } from "lucide-react";
import { Card, Field, Input, Select, Textarea, checkboxStyles, cn } from "@/components/admin/ui";
import { Flash, btnDanger, btnPrimary } from "@/modules/members/components/AdminUi";
import { ConfirmSubmit } from "@/modules/members/components/ConfirmSubmit";
import { deleteTestimonialAction, saveTestimonialAction } from "@/modules/web/admin-actions";

export type TestimonialRow = { id: number; clientName: string; content: string; detail: string; rating: number | null; sortOrder: number; published: boolean };

export function TestimonialForm({ t, error }: { t?: TestimonialRow; error?: string }) {
  return (
    <div className="max-w-3xl space-y-6">
      <Flash error={error} />
      <form action={saveTestimonialAction}>
        {t && <input type="hidden" name="id" value={t.id} />}
        <Card
          title={t ? "Edit testimonial" : "New testimonial"}
          footer={
            <div className="flex justify-end">
              <button className={btnPrimary}>
                <Save /> Save testimonial
              </button>
            </div>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" hint="As you want it shown, for example Priya S." required>
              <Input name="clientName" defaultValue={t?.clientName} required maxLength={120} />
            </Field>
            <Field label="Detail (optional)" hint="For example First home buyer, Parramatta">
              <Input name="detail" defaultValue={t?.detail} maxLength={160} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Testimonial" required>
                <Textarea name="content" defaultValue={t?.content} required rows={5} maxLength={2000} />
              </Field>
            </div>
            <Field label="Stars (optional)" hint="Only add stars if the client gave you a rating.">
              <Select name="rating" defaultValue={t?.rating ? String(t.rating) : ""}>
                <option value="">No stars</option>
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} out of 5
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Display order" hint="Lower numbers come first.">
              <Input name="sortOrder" type="number" min={0} max={9999} defaultValue={t?.sortOrder ?? 0} />
            </Field>
            <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" name="published" value="1" defaultChecked={t?.published} className={cn(checkboxStyles, "mt-0.5")} />
              <span>
                Show on website
                <span className="block text-xs text-slate-500">Only publish this once the client has agreed to share it.</span>
              </span>
            </label>
          </div>
        </Card>
      </form>
      {t && (
        <form action={deleteTestimonialAction}>
          <input type="hidden" name="id" value={t.id} />
          <ConfirmSubmit message={`Delete the testimonial from ${t.clientName}?`} className={btnDanger}>
            <Trash2 /> Delete testimonial
          </ConfirmSubmit>
        </form>
      )}
    </div>
  );
}
