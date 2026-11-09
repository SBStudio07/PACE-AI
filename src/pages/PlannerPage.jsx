import { useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, DemoAiBadge, Field, Input, Modal, PageHeader, Select, cx, useToast } from '../components/ui/index.jsx';
import SessionRow from '../features/planner/SessionRow.jsx';
import TaskDetailModal from '../features/tasks/TaskDetailModal.jsx';
import TaskFormModal from '../features/tasks/TaskFormModal.jsx';
import { addDays, dateRange, fmtDate, fmtTime, fromMin, startOfWeek, toMin, weekdayIndex } from '../utils/dateUtils.js';
import { SHORT_DAYS, dayCapacity, hrs, subjectColor } from '../utils/workloadUtils.js';

function EditSession({ session, onClose }) {
  const { state, updateSession } = useApp();
  const toast = useToast();
  const [date, setDate] = useState(session.date);
  const [start, setStart] = useState(session.start);
  const [minutes, setMinutes] = useState(session.minutes);
  const [err, setErr] = useState('');
  const task = state.tasks.find((t) => t.id === session.taskId);

  const save = () => {
    const m = Number(minutes);
    if (!(m >= 15 && m <= 180)) return setErr('Duration must be between 15 and 180 minutes.');
    if (task && date > task.deadline) return setErr(`This task is due ${fmtDate(task.deadline)}. Choose an earlier date.`);
    const s = toMin(start), e = s + m;
    const clash = state.sessions.find((x) => x.id !== session.id && x.date === date && x.status !== 'missed' && toMin(x.start) < e && toMin(x.end) > s);
    if (clash) return setErr(`That overlaps another session (${fmtTime(clash.start)} to ${fmtTime(clash.end)}).`);
    updateSession({ ...session, date, start, end: fromMin(e), minutes: m });
    toast({ title: 'Session updated', message: `${task?.title} moved to ${fmtDate(date)}, ${fmtTime(start)}.` });
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Edit session" size="sm" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save}>Save session</Button></>}>
      <p className="mb-4 text-sm text-slate-600">{task?.title}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Start time"><Input type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Duration (minutes)"><Input type="number" min="15" max="180" step="5" value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
    </Modal>
  );
}

export default function PlannerPage() {
  const { state, plan, needsReplan, regeneratePlan, taskById } = useApp();
  const toast = useToast();
  const [weekStart, setWeekStart] = useState(startOfWeek(state.demoDate));
  const [selected, setSelected] = useState(state.demoDate);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [editSession, setEditSession] = useState(null);

  const days = useMemo(() => dateRange(weekStart, addDays(weekStart, 6)), [weekStart]);
  const isCurrent = weekStart === startOfWeek(state.demoDate);
  const byDay = (d) => state.sessions.filter((s) => s.date === d).sort((a, b) => a.start.localeCompare(b.start));
  const shift = (n) => { const w = addDays(weekStart, n * 7); setWeekStart(w); setSelected(w <= state.demoDate && state.demoDate < addDays(w, 7) ? state.demoDate : w); };

  const generate = async () => {
    setLoading(true);
    const s = await regeneratePlan();
    setLoading(false);
    toast(s.feasible
      ? { title: 'Plan generated', message: 'All remaining work fits in your usable study time.' }
      : { title: 'Plan generated with a gap', message: `${hrs(s.gapMin)} of work does not fit before its deadline.`, tone: 'warning', duration: 7000 });
  };

  const hasPlanned = state.sessions.some((s) => s.status === 'planned');
  const weekMin = days.reduce((a, d) => a + byDay(d).reduce((x, s) => x + s.minutes, 0), 0);

  return (
    <div>
      <PageHeader title="Weekly Planner" subtitle="Sessions are placed into your real availability windows, most urgent first. Nothing is scheduled after its deadline."
        actions={<Button icon={hasPlanned ? RefreshCw : Sparkles} loading={loading} onClick={generate}>{loading ? 'Planning…' : hasPlanned ? 'Regenerate plan' : 'Generate my plan'}</Button>} />

      {needsReplan && !loading && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span>Some open tasks have no planned sessions. Regenerate to include them.</span>
          <Button size="sm" onClick={generate}>Regenerate plan</Button>
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-slate-900"><CalendarCheck className="h-4 w-4 text-blue-600" aria-hidden />Plan summary <DemoAiBadge /></span>
          <span className="text-slate-600">Required <b className="text-slate-900">{hrs(plan.requiredMin)}</b></span>
          <span className="text-slate-600">Scheduled <b className="text-slate-900">{hrs(plan.scheduledMin)}</b></span>
          {plan.gapMin > 0 ? <Badge tone="red">{hrs(plan.gapMin)} unallocated</Badge> : <Badge tone="green">Everything fits</Badge>}
        </div>
        {plan.unallocated.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">Does not fit: {plan.unallocated.map((u) => `${u.title} (${hrs(u.minutes)}, due ${fmtDate(u.deadline)})`).join('; ')}. See Workload Analysis for options.</p>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => shift(-1)} aria-label="Previous week">Prev</Button>
        <Button variant="secondary" size="sm" onClick={() => { setWeekStart(startOfWeek(state.demoDate)); setSelected(state.demoDate); }} disabled={isCurrent}>This week</Button>
        <Button variant="secondary" size="sm" onClick={() => shift(1)} aria-label="Next week">Next <ChevronRight className="h-4 w-4" aria-hidden /></Button>
        <p className="ml-1 text-sm font-medium text-slate-800">{fmtDate(days[0])} to {fmtDate(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        {isCurrent && <Badge tone="blue">Current week</Badge>}
        <span className="ml-auto text-xs text-slate-500">{hrs(weekMin)} planned this week</span>
      </div>

      {/* Mobile day picker */}
      <div className="mb-3 flex gap-1 overflow-x-auto md:hidden" role="tablist" aria-label="Day of week">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={selected === d} onClick={() => setSelected(d)}
            className={cx('min-w-[3.25rem] rounded-lg px-2 py-2 text-center text-xs font-medium', selected === d ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200')}>
            {SHORT_DAYS[weekdayIndex(d)]}<span className="block text-sm">{new Date(d + 'T00:00:00').getDate()}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {days.map((d) => {
          const list = byDay(d);
          const cap = dayCapacity(state.availability, d, state.prefs, []);
          const used = list.reduce((a, s) => a + (s.status === 'missed' ? 0 : s.minutes), 0);
          const free = Math.max(0, cap.usableMin - used);
          const today = d === state.demoDate;
          return (
            <div key={d} className={cx('min-w-0 rounded-xl border bg-white', today ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200', selected === d ? 'block' : 'hidden md:block')}>
              <div className={cx('border-b px-3 py-2', today ? 'border-blue-100 bg-blue-50' : 'border-slate-100')}>
                <p className="text-xs font-medium text-slate-500">{SHORT_DAYS[weekdayIndex(d)]}</p>
                <p className={cx('text-sm font-semibold', today ? 'text-blue-700' : 'text-slate-900')}>{fmtDate(d)}{today && ' · Today'}</p>
              </div>
              <div className="min-h-24 space-y-2 p-2">
                {list.length === 0 && <p className="px-1 py-3 text-center text-xs text-slate-400">{cap.windowMin ? 'No sessions' : 'No study time'}</p>}
                {list.map((s) => {
                  const t = taskById[s.taskId];
                  if (!t) return null;
                  return (
                    <button key={s.id} onClick={() => setDetail(s)} aria-label={`${t.title}, ${fmtTime(s.start)}, ${s.status}`}
                      className={cx('w-full rounded-lg border-l-4 bg-slate-50 px-2 py-1.5 text-left text-xs hover:bg-slate-100', s.status === 'missed' && 'opacity-60')} style={{ borderLeftColor: subjectColor(t.subject) }}>
                      <span className="block truncate font-medium text-slate-900">{t.title}</span>
                      <span className="flex items-center justify-between gap-1 text-slate-500"><span>{fmtTime(s.start)} · {s.minutes}m</span>
                        <span className={cx('h-2 w-2 rounded-full', { planned: 'bg-slate-300', completed: 'bg-emerald-500', partial: 'bg-amber-500', missed: 'bg-red-500' }[s.status])} title={s.status} /></span>
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
                {cap.windowMin ? <>Window {fmtTime(fromMin(cap.startMin))}, {hrs(cap.windowMin)}<br />Free slot: {hrs(free)}</> : 'No availability'}
              </div>
            </div>
          );
        })}
      </div>

      {detail && !detail.view && (
        <Modal open onClose={() => setDetail(null)} title="Session" size="md"
          footer={<><Button variant="secondary" onClick={() => setDetail(null)}>Close</Button><Button variant="secondary" onClick={() => { setEditSession(detail); setDetail(null); }}>Edit session</Button><Button onClick={() => { setDetail({ ...detail, view: 'task' }); }}>Task details</Button></>}>
          <div className="-mx-5 -my-4">
            <SessionRow session={state.sessions.find((s) => s.id === detail.id) || detail} onDetails={() => setDetail({ ...detail, view: 'task' })} />
          </div>
        </Modal>
      )}
      {detail?.view === 'task' && <TaskDetailModal taskId={detail.taskId} onClose={() => setDetail(null)} onEdit={(t) => { setDetail(null); setEditTask(t); }} />}
      {editSession && <EditSession session={editSession} onClose={() => setEditSession(null)} />}
      <TaskFormModal open={Boolean(editTask)} task={editTask} onClose={() => setEditTask(null)} />
    </div>
  );
}
