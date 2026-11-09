import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import { Button, Field, Input, Modal, Select, Textarea, useToast } from '../../components/ui/index.jsx';
import { TASK_STATUSES, TASK_TYPES, blankTask, newId, validateTask } from '../../services/mockTaskService.js';
import { addDays } from '../../utils/dateUtils.js';

const scale = [1, 2, 3, 4, 5];

export default function TaskFormModal({ open, onClose, task }) {
  const { state, addTask, updateTask } = useApp();
  const toast = useToast();
  const editing = Boolean(task);
  const [f, setF] = useState(blankTask());
  const [errors, setErrors] = useState({});
  const [remTouched, setRemTouched] = useState(false);
  const [sub, setSub] = useState('');

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSub('');
    setRemTouched(editing);
    setF(task ? { ...task, subtasks: task.subtasks.map((s) => ({ ...s })) } : blankTask(state.subjects[0] || '', addDays(state.demoDate, 3)));
  }, [open, task]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const onEstimate = (e) => {
    const v = e.target.value;
    setF((p) => ({ ...p, estimatedHours: v, remainingHours: remTouched ? p.remainingHours : v }));
  };
  const addSub = () => {
    if (!sub.trim()) return;
    setF((p) => ({ ...p, subtasks: [...p.subtasks, { id: newId('st'), title: sub.trim(), done: false }] }));
    setSub('');
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = validateTask(f);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (editing) {
      updateTask(f);
      toast({ title: 'Task updated', message: f.title });
    } else {
      addTask(f);
      toast({ title: 'Task added', message: `${f.title}. Regenerate your plan to schedule it.` });
    }
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit task' : 'Add task'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="task-form">{editing ? 'Save changes' : 'Add task'}</Button></>}>
      <form id="task-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" error={errors.title} className="sm:col-span-2"><Input value={f.title} onChange={set('title')} placeholder="e.g. Chemistry lab report" autoFocus /></Field>
        <Field label="Subject" error={errors.subject}>
          <Select value={f.subject} onChange={set('subject')}>
            <option value="">Select a subject</option>
            {state.subjects.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Task type"><Select value={f.type} onChange={set('type')}>{TASK_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Deadline" error={errors.deadline}><Input type="date" value={f.deadline} onChange={set('deadline')} /></Field>
        <Field label="Status"><Select value={f.status} onChange={set('status')}>{TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Estimated hours" error={errors.estimatedHours}><Input type="number" min="0.25" step="0.25" value={f.estimatedHours} onChange={onEstimate} /></Field>
        <Field label="Remaining hours" error={errors.remainingHours}><Input type="number" min="0" step="0.25" value={f.remainingHours} onChange={(e) => { setRemTouched(true); set('remainingHours')(e); }} /></Field>
        <Field label="Difficulty"><Select value={f.difficulty} onChange={set('difficulty')}>{scale.map((n) => <option key={n} value={n}>{n} of 5</option>)}</Select></Field>
        <Field label="Importance"><Select value={f.importance} onChange={set('importance')}>{scale.map((n) => <option key={n} value={n}>{n} of 5</option>)}</Select></Field>
        <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={set('description')} placeholder="Optional notes" /></Field>
        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-700">Subtasks (optional)</span>
          <ul className="mb-2 space-y-1">
            {f.subtasks.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="truncate">{s.title}</span>
                <button type="button" aria-label={`Remove subtask ${s.title}`} className="text-slate-400 hover:text-red-600" onClick={() => setF((p) => ({ ...p, subtasks: p.subtasks.filter((x) => x.id !== s.id) }))}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} placeholder="Add a subtask and press Enter" />
            <Button type="button" variant="secondary" icon={Plus} onClick={addSub}>Add</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
