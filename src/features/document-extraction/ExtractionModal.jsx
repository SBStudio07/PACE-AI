import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Trash2, UploadCloud, X } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Button, DemoAiBadge, Field, Input, Modal, Select, useToast, cx } from '../../components/ui/index.jsx';
import { EXTRACTION_STEPS, extractTasksFromPdf } from '../../services/mockAIService.js';
import { validateTask } from '../../services/mockTaskService.js';

const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function ExtractionModal({ open, onClose }) {
  const { state, addTasks } = useApp();
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState(null);
  const [errs, setErrs] = useState({});

  const reset = () => { setFile(null); setStep(-1); setBusy(false); setItems(null); setError(''); setErrs({}); };
  const close = () => { reset(); onClose(); };

  const pick = (f) => {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { setError('Only PDF files are supported.'); return; }
    setError(''); setFile(f);
  };

  const start = async () => {
    setBusy(true);
    const res = await extractTasksFromPdf(file, { demoDate: state.demoDate, subjects: state.subjects, onStep: setStep });
    setItems(res); setBusy(false); setStep(EXTRACTION_STEPS.length);
  };

  const edit = (id, k, v) => setItems((l) => l.map((x) => (x.tempId === id ? { ...x, [k]: v, ...(k === 'estimatedHours' ? { remainingHours: v } : {}) } : x)));

  const confirm = () => {
    const all = {};
    items.forEach((x) => { const e = validateTask(x); if (Object.keys(e).length) all[x.tempId] = e; });
    setErrs(all);
    if (Object.keys(all).length) return;
    addTasks(items);
    toast({ title: `${items.length} task${items.length === 1 ? '' : 's'} added`, message: 'Extracted from your document. Regenerate your plan to schedule them.' });
    close();
  };

  return (
    <Modal open={open} onClose={close} title="Extract tasks from a PDF" size="lg"
      footer={items ? (
        <><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={confirm} disabled={!items.length}>Add {items.length} to My Tasks</Button></>
      ) : (
        <><Button variant="secondary" onClick={close}>Cancel</Button><Button onClick={start} disabled={!file || busy} loading={busy}>Start extraction</Button></>
      )}>
      <div className="mb-4 flex items-center gap-2 text-xs text-slate-500"><DemoAiBadge /> Simulated extraction. No document is sent anywhere and no AI service is connected yet.</div>

      {!items && !busy && !file && (
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={cx('flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors', drag ? 'border-blue-600 bg-blue-50' : 'border-slate-200')}>
          <UploadCloud className="mb-2 h-8 w-8 text-blue-600" aria-hidden />
          <p className="text-sm font-medium text-slate-900">Drag and drop a PDF here</p>
          <p className="mb-3 text-xs text-slate-500">Try a file named Physics_Assignment.pdf to see the full demo result</p>
          <Button variant="secondary" onClick={() => input.current?.click()}>Browse files</Button>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose a PDF file" onChange={(e) => pick(e.target.files[0])} />
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}

      {file && !items && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <FileText className="h-8 w-8 text-blue-600" aria-hidden />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-slate-500">{fmtSize(file.size)}</p></div>
            {!busy && <button aria-label="Remove file" onClick={reset} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>}
          </div>
          {busy && (
            <ol className="space-y-2" aria-live="polite">
              {EXTRACTION_STEPS.map((s, i) => (
                <li key={s} className={cx('flex items-center gap-2 text-sm', i > step ? 'text-slate-400' : 'text-slate-800')}>
                  {i < step ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden /> : i === step ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" aria-hidden /> : <span className="h-4 w-4 rounded-full border border-slate-300" />}
                  {s}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {items && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Review the suggestions, edit anything that looks wrong, then add them to your tasks.</p>
          {items.length === 0 && <p className="text-sm text-slate-500">All suggestions were removed.</p>}
          {items.map((x) => (
            <div key={x.tempId} className="rounded-xl border border-slate-200 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" error={errs[x.tempId]?.title} className="sm:col-span-2"><Input value={x.title} onChange={(e) => edit(x.tempId, 'title', e.target.value)} /></Field>
                <Field label="Subject"><Select value={x.subject} onChange={(e) => edit(x.tempId, 'subject', e.target.value)}>{state.subjects.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="Deadline" error={errs[x.tempId]?.deadline}><Input type="date" value={x.deadline} onChange={(e) => edit(x.tempId, 'deadline', e.target.value)} /></Field>
                <Field label="Estimated hours" error={errs[x.tempId]?.estimatedHours}><Input type="number" min="0.25" step="0.25" value={x.estimatedHours} onChange={(e) => edit(x.tempId, 'estimatedHours', e.target.value)} /></Field>
                <Field label="Difficulty"><Select value={x.difficulty} onChange={(e) => edit(x.tempId, 'difficulty', e.target.value)}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} of 5</option>)}</Select></Field>
              </div>
              {x.subtasks.length > 0 && <p className="mt-3 text-xs text-slate-500">Suggested subtasks: {x.subtasks.map((s) => s.title).join(', ')}</p>}
              <div className="mt-3 text-right"><Button size="sm" variant="ghost" icon={Trash2} onClick={() => setItems((l) => l.filter((y) => y.tempId !== x.tempId))}>Remove</Button></div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
