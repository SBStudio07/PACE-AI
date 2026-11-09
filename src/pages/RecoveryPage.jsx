import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, LifeBuoy, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, CardHeader, DemoAiBadge, Field, Input, PageHeader, Select, cx, useToast } from '../components/ui/index.jsx';
import { QUICK_ACTIONS, runRecovery } from '../services/mockRecoveryService.js';
import { blankTask, validateTask } from '../services/mockTaskService.js';
import { addDays, fmtDate, fmtTime } from '../utils/dateUtils.js';
import { priorityLabel } from '../utils/priorityUtils.js';
import { hrs } from '../utils/workloadUtils.js';

const OVERALL_TONE = { Achievable: 'green', 'At Risk': 'amber', Overloaded: 'red', Critical: 'red' };

export default function RecoveryPage() {
  const { state, workload: w, missed, taskById, todaySessions, approveRecovery } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [action, setAction] = useState(missed.length ? 'missed' : 'recalc');
  const [picked, setPicked] = useState([]);
  const [hoursLost, setHoursLost] = useState(2);
  const [draft, setDraft] = useState(blankTask(state.subjects[0], addDays(state.demoDate, 3)));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState(null);

  const upcoming = useMemo(
    () => state.sessions.filter((s) => s.status === 'planned' && s.date >= state.demoDate).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 8),
    [state],
  );
  const ranked = useMemo(() => [...w.perTask].sort((a, b) => a.priority - b.priority), [w]);

  const analyse = async () => {
    let payload = {};
    if (action === 'missed') {
      if (!picked.length && !missed.length) return toast({ title: 'Choose a session', message: 'Select at least one session you missed.', tone: 'warning' });
      payload = { sessionIds: picked };
    } else if (action === 'newTask') {
      const e = validateTask(draft);
      setErrors(e);
      if (Object.keys(e).length) return;
      payload = { task: draft };
    } else if (action === 'lessTime') {
      if (!(Number(hoursLost) > 0)) return toast({ title: 'Enter the hours you lost', tone: 'warning' });
      payload = { hoursLost };
    }
    setBusy(true); setProposal(null);
    const p = await runRecovery(action, payload, state);
    setBusy(false); setProposal(p);
  };

  const approve = () => {
    approveRecovery(proposal);
    toast({ title: 'Revised plan approved', message: 'Your planner and dashboard now use the new schedule.' });
    setProposal(null); setPicked([]);
    navigate('/app/planner');
  };
  const keep = () => { setProposal(null); toast({ title: 'Existing plan kept', message: 'Nothing was changed.', tone: 'info' }); };

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value, ...(k === 'estimatedHours' ? { remainingHours: e.target.value } : {}) }));

  return (
    <div className="space-y-6">
      <PageHeader title="AI Recovery Assistant" subtitle="Tell PACE what changed. It rebuilds your plan, shows exactly what moves, and waits for your approval." actions={<DemoAiBadge />} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-slate-500">Current workload</p><p className="mt-1 text-2xl font-semibold">{hrs(w.requiredMin)}</p><p className="text-xs text-slate-500">{hrs(w.usableMin)} usable</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Feasibility</p><div className="mt-2"><Badge tone={OVERALL_TONE[w.overall]}>{w.overall}</Badge></div><p className="mt-1 text-xs text-slate-500">{w.gapMin ? `${hrs(w.gapMin)} over capacity` : 'Fits capacity'}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Missed sessions</p><p className="mt-1 text-2xl font-semibold">{missed.length}</p><p className="text-xs text-slate-500">{hrs(missed.reduce((a, s) => a + s.minutes, 0))} outstanding</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Sessions today</p><p className="mt-1 text-2xl font-semibold">{todaySessions.length}</p><p className="text-xs text-slate-500">{todaySessions.filter((s) => s.status === 'planned').length} still planned</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="What happened?" />
          <div className="space-y-1 p-3" role="radiogroup" aria-label="Recovery scenario">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.id} role="radio" aria-checked={action === a.id} onClick={() => { setAction(a.id); setProposal(null); }}
                className={cx('w-full rounded-lg px-3 py-2.5 text-left transition-colors', action === a.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50')}>
                <span className={cx('block text-sm font-medium', action === a.id ? 'text-blue-700' : 'text-slate-900')}>{a.label}</span>
                <span className="text-xs text-slate-500">{a.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader title="Details" subtitle="Nothing changes until you approve" />
          <div className="space-y-4 p-5">
            {action === 'missed' && (
              <>
                {missed.length > 0 && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">Already marked missed: {missed.map((s) => `${taskById[s.taskId]?.title} (${fmtDate(s.date)})`).join(', ')}</div>
                )}
                <p className="text-xs font-medium text-slate-700">Mark more upcoming sessions as missed</p>
                {upcoming.length === 0 ? <p className="text-sm text-slate-500">No upcoming planned sessions.</p> : (
                  <ul className="space-y-1.5">
                    {upcoming.map((s) => (
                      <li key={s.id}><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={picked.includes(s.id)} onChange={() => setPicked((l) => (l.includes(s.id) ? l.filter((x) => x !== s.id) : [...l, s.id]))} />
                        <span className="min-w-0 flex-1 truncate">{taskById[s.taskId]?.title}</span>
                        <span className="text-xs text-slate-500">{fmtDate(s.date)}, {fmtTime(s.start)}</span>
                      </label></li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {action === 'newTask' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Title" error={errors.title} className="sm:col-span-2"><Input value={draft.title} onChange={set('title')} placeholder="e.g. Surprise Physics quiz prep" /></Field>
                <Field label="Subject" error={errors.subject}><Select value={draft.subject} onChange={set('subject')}>{state.subjects.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                <Field label="Deadline" error={errors.deadline}><Input type="date" value={draft.deadline} onChange={set('deadline')} /></Field>
                <Field label="Estimated hours" error={errors.estimatedHours}><Input type="number" min="0.25" step="0.25" value={draft.estimatedHours} onChange={set('estimatedHours')} /></Field>
                <Field label="Importance"><Select value={draft.importance} onChange={set('importance')}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} of 5</option>)}</Select></Field>
              </div>
            )}
            {action === 'lessTime' && (
              <Field label="Study hours lost over the next 7 days" hint="Spread across your remaining study days."><Input type="number" min="0.5" step="0.5" value={hoursLost} onChange={(e) => setHoursLost(e.target.value)} /></Field>
            )}
            {action === 'recalc' && <p className="text-sm text-slate-600">Rebuilds upcoming sessions from your current tasks, progress and availability. Completed sessions are kept.</p>}
            {action === 'priorities' && (
              <ol className="space-y-2">
                {ranked.length === 0 && <p className="text-sm text-slate-500">No open tasks.</p>}
                {ranked.map((p, i) => { const l = priorityLabel(p.priority); return (
                  <li key={p.task.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="w-5 text-xs font-medium text-slate-400">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{p.task.title}</span>
                    <span className="text-xs text-slate-500">due {fmtDate(p.task.deadline)} · {p.cumSlack < 0 ? '−' : '+'}{hrs(Math.abs(p.cumSlack))} slack</span>
                    <Badge tone={l.tone}>{l.label}</Badge>
                  </li>); })}
              </ol>
            )}
            {action !== 'priorities' && <Button loading={busy} onClick={analyse} icon={LifeBuoy}>{busy ? 'Analysing…' : 'Analyse impact'}</Button>}
          </div>
        </Card>
      </div>

      {proposal && (
        <Card className="border-blue-200">
          <CardHeader title="Proposed recovery plan" subtitle="Review before anything changes" action={<DemoAiBadge />} />
          <div className="grid gap-6 p-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">What changed</h3>
              <ul className="space-y-2 text-sm text-slate-700">{proposal.explanation.map((t, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />{t}</li>)}</ul>
              <p className="mt-3 text-xs text-slate-500">{proposal.diff.added} sessions added, {proposal.diff.removed} removed, {proposal.diff.unchanged} unchanged.</p>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Before and after</h3>
              <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                {[['Before', proposal.before], ['After', proposal.after]].map(([k, s]) => (
                  <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className="font-semibold">{hrs(s.scheduledMin)} scheduled</p>
                    <p className={cx('text-xs', s.gapMin ? 'text-red-600' : 'text-emerald-600')}>{s.gapMin ? `${hrs(s.gapMin)} unallocated` : 'Everything fits'}</p></div>
                ))}
              </div>
              <table className="w-full text-sm"><thead className="text-xs text-slate-500"><tr><th className="py-1 text-left font-medium">Task</th><th className="py-1 text-right font-medium">Before</th><th className="py-1 text-right font-medium">After</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{proposal.perTask.map((r) => (
                  <tr key={r.taskId}><td className="max-w-[12rem] truncate py-1.5">{r.title}</td><td className="py-1.5 text-right text-slate-500">{hrs(r.before)}</td>
                    <td className={cx('py-1.5 text-right font-medium', r.after > r.before ? 'text-blue-700' : r.after < r.before ? 'text-red-600' : '')}>{hrs(r.after)}</td></tr>))}</tbody></table>
            </div>
          </div>
          {proposal.unresolved.length > 0 && (
            <div className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <p className="font-medium">Still unresolved</p>
              <ul className="mt-1 list-disc pl-5">{proposal.unresolved.map((u) => <li key={u.taskId}>{u.title}: {hrs(u.minutes)} cannot fit before {fmtDate(u.deadline)}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-4">
            <Button icon={ArrowRight} onClick={approve}>Approve Revised Plan</Button>
            <Button variant="secondary" icon={X} onClick={keep}>Keep Existing Plan</Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" aria-hidden />Your schedule is never changed without approval.</span>
          </div>
        </Card>
      )}
    </div>
  );
}
