// Client-side scheduler. Replace generatePlan() with an API call later; keep the same input/output shape.
import { fromMin } from '../utils/dateUtils.js';
import { buildCapacity } from '../utils/workloadUtils.js';
import { priorityKey } from '../utils/priorityUtils.js';

const MIN_CHUNK = 15;

/**
 * Slack-based scheduler.
 *   slack = usable study minutes between now and the deadline - remaining effort
 * Lower slack (adjusted by importance) is scheduled first. Guarantees:
 *   - sessions never overlap (one cursor per day, sessions are placed back-to-back)
 *   - nothing is scheduled after its deadline
 *   - the planning buffer is never allocated
 *   - work that does not fit is returned in summary.unallocated, never dropped silently
 * Sessions that are already completed / partial / missed are kept by the caller and treated as used time.
 */
export function generatePlan({ tasks, sessions = [], availability, prefs, demoDate }) {
  const { active, days } = buildCapacity({ tasks, sessions, availability, prefs, demoDate });
  const remaining = new Map(active.map((t) => [t.id, Math.round(t.remainingHours * 60)]));
  const planned = [];

  const depsDone = (t) => !t.dependsOn || !remaining.has(t.dependsOn) || remaining.get(t.dependsOn) === 0;
  const usableAfter = (i, deadline) => {
    let s = 0;
    for (let j = i + 1; j < days.length && days[j].date <= deadline; j++) s += days[j].usableMin;
    return s;
  };

  days.forEach((day, i) => {
    let cursor = day.cursorMin;
    let left = day.usableMin;
    let last = null;

    while (left >= MIN_CHUNK) {
      const candidates = active.filter(
        (t) => remaining.get(t.id) > 0 && t.deadline >= day.date && depsDone(t),
      );
      if (!candidates.length) break;

      const chunkFor = (t) => {
        const rem = remaining.get(t.id);
        let c = Math.min(prefs.sessionMinutes, rem, left);
        if (rem - c > 0 && rem - c < MIN_CHUNK && rem <= left) c = rem; // absorb a tiny tail
        return c;
      };

      const scored = candidates
        .map((t) => {
          const slack = left + usableAfter(i, t.deadline) - remaining.get(t.id);
          return { t, slack, key: priorityKey(slack, t.importance) };
        })
        .sort((a, b) => a.key - b.key || a.t.deadline.localeCompare(b.t.deadline));

      let pick = scored[0];
      // Mix subjects when it costs the most urgent task nothing.
      if (last && pick.t.id === last && scored.length > 1) {
        const alt = scored.find((s) => s.t.id !== last);
        if (alt && alt.slack >= 0 && pick.slack - chunkFor(alt.t) >= 0) pick = alt;
      }

      const minutes = chunkFor(pick.t);
      planned.push({
        id: `ses_${day.date}_${cursor}`,
        taskId: pick.t.id,
        date: day.date,
        start: fromMin(cursor),
        end: fromMin(cursor + minutes),
        minutes,
        status: 'planned',
        creditedMin: 0,
      });
      cursor += minutes;
      left -= minutes;
      remaining.set(pick.t.id, remaining.get(pick.t.id) - minutes);
      last = pick.t.id;
    }
  });

  const unallocated = active
    .map((t) => ({ taskId: t.id, title: t.title, minutes: remaining.get(t.id), deadline: t.deadline }))
    .filter((u) => u.minutes > 0);
  const requiredMin = active.reduce((a, t) => a + Math.round(t.remainingHours * 60), 0);
  const gapMin = unallocated.reduce((a, u) => a + u.minutes, 0);

  return {
    sessions: planned,
    summary: {
      requiredMin,
      scheduledMin: requiredMin - gapMin,
      usableMin: days.reduce((a, d) => a + d.usableMin, 0),
      unallocated,
      gapMin,
      feasible: gapMin === 0,
    },
  };
}

/** Summary of whatever planned sessions currently exist (used for "before" views and the planner). */
export function summarizePlan({ tasks, sessions, demoDate }) {
  const active = tasks.filter((t) => !['completed', 'deferred'].includes(t.status) && t.remainingHours > 0);
  const plannedBy = {};
  sessions
    .filter((s) => s.status === 'planned' && s.date >= demoDate)
    .forEach((s) => (plannedBy[s.taskId] = (plannedBy[s.taskId] || 0) + s.minutes));
  const unallocated = active
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      deadline: t.deadline,
      minutes: Math.max(0, Math.round(t.remainingHours * 60) - (plannedBy[t.id] || 0)),
    }))
    .filter((u) => u.minutes > 0);
  const requiredMin = active.reduce((a, t) => a + Math.round(t.remainingHours * 60), 0);
  const gapMin = unallocated.reduce((a, u) => a + u.minutes, 0);
  return { requiredMin, scheduledMin: requiredMin - gapMin, plannedBy, unallocated, gapMin, feasible: gapMin === 0 };
}
