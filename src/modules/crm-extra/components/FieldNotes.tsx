"use client";
import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Mail, MessageCircle, Mic, NotebookPen, Phone, Save, Search, Users } from 'lucide-react';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LinkButton, PageHeader, Textarea, checkboxStyles, buttonStyles } from '@/components/admin/ui';
import { addFieldNote, fieldNoteCase, fieldNoteCases } from '../actions/field-notes';
import { NOTE_TYPES } from '../lib/field-notes';
type Detail = NonNullable<Awaited<ReturnType<typeof fieldNoteCase>>>;
type Draft = { text: string; title: string; type: string; dir: string; requestId: string };
type Recognition = { lang: string; continuous: boolean; interimResults: boolean; onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>>; resultIndex: number }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
const newDraft = (): Draft => ({ text: '', title: '', type: 'whatsapp', dir: '', requestId: crypto.randomUUID() });
const icons = { whatsapp: MessageCircle, call: Phone, meeting: Users, email: Mail, note: NotebookPen };
export default function FieldNotes({ userId }: { userId: number }) {
  const [q, setQ] = useState(''), [all, setAll] = useState(false), [list, setList] = useState<Awaited<ReturnType<typeof fieldNoteCases>>>({ cases: [], total: 0 });
  const [detail, setDetail] = useState<Detail | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [status, setStatus] = useState('');
  const [draft, setDraft] = useState<Draft>({ text: '', title: '', type: 'whatsapp', dir: '', requestId: '' }), [saving, setSaving] = useState(false), [mic, setMic] = useState(false), [dictation, setDictation] = useState(false);
  const current = useRef<Detail | null>(null), draftRef = useRef(draft), request = useRef(0), savingRef = useRef(false), speech = useRef<Recognition | null>(null);
  const key = (id: number) => `mmfn_draft_${userId}_${id}`;
  function change(next: Partial<Draft>) {
    const value = { ...draftRef.current, ...next };
    draftRef.current = value; setDraft(value); setStatus('');
    if (current.current) try { localStorage.setItem(key(current.current.case.id), JSON.stringify(value)); } catch { setStatus('Device storage is unavailable. Keep this page open until saved.'); }
  }
  async function openCase(id: number) {
    const n = ++request.current; speech.current?.stop(); setLoading(true); setError(''); setStatus('');
    try {
      const data = await fieldNoteCase(id); if (n !== request.current) return;
      if (!data) throw Error('Case not found.');
      current.current = data; setDetail(data);
      let value = newDraft();
      try { const stored = localStorage.getItem(key(id)); if (stored) { value = { ...value, ...JSON.parse(stored) }; if (value.text) setStatus('Draft restored'); } } catch {}
      draftRef.current = value; setDraft(value); history.replaceState(null, '', `#case-${id}`);
    } catch { if (n === request.current) setError('Could not load the case. Check your connection and try again.'); }
    finally { if (n === request.current) setLoading(false); }
  }
  useEffect(() => {
    setDictation(!!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition));
    const match = /^#case-(\d+)$/.exec(location.hash); if (match) void openCase(Number(match[1]));
    return () => { speech.current?.stop(); };
  // Only restore the initial deep link once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (detail) return;
    let active = true;
    const timer = setTimeout(async () => { setLoading(true); try { const r = await fieldNoteCases(q, all); if (active) { setList(r); setError(''); } } catch { if (active) setError('No connection. Check your signal and try again.'); } finally { if (active) setLoading(false); } }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [q, all, detail]);
  const back = () => { request.current++; speech.current?.stop(); current.current = null; setDetail(null); setError(''); setStatus(''); history.replaceState(null, '', location.pathname); };
  const dictate = () => {
    if (mic) { speech.current?.stop(); return; }
    const win = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const R = win.SpeechRecognition || win.webkitSpeechRecognition; if (!R) return;
    const r = new R(); speech.current = r; r.lang = 'en-AU'; r.continuous = true; r.interimResults = false;
    r.onresult = e => { let text = ''; for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript + ' '; change({ text: (draftRef.current.text + ' ' + text).trim() }); };
    r.onerror = () => { setMic(false); setError('Dictation is unavailable. You can type or use your keyboard’s microphone.'); };
    r.onend = () => setMic(false);
    try { r.start(); setMic(true); } catch { setError('Could not start dictation.'); }
  };
  async function save() {
    if (!detail || savingRef.current) return;
    if (mic) { speech.current?.stop(); setStatus('Dictation stopped — review your note, then tap Save.'); return; }
    if (!draftRef.current.text.trim()) { setError('Type a note first'); return; }
    speech.current?.stop(); savingRef.current = true; setSaving(true); setError(''); setStatus('');
    const caseId = detail.case.id;
    try {
      const r = await addFieldNote({ caseId, ...draftRef.current });
      if (!r.ok) { setError(r.error); return; }
      const next = { ...detail, notes: r.notes, total: r.total }; current.current = next; setDetail(next);
      try { localStorage.removeItem(key(caseId)); } catch {}
      const empty = newDraft(); draftRef.current = empty; setDraft(empty); setStatus('Saved to Broker Notes');
    } catch { setError('No connection — your text is kept, tap Save again.'); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-4 pb-6">
    <PageHeader title="Field notes" icon={<NotebookPen />} description="Record conversations on the go." actions={detail ? <Button variant="secondary" disabled={saving} onClick={back}><ArrowLeft />Cases</Button> : undefined} />
    {error && <Alert tone="danger">{error}</Alert>}
    {!detail ? <><Field label="Search name, email or mobile" htmlFor="notes-search"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input id="notes-search" type="search" className="h-12 pl-9 text-base" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or mobile…" /></div></Field><label className="flex items-center gap-2 text-sm text-slate-600"><input className={checkboxStyles} type="checkbox" checked={all} onChange={e => setAll(e.target.checked)} />Include completed &amp; archived</label><p className="text-xs text-slate-500" aria-live="polite">{loading ? 'Loading…' : list.total > 40 ? `Showing 40 of ${list.total} — refine your search` : `${list.total} cases`}</p>
      {!loading && !list.cases.length && <EmptyState title="No cases found" icon={<Search />} />}
      {list.cases.map(c => <Button key={c.id} variant="secondary" className="h-auto w-full justify-start whitespace-normal p-4 text-left" onClick={() => openCase(c.id)}><span className="min-w-0"><b className="block text-base">{c.name}</b><span className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="info">{c.stage}</Badge>{c.status !== 'Active' && <Badge tone="warning">{c.status}</Badge>}<span className="text-xs font-normal text-slate-500">{c.notes ? `${c.notes} notes${c.last ? ` · last ${c.last}` : ''}` : 'No notes yet'}</span></span></span></Button>)}
    </> : <>
      <Card title={detail.case.name}><div className="flex flex-wrap gap-2"><Badge tone="info">{detail.case.stage}</Badge><Badge>{detail.case.status}</Badge><Badge tone="success">{detail.total} notes</Badge></div><div className="mt-4 flex flex-wrap gap-2">{detail.case.phones.map((p,i) => <span key={i} className="contents"><a className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'min-h-11' })} href={`tel:${p.tel}`}><Phone />{p.name.split(' ')[0]}</a>{p.wa && <a className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'min-h-11' })} href={`https://wa.me/${p.wa}`} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp {p.name.split(' ')[0]}</a>}</span>)}{detail.case.emails.map(email => <a key={email} title={email} className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'min-h-11' })} href={`mailto:${email}`}><Mail />Email</a>)}</div></Card>
      <Card title="What happened?"><fieldset disabled={saving} className="space-y-4"><legend className="sr-only">New note</legend><div className="flex flex-wrap gap-2">{NOTE_TYPES.map(t => { const Icon = icons[t.id]; return <Button key={t.id} variant={draft.type === t.id ? 'primary' : 'secondary'} className="min-h-11" aria-pressed={draft.type === t.id} onClick={() => change({ type: t.id })}><Icon />{t.label}</Button>; })}</div>
        <div className="grid grid-cols-2 gap-2">{[['in','From client'],['out','To client']].map(([d,label]) => <Button key={d} variant={draft.dir === d ? 'primary' : 'secondary'} className="min-h-11" aria-pressed={draft.dir === d} onClick={() => change({ dir: draft.dir === d ? '' : d })}>{d === 'in' ? <ArrowDown /> : <ArrowUp />}{label}</Button>)}</div>
        <Field label="Heading (optional)" htmlFor="note-title"><Input id="note-title" value={draft.title} onChange={e => change({ title: e.target.value })} maxLength={220} /></Field>
        <Field label="Conversation" htmlFor="note-text"><Textarea id="note-text" value={draft.text} onChange={e => change({ text: e.target.value })} rows={7} maxLength={20000} className="text-base" placeholder="Type or paste the conversation, what was agreed, next steps… (use your keyboard’s mic to dictate)" /></Field>
        {dictation && <Button variant={mic ? 'danger' : 'secondary'} onClick={dictate}><Mic />{mic ? 'Stop dictation' : 'Dictate note'}</Button>}
        <p className="text-xs text-slate-500">Saved to this case’s Broker Notes with the date, time and your name. Notes can’t be edited from here, so they stay a clean record.</p>
      </fieldset></Card>
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-sm"><span role="status" className="text-sm text-emerald-700">{status}</span><Button className="min-h-12 flex-1" disabled={saving || loading} onClick={save}><Save />{saving ? 'Saving…' : 'Save note'}</Button></div>
      <h2 className="text-sm font-semibold text-slate-600">Previous notes</h2>{detail.notes.length ? detail.notes.map(n => <Card key={n.id} title={n.title} description={`${n.when} · ${n.by}${n.ago ? ` · ${n.ago}` : ''}`}><div className="break-words text-sm leading-relaxed [&_p]:mb-2 [&_ul]:list-inside [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: n.html }} /></Card>) : <EmptyState title="No notes yet" icon={<NotebookPen />} />}
      {detail.total > detail.notes.length && <p className="text-xs text-slate-500">Showing the latest {detail.notes.length} of {detail.total} — the full history is in the case screen.</p>}
      <LinkButton href={`/admin/cases/${detail.case.id}#tab-notes`} variant="secondary">Open case</LinkButton>
    </>}
  </div>;
}
