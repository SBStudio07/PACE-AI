import { useMemo, useState } from 'react';
import { FileUp, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Badge, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, ProgressBar, Select, useToast } from '../components/ui/index.jsx';
import TaskFormModal from '../features/tasks/TaskFormModal.jsx';
import TaskDetailModal from '../features/tasks/TaskDetailModal.jsx';
import ExtractionModal from '../features/document-extraction/ExtractionModal.jsx';
import { TASK_STATUSES, TASK_TYPES } from '../services/mockTaskService.js';
import { fmtDate, relativeDay, addDays } from '../utils/dateUtils.js';
import { priorityLabel } from '../utils/priorityUtils.js';
import { subjectColor } from '../utils/workloadUtils.js';

export default function TasksPage() {
  const { state, workload, updateTask, deleteTask } = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('all');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [due, setDue] = useState('all');
  const [sort, setSort] = useState('priority');
  const [form, setForm] = useState({ open: false, task: null });
  const [detail, setDetail] = useState(null);
  const [del, setDel] = useState(null);
  const [pdf, setPdf] = useState(false);

  const prio = useMemo(() => Object.fromEntries(workload.perTask.map((p) => [p.task.id, p.priority])), [workload]);

  const rows = useMemo(() => {
    const today = state.demoDate;
    const list = state.tasks.filter((t) => {
      if (q && !`${t.title} ${t.subject} ${t.description}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (subject !== 'all' && t.subject !== subject) return false;
      if (type !== 'all' && t.type !== type) return false;
      if (status !== 'all' && t.status !== status) return false;
      if (due === 'overdue' && !(t.deadline < today && t.status !== 'completed')) return false;
      if (due === 'week' && !(t.deadline >= today && t.deadline <= addDays(today, 7))) return false;
      if (due === 'later' && !(t.deadline > addDays(today, 7))) return false;
      return true;
    });
    const inactive = (t) => (['completed', 'deferred'].includes(t.status) ? 1 : 0);
    return list.sort((a, b) =>
      sort === 'deadline'
        ? a.deadline.localeCompare(b.deadline)
        : inactive(a) - inactive(b) || (prio[a.id] ?? 99) - (prio[b.id] ?? 99) || a.deadline.localeCompare(b.deadline),
    );
  }, [state.tasks, state.demoDate, q, subject, type, status, due, sort, prio]);

  const toggleDone = (t) => {
    if (t.status === 'completed') updateTask({ ...t, status: 'in_progress', remainingHours: t.remainingHours > 0 ? t.remainingHours : t.estimatedHours });
    else { updateTask({ ...t, status: 'completed', remainingHours: 0 }); toast({ title: 'Task completed', message: t.title }); }
  };
  const changeStatus = (t, s) => updateTask({ ...t, status: s, remainingHours: s === 'completed' ? 0 : t.remainingHours > 0 ? t.remainingHours : t.estimatedHours });
  const clear = () => { setQ(''); setSubject('all'); setType('all'); setStatus('all'); setDue('all'); };
  const filtered = q || subject !== 'all' || type !== 'all' || status !== 'all' || due !== 'all';

  return (
    <div>
      <PageHeader title="My Tasks" subtitle="Everything with a deadline lives here. Changes update your dashboard and workload analysis straight away."
        actions={<><Button variant="secondary" icon={FileUp} onClick={() => setPdf(true)}>Import from PDF</Button><Button icon={Plus} onClick={() => setForm({ open: true, task: null })}>Add task</Button></>} />

      <Card>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks" aria-label="Search tasks" />
          </div>
          <Select aria-label="Filter by subject" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="all">All subjects</option>{state.subjects.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)}><option value="all">All types</option>{TASK_TYPES.map((s) => <option key={s}>{s}</option>)}</Select>
          <Select aria-label="Filter by deadline" value={due} onChange={(e) => setDue(e.target.value)}>
            <option value="all">Any deadline</option><option value="overdue">Overdue</option><option value="week">Next 7 days</option><option value="later">Later</option>
          </Select>
          <Select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)}><option value="priority">Sort: priority</option><option value="deadline">Sort: deadline</option></Select>
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="lg:col-span-1"><option value="all">All statuses</option>{TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={ListChecks} title={filtered ? 'No tasks match these filters' : 'No tasks yet'}
            text={filtered ? 'Try a different search or clear the filters.' : 'Add a task or import one from a PDF to start planning.'}
            action={filtered ? <Button variant="secondary" onClick={clear}>Clear filters</Button> : <Button icon={Plus} onClick={() => setForm({ open: true, task: null })}>Add task</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="w-10 px-5 py-3 font-medium"><span className="sr-only">Done</span></th>
                  <th className="px-2 py-3 font-medium">Task</th>
                  <th className="px-2 py-3 font-medium">Deadline</th>
                  <th className="px-2 py-3 font-medium">Progress</th>
                  <th className="px-2 py-3 font-medium">Priority</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => {
                  const p = ['completed', 'deferred'].includes(t.status) ? null : priorityLabel(prio[t.id] ?? 99);
                  const overdue = t.deadline < state.demoDate && t.status !== 'completed';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3"><input type="checkbox" checked={t.status === 'completed'} onChange={() => toggleDone(t)} aria-label={`Mark ${t.title} complete`} className="h-4 w-4 rounded border-slate-300 accent-blue-600" /></td>
                      <td className="px-2 py-3">
                        <button onClick={() => setDetail(t.id)} className="block max-w-xs truncate text-left font-medium text-slate-900 hover:text-blue-700">{t.title}</button>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full" style={{ background: subjectColor(t.subject) }} aria-hidden />{t.subject} · {t.type} · D{t.difficulty} I{t.importance}</span>
                      </td>
                      <td className="px-2 py-3"><span className="block text-slate-800">{fmtDate(t.deadline)}</span><span className={`text-xs ${overdue ? 'text-red-600' : 'text-slate-500'}`}>{relativeDay(t.deadline, state.demoDate)}</span></td>
                      <td className="w-40 px-2 py-3"><ProgressBar value={t.estimatedHours - t.remainingHours} max={t.estimatedHours} tone={t.status === 'completed' ? 'green' : 'blue'} label={`${t.title} progress`} /><span className="mt-1 block text-xs text-slate-500">{t.remainingHours}h left of {t.estimatedHours}h</span></td>
                      <td className="px-2 py-3">{p ? <Badge tone={p.tone}>{p.label}</Badge> : <span className="text-xs text-slate-400">–</span>}</td>
                      <td className="px-2 py-3"><Select aria-label={`Status of ${t.title}`} value={t.status} onChange={(e) => changeStatus(t, e.target.value)} className="h-8 py-0 text-xs">{TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setForm({ open: true, task: t })} aria-label={`Edit ${t.title}`} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => setDel(t)} aria-label={`Delete ${t.title}`} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TaskFormModal open={form.open} task={form.task} onClose={() => setForm({ open: false, task: null })} />
      {detail && <TaskDetailModal taskId={detail} onClose={() => setDetail(null)} onEdit={(t) => { setDetail(null); setForm({ open: true, task: t }); }} />}
      <ExtractionModal open={pdf} onClose={() => setPdf(false)} />
      <ConfirmDialog open={Boolean(del)} danger title="Delete this task?" confirmLabel="Delete task" onClose={() => setDel(null)}
        text={del ? `“${del.title}” and its planned sessions will be removed. Completed session history is kept.` : ''}
        onConfirm={() => { deleteTask(del.id); toast({ title: 'Task deleted', message: del.title, tone: 'info' }); }} />
    </div>
  );
}
