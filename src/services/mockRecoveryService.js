// Recovery = re-run the SAME scheduler on updated state, then diff against the current plan.
// Nothing is applied here; the UI must call applyRecovery() only after student approval.
import { generatePlan, summarizePlan } from './mockSchedulingService.js';
import { computeWorkload, hrs } from '../utils/workloadUtils.js';
import { addDays, dateRange, fmtDate } from '../utils/dateUtils.js';
import { newId, normalizeTask } from './mockTaskService.js';
import { delay } from './mockAIService.js';

export const QUICK_ACTIONS = [
  { id: 'missed', label: 'I missed today’s study session', hint: 'Pick the sessions you missed' },
  { id: 'newTask', label: 'I received a new assignment', hint: 'Add it and see the impact' },
  { id: 'lessTime', label: 'I have less time this week', hint: 'Remove hours from the next 7 days' },
  { id: 'recalc', label: 'Recalculate my schedule', hint: 'Rebuild the plan from current state' },
  { id: 'priorities', label: 'Show my highest-priority tasks', hint: 'Ranked by deadline slack' },
];

const title = (tasks, id) => tasks.find((t) => t.id === id)?.title || 'Task';

function reduceWeek(availability, demoDate, hoursLost, prefs, tasks) {
  const dates = dateRange(demoDate, addDays(demoDate, 6));
  const base = dates.map((d) => {
    const o = availability.overrides?.[d];
    const wd = (new Date(d + 'T00:00:00').getDay() + 6) % 7;
    return { d, h: o !== undefined ? o : availability.days[wd].hours };
  });
  const total = base.reduce((a, x) => a + x.h, 0);
  const factor = total > 0 ? Math.max(0, (total - hoursLost) / total) : 0;
  const overrides = { ...(availability.overrides || {}) };
  base.forEach(({ d, h }) => (overrides[d] = Math.round(h * factor * 4) / 4));
  return { ...availability, overrides };
}

export function proposeRecovery(scenario, payload, state) {
  const { tasks, sessions, availability, prefs, demoDate } = state;
  let tasks2 = tasks;
  let sessions2 = sessions;
  let availability2 = availability;
  const notes = [];

  if (scenario === 'missed') {
    const ids = payload?.sessionIds || [];
    sessions2 = sessions.map((s) => (ids.includes(s.id) ? { ...s, status: 'missed' } : s));
    sessions2
      .filter((s) => s.status === 'missed' && (ids.includes(s.id) || s.date >= addDays(demoDate, -7)))
      .forEach((s) => notes.push(`${title(tasks, s.taskId)}: ${s.minutes} min missed on ${fmtDate(s.date)}, so that effort is still outstanding.`));
  }
  if (scenario === 'newTask' && payload?.task) {
    const t = normalizeTask({ ...payload.task, id: newId('t') });
    tasks2 = [...tasks, t];
    notes.push(`New task added: ${t.title} (${t.remainingHours}h, due ${fmtDate(t.deadline)}).`);
  }
  if (scenario === 'lessTime') {
    const lost = Number(payload?.hoursLost) || 0;
    availability2 = reduceWeek(availability, demoDate, lost, prefs, tasks);
    notes.push(`Study time for the next 7 days reduced by ${lost}h.`);
  }
  if (scenario === 'recalc') notes.push('Plan rebuilt from your current tasks, availability and progress.');

  const kept = sessions2.filter((s) => s.status !== 'planned');
  const before = summarizePlan({ tasks, sessions, demoDate });
  const result = generatePlan({ tasks: tasks2, sessions: sessions2, availability: availability2, prefs, demoDate });
  const keptCompleted = kept.filter((s) => s.status === 'completed' || s.status === 'partial').length;

  const key = (s) => `${s.taskId}|${s.date}|${s.start}`;
  const oldPlanned = sessions.filter((s) => s.status === 'planned' && s.date >= demoDate);
  const oldKeys = new Set(oldPlanned.map(key));
  const newKeys = new Set(result.sessions.map(key));
  const diff = {
    added: result.sessions.filter((s) => !oldKeys.has(key(s))).length,
    removed: oldPlanned.filter((s) => !newKeys.has(key(s)) && sessions2.find((x) => x.id === s.id)?.status === 'planned').length,
    unchanged: result.sessions.filter((s) => oldKeys.has(key(s))).length,
  };

  const after = result.summary;
  const afterBy = {};
  result.sessions.forEach((s) => (afterBy[s.taskId] = (afterBy[s.taskId] || 0) + s.minutes));
  const ids = new Set([...Object.keys(before.plannedBy), ...Object.keys(afterBy)]);
  const perTask = [...ids].map((id) => ({
    taskId: id,
    title: title(tasks2, id),
    before: before.plannedBy[id] || 0,
    after: afterBy[id] || 0,
  }));
  tasks2.forEach((t) => {
    if (!ids.has(t.id) && !['completed', 'deferred'].includes(t.status) && t.remainingHours > 0) {
      perTask.push({ taskId: t.id, title: t.title, before: 0, after: 0 });
    }
  });

  const w = computeWorkload({ tasks: tasks2, sessions: sessions2, availability: availability2, prefs, demoDate });
  const wBefore = computeWorkload({ tasks, sessions, availability, prefs, demoDate });
  const explanation = [
    ...notes,
    `Preserved ${keptCompleted} completed or partly completed session${keptCompleted === 1 ? '' : 's'}; only upcoming sessions are re-planned.`,
    `Usable study capacity is now ${hrs(w.usableMin)} (was ${hrs(wBefore.usableMin)}) against ${hrs(w.requiredMin)} of remaining work.`,
    w.perTask.length
      ? `Most urgent after recalculation: ${[...w.perTask].sort((a, b) => a.priority - b.priority)[0].task.title}.`
      : 'No active tasks remain.',
  ];
  const unresolved = after.unallocated;
  if (unresolved.length) {
    explanation.push(
      `${hrs(after.gapMin)} of work does not fit before its deadline. This is shown below rather than hidden. You can defer a task, extend a deadline, or add study time.`,
    );
  } else {
    explanation.push('All remaining work fits inside your usable capacity.');
  }

  return {
    scenario,
    tasks: tasks2,
    availability: availability2,
    keptSessions: kept,
    newSessions: result.sessions,
    before: { ...before, usableMin: wBefore.usableMin },
    after: { ...after, usableMin: w.usableMin },
    perTask,
    diff,
    unresolved,
    explanation,
    simulated: true,
  };
}

export async function runRecovery(scenario, payload, state) {
  await delay(1100); // simulated analysis time
  return proposeRecovery(scenario, payload, state);
}

/** Returns the state slices to store when the student approves. */
export function applyRecovery(proposal) {
  return {
    tasks: proposal.tasks,
    availability: proposal.availability,
    sessions: [...proposal.keptSessions, ...proposal.newSessions],
  };
}
