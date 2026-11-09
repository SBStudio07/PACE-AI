// SIMULATED AI. Nothing here calls Gemini or any network service.
// To integrate later, keep these function signatures and replace the bodies with real API calls.
import { addDays } from '../utils/dateUtils.js';
import { newId } from './mockTaskService.js';

export const AI_LABEL = 'Demo AI';
export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const EXTRACTION_STEPS = [
  'Uploading document',
  'Reading document',
  'Identifying tasks',
  'Extracting deadlines',
  'Preparing task suggestions',
];

const sub = (title) => ({ id: newId('st'), title, done: false });

export async function extractTasksFromPdf(file, { demoDate, subjects = [], onStep = () => {} }) {
  for (let i = 0; i < EXTRACTION_STEPS.length; i++) {
    onStep(i);
    await delay(650);
  }
  const name = (file?.name || 'Document.pdf').replace(/\.pdf$/i, '');
  if (/physics/i.test(name)) {
    return [
      {
        tempId: newId('x'),
        title: 'Physics Assignment 2',
        subject: subjects.includes('Physics') ? 'Physics' : subjects[0] || 'Physics',
        description: 'Numerical problems on kinematics and Newton’s laws, extracted from the uploaded document.',
        type: 'Assignment',
        deadline: '2026-11-11',
        estimatedHours: 3,
        remainingHours: 3,
        difficulty: 4,
        importance: 4,
        status: 'todo',
        subtasks: [sub('Read instructions'), sub('Complete numerical problems'), sub('Review answers')],
      },
    ];
  }
  const guess = subjects.find((s) => name.toLowerCase().includes(s.toLowerCase())) || subjects[0] || 'General';
  return [
    {
      tempId: newId('x'),
      title: name.replace(/[_-]+/g, ' ').trim() || 'Uploaded assignment',
      subject: guess,
      description: 'Suggested from the uploaded document. Check the details before adding.',
      type: 'Assignment',
      deadline: addDays(demoDate, 5),
      estimatedHours: 2,
      remainingHours: 2,
      difficulty: 3,
      importance: 3,
      status: 'todo',
      subtasks: [sub('Read the brief'), sub('Complete the work'), sub('Proofread and submit')],
    },
  ];
}
