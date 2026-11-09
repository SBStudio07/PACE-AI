import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock, ListChecks } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, CardHeader, EmptyState, ProgressBar } from '../components/ui/index.jsx';
import SessionRow from '../features/planner/SessionRow.jsx';
import TaskDetailModal from '../features/tasks/TaskDetailModal.jsx';
import TaskFormModal from '../features/tasks/TaskFormModal.jsx';
import { fmtDate, relativeDay } from '../utils/dateUtils.js';
import { hrs, subjectColor, weekChartData } from '../utils/workloadUtils.js';

const OVERALL_TONE = { Achievable: 'green', 'At Risk': 'amber', Overloaded: 'red', Critical: 'red' };

export function Stat({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs text-slate-500"><Icon className="h-4 w-4" aria-hidden />{label}</div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

export default function DashboardPage() {
  const { state, workload, todaySessions, missed, plan } = useApp();
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const first = state.profile.name.split(' ')[0];

  const week = useMemo(() => weekChartData(state, state.demoDate), [state]);
  const todayPlannedMin = todaySessions.filter((s) => s.status === 'planned').reduce((a, s) => a + s.minutes, 0);
  const doneToday = todaySessions.filter((s) => s.status === 'completed').length;
  const upcoming = state.tasks
    .filter((t) => t.status !== 'completed' && t.status !== 'deferred')
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 6);
  const dueWeek = state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'deferred' && t.deadline >= state.demoDate && t.deadline <= week[6].date).length;
  const tone = OVERALL_TONE[workload.overall];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{greet}, {first}.</h1>
        <p className="mt-1 text-sm text-slate-500">Let’s make today productive without overloading yourself.</p>
      </div>

      {missed.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />You have {missed.length} missed session{missed.length > 1 ? 's' : ''}. Your plan has not changed yet.</p>
          <Link to="/app/recovery"><Button size="sm" variant="secondary">Review recovery options</Button></Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ListChecks} label="Sessions today" value={todaySessions.length} sub={`${todaySessions.filter((s) => s.status === 'planned').length} still to do`} />
        <Stat icon={CheckCircle2} label="Completed today" value={doneToday} sub={`of ${todaySessions.length} sessions`} />
        <Stat icon={Clock} label="Study time left today" value={hrs(todayPlannedMin)} sub="planned sessions" />
        <Stat icon={CalendarClock} label="Deadlines this week" value={dueWeek} sub={`${state.tasks.filter((t) => t.status !== 'completed' && t.status !== 'deferred').length} open tasks`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Workload feasibility" subtitle="Remaining work against usable study time" action={<Badge tone={tone}>{workload.overall}</Badge>} />
          <div className="space-y-4 p-5">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-slate-500">Required</dt><dd className="text-lg font-semibold text-slate-900">{hrs(workload.requiredMin)}</dd></div>
              <div><dt className="text-xs text-slate-500">Raw capacity</dt><dd className="text-lg font-semibold text-slate-900">{hrs(workload.rawMin)}</dd></div>
              <div><dt className="text-xs text-slate-500">Usable capacity</dt><dd className="text-lg font-semibold text-slate-900">{hrs(workload.usableMin)}</dd></div>
              <div><dt className="text-xs text-slate-500">Practical gap</dt><dd className={`text-lg font-semibold ${workload.gapMin ? 'text-red-600' : 'text-emerald-600'}`}>{workload.gapMin ? hrs(workload.gapMin) : 'None'}</dd></div>
            </dl>
            <div>
              <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Capacity used</span><span>{workload.utilization}%</span></div>
              <ProgressBar value={Math.min(100, workload.utilization)} tone={tone === 'green' ? 'green' : tone} label="Workload utilization" />
            </div>
            {plan.gapMin > 0 && <p className="text-xs text-slate-500">{hrs(plan.gapMin)} of required work is not yet covered by a planned session.</p>}
            <Link to="/app/workload" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">Open workload analysis <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Today’s study sessions" subtitle={fmtDate(state.demoDate, { weekday: 'long', day: 'numeric', month: 'long' })} action={<Link to="/app/planner" className="text-sm font-medium text-blue-600 hover:underline">Weekly planner</Link>} />
          {todaySessions.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No sessions today" text="Generate a plan in the Weekly Planner to schedule your study time." action={<Link to="/app/planner"><Button>Open planner</Button></Link>} />
          ) : (
            <div className="divide-y divide-slate-100">
              {todaySessions.map((s) => <SessionRow key={s.id} session={s} onDetails={(x) => setDetail(x.taskId)} />)}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming deadlines" />
          {upcoming.length === 0 ? <EmptyState icon={CheckCircle2} title="Nothing due" text="You have no open tasks." /> : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((t) => (
                <li key={t.id}>
                  <button onClick={() => setDetail(t.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: subjectColor(t.subject) }} aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-900">{t.title}</span><span className="text-xs text-slate-500">{t.type}</span></span>
                    <span className="text-right text-xs text-slate-500"><span className="block font-medium text-slate-700">{fmtDate(t.deadline)}</span>{relativeDay(t.deadline, state.demoDate)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Weekly progress" subtitle="Planned vs completed study hours" />
          <div className="h-60 p-4" role="img" aria-label="Bar chart of planned versus completed study hours per day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="h" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${v}h`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="planned" name="Planned" fill="#bfdbfe" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Capacity distribution" subtitle="Usable study hours across the week" />
          <div className="h-60 p-4" role="img" aria-label="Stacked bar chart of scheduled and free study hours per day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={week} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} unit="h" />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${v}h`} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="scheduled" name="Scheduled" stackId="a" fill="#2563eb" />
                <Bar dataKey="free" name="Free" stackId="a" fill="#dbeafe" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {detail && <TaskDetailModal taskId={detail} onClose={() => setDetail(null)} onEdit={(t) => { setDetail(null); setEditing(t); }} />}
      <TaskFormModal open={Boolean(editing)} task={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
