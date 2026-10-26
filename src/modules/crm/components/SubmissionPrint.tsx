import PrintButton from './PrintButton';
import { Badge, Card } from '@/components/admin/ui';
import type { PrintedSubmission } from '../forms/print';

const CSS = `
.mm-submission{max-width:820px;margin:20px auto;color:var(--color-slate-900);font:13px/1.5 Arial,sans-serif}
.mm-submission .print-brand{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid var(--color-brand-600);padding-bottom:14px;margin-bottom:16px}
.mm-submission .print-brand img{max-height:54px;max-width:190px;object-fit:contain}
.mm-submission .print-meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0;padding:12px;background:var(--color-slate-50);border-radius:8px}
.mm-submission .print-meta span{display:block;font-size:10px;text-transform:uppercase;color:var(--color-slate-500)}
.mm-submission .print-meta b{overflow-wrap:anywhere;font-size:12px}
.mm-submission section{margin:0 0 18px;break-inside:auto}
.mm-submission h2{font-size:12px;color:var(--color-brand-700);border-bottom:1px solid var(--color-slate-200);margin:0 0 6px;text-transform:uppercase;letter-spacing:.04em;break-after:avoid}
.mm-submission table{width:100%;border-collapse:collapse;table-layout:fixed}
.mm-submission td,.mm-submission th{padding:5px 8px;border-bottom:1px solid var(--color-slate-100);vertical-align:top;text-align:left;overflow-wrap:anywhere;white-space:pre-line}
.mm-submission tr{break-inside:avoid}.mm-submission .print-label{width:38%;color:var(--color-slate-500)}
.mm-submission .print-signature{padding:12px;border:1px dashed var(--color-slate-400);border-radius:8px;margin-top:12px;break-inside:avoid}.mm-submission .print-signature img{max-width:100%;max-height:160px}
.mm-submission .print-hand{font-family:'Brush Script MT','Segoe Script',cursive;font-size:28px;font-style:italic}
.mm-submission .print-footer{margin-top:26px;border-top:1px solid var(--color-slate-200);padding-top:8px;font-size:10px;color:var(--color-slate-500);display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}
@media(max-width:600px){.mm-submission .print-meta{grid-template-columns:1fr 1fr}.mm-submission .print-brand{flex-direction:column}}
@page{size:A4;margin:14mm 12mm 20mm}
@media print{
body{background:white!important}.admin-ui aside,.admin-ui header.sticky,.admin-ui button[aria-label="Open menu"],.mw-portal__header,.mw-portal__footer,.mw-skip{display:none!important}
.admin-ui main,.mw-portal main{padding:0!important;max-width:none!important}.mm-submission{max-width:none;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important}.mm-submission .print-bar{display:none}.mm-submission .print-meta{grid-template-columns:repeat(4,minmax(0,1fr))}.mm-submission .print-brand{flex-direction:row}.mm-submission .print-footer{position:fixed;left:0;right:0;bottom:-14mm;background:white;margin:0}
}`;
export default function SubmissionPrint({ data: d, printedBy = '' }: { data: PrintedSubmission; printedBy?: string }) {
  return <Card className="mm-submission"><style>{CSS}</style><div className="print-bar mb-6 space-y-2"><PrintButton /><p className="text-xs text-slate-500">In the print dialog, choose “Save as PDF” as the destination to keep a digital copy.</p></div>
    <header className="print-brand"><div>{d.logo && /* eslint-disable-next-line @next/next/no-img-element */ <img src={d.logo} alt={d.company} />}<strong className="block text-base">{d.company}</strong><small>{d.broker}</small></div><div><h1 className="text-xl font-semibold">{d.title}</h1><p>Case reference MM#{d.caseId}</p></div></header>
    {!d.submitted && <Badge tone="warning">DRAFT — the client has not submitted this form yet</Badge>}
    <div className="print-meta"><div><span>Client{d.contacts.length > 1 ? 's' : ''}</span>{(d.contacts.length ? d.contacts : [d.fallbackName]).map((c,i) => <b className="block" key={i}>{c}</b>)}</div><div><span>Submitted</span><b>{d.submittedAt}</b></div><div><span>Version</span><b>{d.version}</b></div><div><span>Printed</span><b>{d.printedAt}</b></div></div>
    {!d.groups.length && <p>No answers have been recorded yet.</p>}
    {d.groups.map((g,i) => <section key={i}><h2>{g.title}</h2><table><tbody>{g.rows.filter(r => !r.table && r.type !== 'signature').map(r => <tr key={r.key}><td className="print-label">{r.label}</td><td>{r.value}</td></tr>)}</tbody></table>{g.rows.map(r => r.table ? <div key={r.key} className="mt-3"><b>{r.label}</b><table><thead><tr>{r.cols?.map((c,i) => <th key={i}>{c}</th>)}</tr></thead><tbody>{r.table.map((line,i) => <tr key={i}>{line.map((c,j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div> : r.type === 'signature' ? <div className="print-signature" key={r.key}><small>Electronically signed by</small>{(r as typeof r & { image?: string }).image ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={(r as typeof r & { image?: string }).image} alt="Client signature" /> : <div className="print-hand">{r.value}</div>}{r.signed_at && <small>Signed {r.signed_at}</small>}</div> : null)}</section>)}
    <footer className="print-footer"><span>{d.company} · Confidential — contains personal information</span><span>Printed {d.printedAt}{printedBy && ` by ${printedBy}`}{d.ip && ` · IP ${d.ip}`}</span></footer>
  </Card>;
}
