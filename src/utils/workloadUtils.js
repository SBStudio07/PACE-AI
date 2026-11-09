import { addDays, dateRange, startOfWeek, toMin, weekdayIndex } from './dateUtils.js';
import { priorityKey } from './priorityUtils.js';

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SHORT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECT_COLORS = {
  Mathematics: '#2563EB',
  Physics: '#7C3AED',
  Chemistry: '#059669',
  Programming: '#EA580C',
  English: '#DB2777',
};
const FALLBACK = ['#0891B2', '#CA8A04', '#4F46E5', '#BE123C', '#0D9488', '#65A30D'];
export function subjectColor(name = '') {
  if (SUBJECT_COLORS[name]) return SUBJECT_COLORS[name];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return FALLBACK[h % FALLBACK.length];
}

export const hrs = (min) => `${Math.round((min / 60) * 10) / 10}h`;
export const hoursOf = (min) => Math.round((min / 60) * 100) / 100;

export const activeTasks = (tasks) =>
  tasks.filter((t) => !['completed', 'deferred'].includes(t.status) && t.remainingHours > 0);

export function horizonEnd(active, demoDate) {
  let end = addDays(demoDate, 6);
  active.forEach((t) => {
    if (t.deadline > end) end = t.deadline;
  });
  const cap = addDays(demoDate, 27);
  return end > cap ? cap : end;
}

/**
 * Capacity of one calendar day.
 * - window = availability hours starting at `start`
 * - buffer% is held back at the END of the window and never scheduled
 * - sessions that are not 'planned' (completed / partial / missed) have already used their time
 */
export function dayCapacity(availability, date, prefs, sessions = []) {
  const base = availability.days[weekdayIndex(date)] || { hours: 0, start: '18:00' };
  const override = availability.overrides?.[date];
  const hours = override !== undefined ? override : base.hours;
  const windowMin = Math.round(hours * 60);
  const startMin = toMin(base.start);
  const usableTotal = Math.min(
    Math.floor(windowMin * (1 - prefs.bufferPct / 100)),
    Math.round(prefs.maxDailyHours * 60),
  );
  const kept = sessions.filter((s) => s.date === date && s.status !== 'planned');
  const lastEnd = kept.reduce((m, s) => Math.max(m, toMin(s.end)), startMin);
  const cursorMin = Math.max(startMin, lastEnd);
  return {
    date,
    windowMin,
    startMin,
    cursorMin,
    rawMin: Math.max(0, startMin + windowMin - cursorMin),
    usableMin: Math.max(0, startMin + usableTotal - cursorMin),
  };
}

export function buildCapacity({ tasks, sessions = [], availability, prefs, demoDate }) {
  const active = activeTasks(tasks);
  const end = horizonEnd(active, demoDate);
  const days = dateRange(demoDate, end).map((d) => dayCapacity(availability, d, prefs, sessions));
  return { active, end, days };
}

export function feasibilityStatus({ aloneSlack, cumSlack, remMin }) {
  if (aloneSlack < 0) return 'Infeasible';
  if (cumSlack < 0) return 'Overloaded';
  if (cumSlack < remMin * 0.5) return 'At Risk';
  return 'Achievable';
}

export const STATUS_TONE = { Achievable: 'green', 'At Risk': 'amber', Overloaded: 'red', Infeasible: 'red' };

export function computeWorkload(state) {
  const { active, end, days } = buildCapacity(state);
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  const requiredMin = sum(active, (t) => Math.round(t.remainingHours * 60));
  const rawMin = sum(days, (d) => d.rawMin);
  const usableMin = sum(days, (d) => d.usableMin);
  const gapMin = Math.max(0, requiredMin - usableMin);
  const ratio = usableMin > 0 ? requiredMin / usableMin : requiredMin > 0 ? Infinity : 0;

  let cum = 0;
  const perTask = [...active]
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || b.importance - a.importance)
    .map((t) => {
      const remMin = Math.round(t.remainingHours * 60);
      cum += remMin;
      const availMin = sum(days.filter((d) => d.date <= t.deadline), (d) => d.usableMin);
      const aloneSlack = availMin - remMin;
      const cumSlack = availMin - cum;
      return {
        task: t,
        remMin,
        availMin,
        aloneSlack,
        cumSlack,
        status: feasibilityStatus({ aloneSlack, cumSlack, remMin }),
        priority: priorityKey(cumSlack, t.importance),
      };
    });

  let overall = 'Achievable';
  if (ratio > 1.25) overall = 'Critical';
  else if (ratio > 1) overall = 'Overloaded';
  else if (ratio > 0.85) overall = 'At Risk';

  return {
    requiredMin,
    rawMin,
    usableMin,
    gapMin,
    ratio,
    utilization: Math.round(Math.min(ratio, 9.99) * 100),
    overall,
    perTask,
    days,
    end,
  };
}

/** Per-day numbers for the dashboard charts, for the 7 days of the week containing `anchor`. */
export function weekChartData(state, anchor) {
  const start = startOfWeek(anchor);
  return dateRange(start, addDays(start, 6)).map((date) => {
    const cap = dayCapacity(state.availability, date, state.prefs, []);
    const day = state.sessions.filter((s) => s.date === date);
    const scheduled = day.reduce((a, s) => a + (s.status === 'missed' ? 0 : s.minutes), 0);
    const done = day.reduce(
      (a, s) => a + (s.status === 'completed' ? s.minutes : s.status === 'partial' ? s.creditedMin : 0),
      0,
    );
    const planned = day.reduce((a, s) => a + s.minutes, 0);
    return {
      date,
      label: SHORT_DAYS[weekdayIndex(date)],
      planned: hoursOf(planned),
      completed: hoursOf(done),
      scheduled: hoursOf(scheduled),
      free: hoursOf(Math.max(0, cap.usableMin - scheduled)),
      usable: hoursOf(cap.usableMin),
    };
  });
}
