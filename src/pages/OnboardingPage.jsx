import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Button, Field, Input, Select, cx, useToast } from '../components/ui/index.jsx';
import { Logo } from '../components/layout/MainLayout.jsx';
import { generatePlan } from '../services/mockSchedulingService.js';
import { DAY_NAMES, hrs } from '../utils/workloadUtils.js';

const STEPS = ['About you', 'Subjects', 'Availability', 'Preferences', 'Review'];

export default function OnboardingPage() {
  const { state, completeOnboarding, patch } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(state.profile);
  const [subjects, setSubjects] = useState(state.subjects);
  const [days, setDays] = useState(state.availability.days);
  const [prefs, setPrefs] = useState(state.prefs);
  const [sub, setSub] = useState('');
  const [err, setErr] = useState('');

  const next = () => {
    setErr('');
    if (step === 0 && (!profile.name.trim() || !profile.course.trim() || !profile.college.trim())) return setErr('Fill in your name, course and college to continue.');
    if (step === 1 && subjects.length === 0) return setErr('Add at least one subject.');
    if (step === 2 && days.every((d) => Number(d.hours) === 0)) return setErr('Add study time on at least one day.');
    setStep((s) => s + 1);
  };
  const addSub = () => {
    const v = sub.trim();
    if (v && !subjects.some((s) => s.toLowerCase() === v.toLowerCase())) setSubjects([...subjects, v]);
    setSub('');
  };
  const finish = () => {
    const availability = { days: days.map((d) => ({ ...d, hours: Number(d.hours) })), overrides: {} };
    const { sessions } = generatePlan({ tasks: state.tasks, sessions: [], availability, prefs, demoDate: state.demoDate });
    completeOnboarding({ profile: { ...profile, semester: Number(profile.semester) }, subjects, availability, prefs, sessions });
    toast({ title: `Welcome, ${profile.name.split(' ')[0]}`, message: 'Your first plan has been generated.' });
    navigate('/app');
  };
  const skip = () => { patch({ onboarded: true }); navigate('/app'); };
  const total = days.reduce((a, d) => a + Number(d.hours), 0);

  return (
    <div className="min-h-full bg-slate-50">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8"><Logo /><Button variant="ghost" onClick={skip}>Skip demo setup</Button></header>
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-4">
        <ol className="mb-8 flex items-center gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? 'step' : undefined}>
              <span className={cx('h-1.5 rounded-full', i <= step ? 'bg-blue-600' : 'bg-slate-200')} />
              <span className={cx('hidden text-xs sm:block', i === step ? 'font-medium text-blue-700' : 'text-slate-500')}>{s}</span>
            </li>
          ))}
        </ol>
        <p className="mb-1 text-xs text-slate-500 sm:hidden">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h1 className="text-xl font-semibold text-slate-900 sm:col-span-2">Tell us about you</h1>
              <Field label="Full name" className="sm:col-span-2"><Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} autoFocus /></Field>
              <Field label="Course" className="sm:col-span-2"><Input value={profile.course} onChange={(e) => setProfile({ ...profile, course: e.target.value })} /></Field>
              <Field label="College"><Input value={profile.college} onChange={(e) => setProfile({ ...profile, college: e.target.value })} /></Field>
              <Field label="Current semester"><Select value={profile.semester} onChange={(e) => setProfile({ ...profile, semester: e.target.value })}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
            </div>
          )}
          {step === 1 && (
            <div>
              <h1 className="mb-1 text-xl font-semibold text-slate-900">Your subjects</h1>
              <p className="mb-4 text-sm text-slate-500">Tasks are grouped and colour-coded by subject.</p>
              <ul className="mb-4 flex flex-wrap gap-2">{subjects.map((s) => (
                <li key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm">{s}<button aria-label={`Remove ${s}`} onClick={() => setSubjects(subjects.filter((x) => x !== s))} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200"><X className="h-3.5 w-3.5" /></button></li>))}</ul>
              <div className="flex gap-2"><Input value={sub} onChange={(e) => setSub(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSub()} placeholder="Add a subject" aria-label="New subject" /><Button variant="secondary" icon={Plus} onClick={addSub}>Add</Button></div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h1 className="mb-1 text-xl font-semibold text-slate-900">When can you study?</h1>
              <p className="mb-4 text-sm text-slate-500">Set hours that are genuinely free after classes and commitments. Total: {hrs(total * 60)} a week.</p>
              <div className="space-y-3">{days.map((d, i) => (
                <div key={i} className="grid items-end gap-2 sm:grid-cols-[6rem_6rem_7rem_1fr]">
                  <p className="text-sm font-medium sm:pb-2">{DAY_NAMES[i]}</p>
                  <Field label="Hours"><Input type="number" min="0" max="8" step="0.25" value={d.hours} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)))} /></Field>
                  <Field label="Starts at"><Input type="time" value={d.start} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} /></Field>
                  <Field label="Commitment"><Input value={d.note || ''} onChange={(e) => setDays(days.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="Optional" /></Field>
                </div>))}</div>
            </div>
          )}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <h1 className="text-xl font-semibold text-slate-900 sm:col-span-2">How do you like to study?</h1>
              <Field label="Session length"><Select value={prefs.sessionMinutes} onChange={(e) => setPrefs({ ...prefs, sessionMinutes: Number(e.target.value) })}>{[30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} minutes</option>)}</Select></Field>
              <Field label="Breaks"><Select value={prefs.breakStyle} onChange={(e) => setPrefs({ ...prefs, breakStyle: e.target.value })}><option value="short">Short breaks</option><option value="long">Long breaks</option></Select></Field>
              <Field label="Maximum study per day (hours)"><Input type="number" min="1" max="12" step="0.5" value={prefs.maxDailyHours} onChange={(e) => setPrefs({ ...prefs, maxDailyHours: Number(e.target.value) })} /></Field>
              <Field label="Preferred time"><Select value={prefs.preferredTime} onChange={(e) => setPrefs({ ...prefs, preferredTime: e.target.value })}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></Select></Field>
            </div>
          )}
          {step === 4 && (
            <div>
              <h1 className="mb-4 text-xl font-semibold text-slate-900">Review and finish</h1>
              <dl className="divide-y divide-slate-100 text-sm">
                {[['Name', profile.name], ['Course', `${profile.course}, semester ${profile.semester}`], ['College', profile.college], ['Subjects', subjects.join(', ')], ['Weekly study time', hrs(total * 60)], ['Sessions', `${prefs.sessionMinutes} min, up to ${prefs.maxDailyHours}h a day`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-900">{v}</dd></div>))}
              </dl>
            </div>
          )}
          {err && <p role="alert" className="mt-4 text-sm text-red-600">{err}</p>}
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => (step === 0 ? navigate('/') : setStep(step - 1))}>{step === 0 ? 'Back to home' : 'Back'}</Button>
            {step < 4 ? <Button onClick={next}>Continue <ArrowRight className="h-4 w-4" aria-hidden /></Button> : <Button icon={Check} onClick={finish}>Finish and open dashboard</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
