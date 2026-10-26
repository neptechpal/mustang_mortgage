"use client";

import { useState } from "react";
import { CheckCircle2, Save, Undo2 } from "lucide-react";
import { Button, Field, cn, hintStyles, labelStyles, textareaStyles } from "@/components/admin/ui";
import { NOTE_TARGET_MAX, countWords } from "./shared";

type Action = (fd: FormData) => void | Promise<void>;

/**
 * Broker note + internal notes, with a live word count. Approve stays disabled until the note reaches the minimum
 * for the page kind (the server checks again). One page per form: there is no bulk approve.
 */
export function ReviewForm({
  reviewKey,
  kind,
  initialNote,
  initialNotes,
  reviewed,
  minWords,
  saveAction,
  approveAction,
  unapproveAction,
}: {
  reviewKey: string;
  kind: string;
  initialNote: string;
  initialNotes: string;
  reviewed: boolean;
  minWords: number;
  saveAction: Action;
  approveAction: Action;
  unapproveAction: Action;
}) {
  const [note, setNote] = useState(initialNote);
  const words = countWords(note);
  const short = words < minWords;
  const long = words > NOTE_TARGET_MAX;
  const dirty = note !== initialNote;
  const meterTone = short ? "text-red-600" : long ? "text-amber-700" : "text-emerald-700";
  const pctOfMin = minWords ? Math.min(100, Math.round((words / minWords) * 100)) : 100;

  return (
    <form className="space-y-5">
      <input type="hidden" name="key" value={reviewKey} />
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <label htmlFor="brokerNote" className={labelStyles + " mb-0"}>
            Broker&rsquo;s local note{minWords ? <span className="ml-0.5 text-red-500">*</span> : null}
          </label>
          <span className={cn("text-xs font-semibold tabular-nums", meterTone)} aria-live="polite">
            {words} {words === 1 ? "word" : "words"}
            {minWords ? ` / ${minWords} minimum` : ""}
            {long ? ` (aim for ${NOTE_TARGET_MAX} or fewer)` : ""}
          </span>
        </div>
        <textarea
          id="brokerNote"
          name="brokerNote"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={10}
          className={cn(textareaStyles, "min-h-[220px] leading-relaxed")}
          placeholder={
            kind === "suburb"
              ? "Written by Sulav from real experience: e.g. which lenders' valuers know the area, typical strata issues in local unit blocks, what buyers here usually ask about, community organisations. No figures that aren't on the page."
              : "A short note in Sulav's words: what clients in this situation most often get wrong, or what to prepare first."
          }
          aria-describedby="brokerNote-hint"
        />
        {minWords ? (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className={cn("h-full rounded-full transition-all", short ? "bg-red-400" : long ? "bg-amber-400" : "bg-emerald-500")} style={{ width: `${pctOfMin}%` }} />
          </div>
        ) : null}
        <p id="brokerNote-hint" className={hintStyles}>
          Shown on the public page, signed by Sulav. Separate paragraphs with a blank line.
          {minWords ? ` ${minWords}–${NOTE_TARGET_MAX} words, human-written; required before this page can be approved.` : " Optional for this page type."}
        </p>
      </div>

      <Field label="Internal notes" hint="Staff only. Not shown on the site." htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={initialNotes} rows={4} className={textareaStyles} placeholder="What you checked, what needs fixing before sign-off…" />
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <Button type="submit" formAction={saveAction} variant="secondary">
          <Save /> Save
        </Button>
        {reviewed ? (
          <>
            <Button type="submit" formAction={approveAction} variant="success" disabled={short} title="Re-approve with today's date and your name">
              <CheckCircle2 /> Re-approve
            </Button>
            <Button
              type="submit"
              formAction={unapproveAction}
              variant="danger"
              onClick={(e) => {
                if (!confirm("Withdraw sign-off? The page goes back to noindex and leaves the sitemap.")) e.preventDefault();
              }}
            >
              <Undo2 /> Unapprove
            </Button>
          </>
        ) : (
          <Button type="submit" formAction={approveAction} variant="primary" disabled={short} title={short ? `Needs at least ${minWords} words` : "Approve this page"}>
            <CheckCircle2 /> Save and approve
          </Button>
        )}
        <span className={cn("text-xs", short ? "text-red-600" : "text-slate-500")}>
          {short ? `Approve needs ${minWords - words} more ${minWords - words === 1 ? "word" : "words"}.` : dirty ? "Unsaved changes." : reviewed ? "Approved pages are indexable once SEO_INDEXING=on." : "Approving records your name and today's date."}
        </span>
      </div>
    </form>
  );
}
