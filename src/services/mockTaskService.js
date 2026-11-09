// Task helpers. Swap for real API calls later (same signatures, make them async).
export const TASK_TYPES = ['Assignment', 'Examination', 'Project', 'Presentation', 'Revision', 'Other'];
export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'deferred', label: 'Deferred' },
];
export const statusLabel = (v) => TASK_STATUSES.find((s) => s.value === v)?.label || v;

export const newId = (p = 't') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function blankTask(subject = '', deadline = '') {
  return {
    title: '',
    subject,
    description: '',
    type: 'Assignment',
    deadline,
    estimatedHours: 2,
    remainingHours: 2,
    difficulty: 3,
    importance: 3,
    status: 'todo',
    subtasks: [],
  };
}

export function validateTask(d) {
  const e = {};
  if (!d.title?.trim()) e.title = 'Give the task a title.';
  if (!d.subject) e.subject = 'Choose a subject.';
  if (!d.deadline) e.deadline = 'Pick a deadline.';
  const est = Number(d.estimatedHours);
  const rem = Number(d.remainingHours);
  if (!(est > 0)) e.estimatedHours = 'Enter hours greater than 0.';
  if (!(rem >= 0)) e.remainingHours = 'Enter 0 or more hours.';
  else if (rem > est) e.remainingHours = 'Remaining hours cannot exceed the estimate.';
  return e;
}

export function normalizeTask(d) {
  const est = Number(d.estimatedHours);
  let rem = Number(d.remainingHours);
  let status = d.status;
  if (rem <= 0) status = 'completed';
  else if (status === 'completed') status = 'in_progress';
  return {
    ...d,
    id: d.id || newId('t'),
    title: d.title.trim(),
    description: d.description?.trim() || '',
    estimatedHours: est,
    remainingHours: rem,
    difficulty: Number(d.difficulty),
    importance: Number(d.importance),
    status,
    subtasks: d.subtasks || [],
  };
}

/** Marking a session updates the task's remaining hours. Partial credits half the session. Undo-safe. */
export function applySessionStatus(task, session, status) {
  const credit = status === 'completed' ? session.minutes : status === 'partial' ? Math.round(session.minutes / 2) : 0;
  let remaining = task.remainingHours + session.creditedMin / 60 - credit / 60;
  remaining = Math.min(task.estimatedHours, Math.max(0, Math.round(remaining * 100) / 100));
  let tStatus = task.status;
  if (remaining <= 0) tStatus = 'completed';
  else if (tStatus === 'completed') tStatus = 'in_progress';
  else if (credit > 0 && tStatus === 'todo') tStatus = 'in_progress';
  return {
    task: { ...task, remainingHours: remaining, status: tStatus },
    session: { ...session, status, creditedMin: credit },
  };
}
