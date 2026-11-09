import { generatePlan } from '../services/mockSchedulingService.js';

export const DEMO_DATE = '2026-11-09'; // Monday. Change it in Settings to move the "current day".

const st = (id, title, done = false) => ({ id, title, done });

export const demoTasks = () => [
  {
    id: 't_math2', title: 'Mathematics Assignment 2', subject: 'Mathematics', type: 'Assignment',
    description: 'Integration and differential equations problem set.',
    deadline: '2026-11-12', estimatedHours: 3, remainingHours: 3, difficulty: 4, importance: 5, status: 'todo',
    subtasks: [st('s1', 'Revise integration rules'), st('s2', 'Solve problems 1–10'), st('s3', 'Verify answers')],
  },
  {
    id: 't_phys', title: 'Physics Internal Preparation', subject: 'Physics', type: 'Examination',
    description: 'Internal exam covering mechanics and waves.',
    deadline: '2026-11-13', estimatedHours: 5, remainingHours: 4, difficulty: 5, importance: 5, status: 'in_progress',
    subtasks: [st('s4', 'Mechanics formulae sheet', true), st('s5', 'Past paper 2023'), st('s6', 'Waves numericals')],
  },
  {
    id: 't_chem', title: 'Chemistry Revision', subject: 'Chemistry', type: 'Revision',
    description: 'Atomic structure and periodic trends.',
    deadline: '2026-11-14', estimatedHours: 3, remainingHours: 2, difficulty: 3, importance: 3, status: 'in_progress',
    subtasks: [],
  },
  {
    id: 't_prog', title: 'Programming Project', subject: 'Programming', type: 'Project',
    description: 'Console-based library management system in C.',
    deadline: '2026-11-15', estimatedHours: 6, remainingHours: 5, difficulty: 4, importance: 4, status: 'in_progress',
    subtasks: [st('s7', 'Design data structures', true), st('s8', 'Implement issue/return'), st('s9', 'Write test cases')],
  },
  {
    id: 't_eng', title: 'English Presentation', subject: 'English', type: 'Presentation',
    description: 'Five-minute talk on a chosen essay.',
    deadline: '2026-11-11', estimatedHours: 2, remainingHours: 1, difficulty: 2, importance: 3, status: 'in_progress',
    subtasks: [st('s10', 'Finish slides', true), st('s11', 'Rehearse delivery')],
  },
  {
    id: 't_ds', title: 'Data Structures Practice', subject: 'Programming', type: 'Other',
    description: 'Linked list and stack practice problems.',
    deadline: '2026-11-15', estimatedHours: 3, remainingHours: 3, difficulty: 3, importance: 3, status: 'todo',
    subtasks: [],
  },
];

export const demoAvailability = () => ({
  days: [
    { hours: 1.5, start: '18:00', note: 'Classes 9:00–16:30' },
    { hours: 1.5, start: '18:00', note: 'Classes 9:00–16:30' },
    { hours: 1.5, start: '18:00', note: 'Lab until 17:30' },
    { hours: 1.5, start: '18:00', note: 'Classes 9:00–16:30' },
    { hours: 1, start: '18:30', note: 'Sports club 17:00–18:00' },
    { hours: 2, start: '10:00', note: 'Family time after 13:00' },
    { hours: 1, start: '16:00', note: 'Mostly free' },
  ],
  overrides: {},
});

export const demoPrefs = () => ({
  sessionMinutes: 45,
  bufferPct: 15,
  maxDailyHours: 4,
  breakStyle: 'short',
  preferredTime: 'evening',
});

export const demoProfile = () => ({
  name: 'Suman Bhattacharya',
  course: 'B.Tech Computer Science and Engineering',
  college: 'Heritage Institute of Technology',
  semester: 1,
});

export function createInitialState() {
  const tasks = demoTasks();
  const availability = demoAvailability();
  const prefs = demoPrefs();
  const { sessions } = generatePlan({ tasks, sessions: [], availability, prefs, demoDate: DEMO_DATE });
  return {
    onboarded: false,
    profile: demoProfile(),
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Programming', 'English'],
    tasks,
    sessions,
    availability,
    prefs,
    demoDate: DEMO_DATE,
    lastPlanAt: null,
  };
}
