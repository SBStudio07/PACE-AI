import { Pencil } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Badge, Button, Modal, ProgressBar } from '../../components/ui/index.jsx';
import { fmtDateLong, fmtTime, relativeDay } from '../../utils/dateUtils.js';
import { statusLabel } from '../../services/mockTaskService.js';
import { subjectColor } from '../../utils/workloadUtils.js';
import { SESSION_BADGE } from '../planner/SessionRow.jsx';

export default function TaskDetailModal({ taskId, onClose, onEdit }) {
  const { state, toggleSubtask } = useApp();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const done = task.estimatedHours - task.remainingHours;
  const sessions = state.sessions.filter((s) => s.taskId === task.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return (
    <Modal open onClose={onClose} title={task.title} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button icon={Pencil} onClick={() => onEdit(task)}>Edit task</Button></>}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: subjectColor(task.subject) }} />{task.subject}</span>
          <Badge tone="blue">{task.type}</Badge>
          <Badge tone={task.status === 'completed' ? 'green' : 'slate'}>{statusLabel(task.status)}</Badge>
        </div>
        {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ['Deadline', `${fmtDateLong(task.deadline)}`],
            ['Due', relativeDay(task.deadline, state.demoDate)],
            ['Difficulty', `${task.difficulty} / 5`],
            ['Importance', `${task.importance} / 5`],
          ].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>
          ))}
        </dl>
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-slate-500"><span>Progress</span><span>{Math.round(done * 10) / 10}h done · {task.remainingHours}h left of {task.estimatedHours}h</span></div>
          <ProgressBar value={done} max={task.estimatedHours} tone={task.status === 'completed' ? 'green' : 'blue'} label="Task progress" />
        </div>
        {task.subtasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium text-slate-700">Subtasks</h3>
            <ul className="space-y-1.5">
              {task.subtasks.map((s) => (
                <li key={s.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(task.id, s.id)} className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                    <span className={s.done ? 'text-slate-400 line-through' : ''}>{s.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-medium text-slate-700">Planned sessions</h3>
          {sessions.length === 0 ? <p className="text-sm text-slate-500">No sessions yet. Generate a plan from the Weekly Planner.</p> : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-slate-700">{new Date(s.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, {fmtTime(s.start)} ({s.minutes} min)</span>
                  <Badge tone={SESSION_BADGE[s.status].tone}>{SESSION_BADGE[s.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
