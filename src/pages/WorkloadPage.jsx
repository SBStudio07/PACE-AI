import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, SlidersHorizontal } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, CardHeader, EmptyState, PageHeader, ProgressBar, useToast, cx } from '../components/ui/index.jsx';
import { fmtDate } from '../utils/dateUtils.js';
import { STATUS_TONE, computeWorkload, hoursOf, hrs } from '../utils/workloadUtils.js';

const OVERALL_TONE = { Achievable: 'green', 'At Risk': 'amber', Overloaded: 'red', Critical: 'red' };

export default function WorkloadPage() {
  const { state, workload: w, patch } = useApp();
  const toast = useToast();
  const [excluded, setExcluded] = useState([]);
  const [extra, setExtra] = useState(0);
  const [buffer, setBuffer] = useState(state.prefs.bufferPct);

  const changed = excluded.length > 0 || extra > 0 || buffer !== state.prefs.bufferPct;
  const scenario = useMemo(() => {
    const availability = { ...state.availability, days: state.availability.days.map((d) => ({ ...d, hours: d.hours > 0 ? d.hours + extra : d.hours })) };
    return computeWorkload({
      ...state,
      tasks: state.tasks.map((t) => (excluded.includes(t.id) ? { ...t, status: 'deferred' } : t)),
      availability,
      prefs: { ...state.prefs, bufferPct: buffer },
    });
  }, [state, excluded, extra, buffer]);

  const apply = () => {
    patch((s) => ({
      tasks: s.tasks.map((t) => (excluded.includes(t.id) ? { ...t, status: 'deferred' } : t)),
      sessions: s.sessions.filter((x) => !(x.status === 'planned' && excluded.includes(x.taskId))),
      availability: { ...s.availability, days: s.availability.days.map((d) => ({ ...d, hours: d.hours > 0 ? d.hours + extra : d.hours })) },
      prefs: { ...s.prefs, bufferPct: buffer },
    }));
    setExcluded([]); setExtra(0);
    toast({ title: 'Changes applied', message: 'Regenerate your plan in the Weekly Planner to use them.' });
  };

  const chart = w.perTask.map((p) => ({ name: p.task.title.length > 16 ? p.task.title.slice(0, 15) + '…' : p.task.title, Required: hoursOf(p.remMin), 'Available before deadline': hoursOf(p.availMin) }));
  const max = Math.max(w.requiredMin, w.rawMin, 1);
  const bars = [
    { label: 'Required work', v: w.requiredMin, color: 'bg-slate-800' },
    { label: 'Raw capacity', v: w.rawMin, color: 'bg-blue-300' },
    { label: 'Usable capacity', v: w.usableMin, color: 'bg-blue-600' },
  ];
  const deferCandidate = [...w.perTask].filter((p) => p.status !== 'Achievable').sort((a, b) => a.task.importance - b.task.importance || b.task.deadline.localeCompare(a.task.deadline))[0];
  const tone = OVERALL_TONE[w.overall];

  const recs = [];
  if (w.gapMin > 0) {
    recs.push(`Your current workload exceeds your practical study capacity by ${hrs(w.gapMin)}.`);
    if (deferCandidate) recs.push(`The lowest-importance task that is under pressure is “${deferCandidate.task.title}” (${hrs(deferCandidate.remMin)} left). Consider a flexible deadline or deferring it.`);
    recs.push('Reduce lower-priority activities, extend flexible deadlines where possible, or reallocate other free time to study.');
    recs.push('Use the explorer below to see how each change affects the gap before you commit to anything.');
  } else if (w.requiredMin > 0) recs.push('Your remaining work fits within usable capacity. Keep the planning buffer so one missed session does not break the plan.');
  else recs.push('No open work. Add a task to see its feasibility.');
  const infeasible = w.perTask.filter((p) => p.status === 'Infeasible');
  if (infeasible.length) recs.push(`${infeasible.map((p) => p.task.title).join(', ')} cannot be finished even with all available time before the deadline. Move the deadline or reduce scope.`);

  return (
    <div className="space-y-6">
      <PageHeader title="Workload Analysis" subtitle="Can everything actually be done? This compares remaining effort with the study time you really have, deadline by deadline." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ['Remaining work', hrs(w.requiredMin)],
          ['Raw capacity', hrs(w.rawMin)],
          ['Usable capacity', hrs(w.usableMin)],
          ['Workload gap', w.gapMin ? hrs(w.gapMin) : 'None'],
          ['Utilization', `${w.utilization}%`],
        ].map(([k, v], i) => (
          <Card key={k} className="p-4"><p className="text-xs text-slate-500">{k}</p><p className={cx('mt-1 text-2xl font-semibold tracking-tight', i === 3 && w.gapMin ? 'text-red-600' : 'text-slate-900')}>{v}</p></Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader title="Required vs available" action={<Badge tone={tone}>{w.overall}</Badge>} subtitle={`Through ${fmtDate(w.end)}, after a ${state.prefs.bufferPct}% planning buffer`} />
          <div className="space-y-4 p-5">
            {bars.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex justify-between text-xs text-slate-600"><span>{b.label}</span><span className="font-medium text-slate-900">{hrs(b.v)}</span></div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full transition-all duration-500', b.color)} style={{ width: `${(b.v / max) * 100}%` }} /></div>
              </div>
            ))}
            <p className="pt-1 text-xs text-slate-500">Utilization is required work divided by usable capacity. Above 100% means the plan cannot fit.</p>
          </div>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader title="Effort vs time before each deadline" subtitle="Per task, in hours" />
          <div className="h-64 p-4" role="img" aria-label="Bar chart comparing required hours with available hours before each deadline">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="h" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${v}h`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Required" fill="#1e293b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Available before deadline" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Deadline-based feasibility" subtitle="Slack counts earlier deadlines first, since they share the same study time" />
        {w.perTask.length === 0 ? <EmptyState icon={Lightbulb} title="No open work" text="Add tasks to see feasibility." /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500"><tr>{['Task', 'Deadline', 'Remaining', 'Time available', 'Slack', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {w.perTask.map((p) => (
                  <tr key={p.task.id}>
                    <td className="px-5 py-3 font-medium text-slate-900">{p.task.title}</td>
                    <td className="px-5 py-3 text-slate-700">{fmtDate(p.task.deadline)}</td>
                    <td className="px-5 py-3 text-slate-700">{hrs(p.remMin)}</td>
                    <td className="px-5 py-3 text-slate-700">{hrs(p.availMin)}</td>
                    <td className={cx('px-5 py-3 font-medium', p.cumSlack < 0 ? 'text-red-600' : 'text-slate-900')}>{p.cumSlack < 0 ? '−' : '+'}{hrs(Math.abs(p.cumSlack))}</td>
                    <td className="px-5 py-3"><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recommendations" subtitle="Calculated from your current tasks and availability" />
          <ul className="space-y-3 p-5">
            {recs.map((r, i) => <li key={i} className="flex gap-3 text-sm text-slate-700"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />{r}</li>)}
          </ul>
        </Card>

        <Card>
          <CardHeader title="What-if explorer" subtitle="Try changes without touching your real data" action={<SlidersHorizontal className="h-4 w-4 text-slate-400" aria-hidden />} />
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-700">Defer tasks</p>
              <div className="flex flex-wrap gap-2">
                {w.perTask.map((p) => (
                  <button key={p.task.id} aria-pressed={excluded.includes(p.task.id)} onClick={() => setExcluded((l) => (l.includes(p.task.id) ? l.filter((x) => x !== p.task.id) : [...l, p.task.id]))}
                    className={cx('rounded-full border px-3 py-1 text-xs', excluded.includes(p.task.id) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}>
                    {p.task.title}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-xs font-medium text-slate-700">Extra study time per day: {extra}h
              <input type="range" min="0" max="2" step="0.25" value={extra} onChange={(e) => setExtra(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
            </label>
            <label className="block text-xs font-medium text-slate-700">Planning buffer: {buffer}%
              <input type="range" min="0" max="30" step="5" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} className="mt-1 w-full accent-blue-600" />
            </label>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div><p className="text-xs text-slate-500">Gap now</p><p className="font-semibold">{w.gapMin ? hrs(w.gapMin) : 'None'}</p></div>
              <div><p className="text-xs text-slate-500">Gap with changes</p><p className={cx('font-semibold', scenario.gapMin ? 'text-red-600' : 'text-emerald-600')}>{scenario.gapMin ? hrs(scenario.gapMin) : 'None'}</p></div>
            </div>
            <p className="text-xs text-slate-500">{scenario.gapMin > 0 ? `Even with these changes, ${hrs(scenario.gapMin)} still does not fit.` : 'With these changes everything fits inside usable capacity.'}</p>
            <div className="flex gap-2">
              <Button disabled={!changed} onClick={apply}>Apply changes</Button>
              <Button variant="secondary" disabled={!changed} onClick={() => { setExcluded([]); setExtra(0); setBuffer(state.prefs.bufferPct); }}>Reset</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
