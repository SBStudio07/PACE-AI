import { Check, CircleDot, Info, RotateCcw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext.jsx';
import { Badge, cx, useToast } from '../../components/ui/index.jsx';
import { fmtTime } from '../../utils/dateUtils.js';
import { subjectColor } from '../../utils/workloadUtils.js';

export const SESSION_BADGE = {
  planned: { tone: 'slate', label: 'Planned' },
  completed: { tone: 'green', label: 'Completed' },
  partial: { tone: 'amber', label: 'Partial' },
  missed: { tone: 'red', label: 'Missed' },
};

/** Shared by dashboard, planner and task detail so session actions behave identically everywhere. */
export function useSessionActions() {
  const { setSessionStatus, taskById } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  return (session, status) => {
    setSessionStatus(session.id, status);
    const title = taskById[session.taskId]?.title || 'Session';
    if (status === 'completed') toast({ title: 'Session completed', message: `${title}: progress updated.` });
    else if (status === 'partial') toast({ title: 'Marked partially completed', message: `Half of this session was credited to ${title}.`, tone: 'info' });
    else if (status === 'missed') {
      toast({
        title: 'Session marked as missed',
        message: 'Your plan is unchanged until you review a recovery proposal.',
        tone: 'warning',
        action: { label: 'Review recovery options', onClick: () => navigate('/app/recovery') },
        duration: 7000,
      });
    } else toast({ title: 'Session reset to planned', tone: 'info' });
  };
}

export default function SessionRow({ session, onDetails, onEdit }) {
  const { taskById } = useApp();
  const mark = useSessionActions();
  const task = taskById[session.taskId];
  if (!task) return null;
  const b = SESSION_BADGE[session.status];
  const btn = 'rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <div className="w-20 shrink-0 text-xs font-medium text-slate-500">
        {fmtTime(session.start)}
        <span className="block font-normal">{session.minutes} min</span>
      </div>
      <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: subjectColor(task.subject) }} aria-hidden />
      <div className="min-w-0 flex-1 basis-40">
        <p className={cx('truncate text-sm font-medium text-slate-900', session.status === 'completed' && 'text-slate-500 line-through')}>{task.title}</p>
        <p className="truncate text-xs text-slate-500">{task.subject}</p>
      </div>
      <Badge tone={b.tone}>{b.label}</Badge>
      <div className="flex items-center gap-0.5">
        {session.status === 'planned' ? (
          <>
            <button className={btn} onClick={() => mark(session, 'completed')} aria-label={`Mark ${task.title} session completed`} title="Completed"><Check className="h-4 w-4" /></button>
            <button className={btn} onClick={() => mark(session, 'partial')} aria-label={`Mark ${task.title} session partially completed`} title="Partially completed"><CircleDot className="h-4 w-4" /></button>
            <button className={btn} onClick={() => mark(session, 'missed')} aria-label={`Mark ${task.title} session missed`} title="Missed"><X className="h-4 w-4" /></button>
          </>
        ) : (
          <button className={btn} onClick={() => mark(session, 'planned')} aria-label="Reset session to planned" title="Undo"><RotateCcw className="h-4 w-4" /></button>
        )}
        <button className={btn} onClick={() => onDetails(session)} aria-label={`View details for ${task.title}`} title="Task details"><Info className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
