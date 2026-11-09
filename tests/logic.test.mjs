// Run with: node tests/logic.test.mjs   (no dependencies needed)
import assert from 'node:assert/strict';
import { createInitialState, DEMO_DATE } from '../src/data/demoData.js';
import { generatePlan } from '../src/services/mockSchedulingService.js';
import { proposeRecovery, applyRecovery } from '../src/services/mockRecoveryService.js';
import { computeWorkload } from '../src/utils/workloadUtils.js';
import { applySessionStatus } from '../src/services/mockTaskService.js';
import { toMin } from '../src/utils/dateUtils.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok  -', name); };
const base = () => createInitialState();

const noOverlap = (sessions) => {
  const by = {};
  sessions.forEach((s) => (by[s.date] ||= []).push(s));
  Object.values(by).forEach((list) => {
    list.sort((a, b) => toMin(a.start) - toMin(b.start));
    for (let i = 1; i < list.length; i++) assert.ok(toMin(list[i].start) >= toMin(list[i - 1].end), 'overlap on ' + list[i].date);
  });
};

test('demo workload matches the spec numbers (18h required, 10h raw, 8.5h usable, 9.5h gap)', () => {
  const w = computeWorkload(base());
  assert.equal(w.requiredMin, 18 * 60);
  assert.equal(w.rawMin, 10 * 60);
  assert.equal(Math.round(w.usableMin / 6) / 10, 8.5);
  assert.equal(Math.round(w.gapMin / 6) / 10, 9.5);
});

test('plan has no overlapping sessions and none after a deadline', () => {
  const s = base();
  noOverlap(s.sessions);
  const dl = Object.fromEntries(s.tasks.map((t) => [t.id, t.deadline]));
  s.sessions.forEach((x) => assert.ok(x.date <= dl[x.taskId], 'after deadline'));
});

test('buffer is never allocated and daily max is respected', () => {
  const s = base();
  const perDay = {};
  s.sessions.forEach((x) => (perDay[x.date] = (perDay[x.date] || 0) + x.minutes));
  Object.entries(perDay).forEach(([d, m]) => assert.ok(m <= s.prefs.maxDailyHours * 60 && m <= 120));
  assert.ok(perDay['2026-11-09'] <= Math.floor(90 * 0.85));
});

test('overloaded plan reports an explicit gap instead of dropping tasks', () => {
  const s = base();
  const r = generatePlan(s);
  assert.ok(!r.summary.feasible);
  assert.ok(r.summary.gapMin > 0 && r.summary.unallocated.length > 0);
  assert.equal(r.summary.scheduledMin + r.summary.gapMin, r.summary.requiredMin);
});

test('light workload is feasible', () => {
  const s = base();
  s.tasks = s.tasks.slice(0, 1);
  const r = generatePlan(s);
  assert.ok(r.summary.feasible && r.summary.gapMin === 0);
});

test('marking a session completed reduces remaining hours and is undoable', () => {
  const s = base();
  const ses = s.sessions[0];
  const task = s.tasks.find((t) => t.id === ses.taskId);
  const done = applySessionStatus(task, ses, 'completed');
  assert.ok(done.task.remainingHours < task.remainingHours);
  const undone = applySessionStatus(done.task, done.session, 'planned');
  assert.equal(undone.task.remainingHours, task.remainingHours);
});

test('recovery keeps completed sessions and respects approval boundary', () => {
  const s = base();
  const first = s.sessions[0];
  const t = s.tasks.find((x) => x.id === first.taskId);
  const done = applySessionStatus(t, first, 'completed');
  s.tasks = s.tasks.map((x) => (x.id === t.id ? done.task : x));
  s.sessions = s.sessions.map((x) => (x.id === first.id ? done.session : x));
  const missed = s.sessions.find((x) => x.status === 'planned');
  const snapshot = JSON.stringify(s);
  const p = proposeRecovery('missed', { sessionIds: [missed.id] }, s);
  assert.equal(JSON.stringify(s), snapshot, 'proposal must not mutate state');
  const next = applyRecovery(p);
  assert.ok(next.sessions.find((x) => x.id === first.id && x.status === 'completed'));
  assert.ok(next.sessions.find((x) => x.id === missed.id && x.status === 'missed'));
  noOverlap(next.sessions.filter((x) => x.status === 'planned'));
});

test('new assignment recovery adds the task and may increase the gap', () => {
  const s = base();
  const p = proposeRecovery('newTask', { task: { title: 'Surprise quiz', subject: 'Physics', type: 'Assignment', deadline: '2026-11-11', estimatedHours: 2, remainingHours: 2, difficulty: 3, importance: 4, status: 'todo' } }, s);
  assert.equal(p.tasks.length, s.tasks.length + 1);
  assert.ok(p.after.gapMin >= p.before.gapMin);
});

test('less time this week reduces usable capacity', () => {
  const s = base();
  const p = proposeRecovery('lessTime', { hoursLost: 3 }, s);
  assert.ok(p.after.usableMin < p.before.usableMin);
});

console.log(`\n${passed} tests passed`);
