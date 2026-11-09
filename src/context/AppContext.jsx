import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createInitialState } from '../data/demoData.js';
import { generatePlan, summarizePlan } from '../services/mockSchedulingService.js';
import { applySessionStatus, normalizeTask, newId } from '../services/mockTaskService.js';
import { applyRecovery } from '../services/mockRecoveryService.js';
import { delay } from '../services/mockAIService.js';
import { computeWorkload } from '../utils/workloadUtils.js';

const KEY = 'pace-ai-state-v1';
const Ctx = createContext(null);

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...createInitialState(), ...JSON.parse(raw) };
  } catch (e) {
    /* corrupted or unavailable storage: fall back to seed */
  }
  return createInitialState();
}

export function AppProvider({ children }) {
  const [state, setState] = useState(load);
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage full or blocked: app still works in memory */
    }
  }, [state]);

  const patch = useCallback((p) => setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), []);

  const actions = useMemo(
    () => ({
      patch,
      addTask(draft) {
        const t = normalizeTask({ ...draft, id: newId('t') });
        patch((s) => ({ tasks: [...s.tasks, t] }));
        return t;
      },
      addTasks(drafts) {
        const list = drafts.map((d) => normalizeTask({ ...d, id: newId('t') }));
        patch((s) => ({ tasks: [...s.tasks, ...list] }));
        return list;
      },
      updateTask(task) {
        const t = normalizeTask(task);
        patch((s) => ({
          tasks: s.tasks.map((x) => (x.id === t.id ? t : x)),
          sessions: ['completed', 'deferred'].includes(t.status)
            ? s.sessions.filter((x) => !(x.taskId === t.id && x.status === 'planned'))
            : s.sessions,
        }));
      },
      deleteTask(id) {
        patch((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          sessions: s.sessions.filter((x) => !(x.taskId === id && x.status === 'planned')),
        }));
      },
      toggleSubtask(taskId, subId) {
        patch((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId ? { ...t, subtasks: t.subtasks.map((x) => (x.id === subId ? { ...x, done: !x.done } : x)) } : t,
          ),
        }));
      },
      setSessionStatus(sessionId, status) {
        patch((s) => {
          const ses = s.sessions.find((x) => x.id === sessionId);
          const task = ses && s.tasks.find((t) => t.id === ses.taskId);
          if (!ses || !task) return {};
          const r = applySessionStatus(task, ses, status);
          return {
            tasks: s.tasks.map((t) => (t.id === task.id ? r.task : t)),
            sessions: s.sessions.map((x) => (x.id === sessionId ? r.session : x)),
          };
        });
      },
      updateSession(session) {
        patch((s) => ({ sessions: s.sessions.map((x) => (x.id === session.id ? session : x)) }));
      },
      /** Simulated "thinking" delay, then runs the same scheduler the recovery flow uses. */
      async regeneratePlan() {
        await delay(1200);
        const s = ref.current;
        const r = generatePlan(s);
        patch({ sessions: [...s.sessions.filter((x) => x.status !== 'planned'), ...r.sessions], lastPlanAt: Date.now() });
        return r.summary;
      },
      approveRecovery(proposal) {
        patch({ ...applyRecovery(proposal), lastPlanAt: Date.now() });
      },
      completeOnboarding(data) {
        patch({ ...data, onboarded: true });
      },
      resetDemo() {
        const fresh = createInitialState();
        setState(fresh);
      },
    }),
    [patch],
  );

  const derived = useMemo(() => {
    const workload = computeWorkload(state);
    const plan = summarizePlan(state);
    const todaySessions = state.sessions
      .filter((s) => s.date === state.demoDate)
      .sort((a, b) => a.start.localeCompare(b.start));
    const missed = state.sessions.filter((s) => s.status === 'missed');
    const taskById = Object.fromEntries(state.tasks.map((t) => [t.id, t]));
    const needsReplan =
      workload.usableMin > 0 &&
      state.tasks.some(
        (t) =>
          !['completed', 'deferred'].includes(t.status) &&
          t.remainingHours > 0 &&
          !state.sessions.some((x) => x.taskId === t.id && x.status === 'planned'),
      );
    return { workload, plan, todaySessions, missed, taskById, needsReplan };
  }, [state]);

  const value = useMemo(() => ({ state, ...derived, ...actions }), [state, derived, actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppProvider');
  return v;
};
