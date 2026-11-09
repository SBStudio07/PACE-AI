import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCcw, X } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Button, Card, CardHeader, ConfirmDialog, Field, Input, PageHeader, Select, useToast } from '../components/ui/index.jsx';
import { DAY_NAMES, hrs } from '../utils/workloadUtils.js';

export default function SettingsPage() {
  const { state, workload, patch, resetDemo } = useApp();
  const toast = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { profile, subjects, availability, prefs } = state;

  const setProfile = (k) => (e) => patch((s) => ({ profile: { ...s.profile, [k]: k === 'semester' ? Number(e.target.value) : e.target.value } }));
  const setPref = (k, num = true) => (e) => patch((s) => ({ prefs: { ...s.prefs, [k]: num ? Number(e.target.value) : e.target.value } }));
  const setDay = (i, k) => (e) =>
    patch((s) => ({ availability: { ...s.availability, days: s.availability.days.map((d, j) => (j === i ? { ...d, [k]: k === 'hours' ? Math.max(0, Number(e.target.value)) : e.target.value } : d)) } }));

  const addSubject = () => {
    const v = subject.trim();
    if (!v) return;
    if (subjects.some((s) => s.toLowerCase() === v.toLowerCase())) return toast({ title: 'Subject already exists', tone: 'warning' });
    patch((s) => ({ subjects: [...s.subjects, v] }));
    setSubject('');
  };
  const removeSubject = (name) => {
    if (state.tasks.some((t) => t.subject === name)) return toast({ title: `Can’t remove ${name}`, message: 'Tasks still use this subject. Delete or edit them first.', tone: 'warning' });
    patch((s) => ({ subjects: s.subjects.filter((x) => x !== name) }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Changes save automatically. Availability and buffer changes flow into your workload analysis immediately; regenerate the plan to reschedule." />

      <Card>
        <CardHeader title="Student profile" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Full name"><Input value={profile.name} onChange={setProfile('name')} /></Field>
          <Field label="Course"><Input value={profile.course} onChange={setProfile('course')} /></Field>
          <Field label="College"><Input value={profile.college} onChange={setProfile('college')} /></Field>
          <Field label="Semester"><Select value={profile.semester} onChange={setProfile('semester')}>{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Academic information" subtitle="Subjects available when creating tasks" />
        <div className="p-5">
          <ul className="mb-4 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <li key={s} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-sm text-slate-700">{s}
                <button onClick={() => removeSubject(s)} aria-label={`Remove ${s}`} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button></li>
            ))}
          </ul>
          <div className="flex max-w-sm gap-2">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} placeholder="Add a subject" aria-label="New subject" />
            <Button variant="secondary" icon={Plus} onClick={addSubject}>Add</Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Study availability" subtitle={`${hrs(workload.rawMin)} raw and ${hrs(workload.usableMin)} usable over the planning horizon`} />
        <div className="divide-y divide-slate-100">
          {availability.days.map((d, i) => (
            <div key={i} className="grid items-end gap-3 px-5 py-3 sm:grid-cols-[8rem_7rem_8rem_1fr]">
              <p className="text-sm font-medium text-slate-900 sm:pb-2">{DAY_NAMES[i]}</p>
              <Field label="Hours"><Input type="number" min="0" max="8" step="0.25" value={d.hours} onChange={setDay(i, 'hours')} /></Field>
              <Field label="Starts at"><Input type="time" value={d.start} onChange={setDay(i, 'start')} /></Field>
              <Field label="Commitments"><Input value={d.note || ''} onChange={setDay(i, 'note')} placeholder="Classes, sports, family" /></Field>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Study preferences" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Session length"><Select value={prefs.sessionMinutes} onChange={setPref('sessionMinutes')}>{[30, 45, 60, 90].map((n) => <option key={n} value={n}>{n} minutes</option>)}</Select></Field>
            <Field label="Breaks"><Select value={prefs.breakStyle} onChange={setPref('breakStyle', false)}><option value="short">Short breaks</option><option value="long">Long breaks</option></Select></Field>
            <Field label="Maximum study per day (hours)"><Input type="number" min="1" max="12" step="0.5" value={prefs.maxDailyHours} onChange={setPref('maxDailyHours')} /></Field>
            <Field label="Preferred time"><Select value={prefs.preferredTime} onChange={setPref('preferredTime', false)}><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></Select></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Planning and buffer" subtitle="Buffer time is held back so one slow session doesn’t break the plan" />
          <div className="space-y-4 p-5">
            <label className="block text-xs font-medium text-slate-700">Planning buffer: {prefs.bufferPct}%
              <input type="range" min="0" max="30" step="5" value={prefs.bufferPct} onChange={setPref('bufferPct')} className="mt-1 w-full accent-blue-600" /></label>
            <Field label="Demo date" hint="The app treats this as today. All dates and deadlines are relative to it."><Input type="date" value={state.demoDate} onChange={(e) => e.target.value && patch({ demoDate: e.target.value })} /></Field>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Account preferences" />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="max-w-md text-sm text-slate-600">Sign-in is not connected in this prototype. Your data lives only in this browser.</p>
          <Button variant="secondary" onClick={() => navigate('/onboarding')}>Replay onboarding</Button>
        </div>
      </Card>

      <Card className="border-red-200">
        <CardHeader title="Reset demo data" subtitle="Restores the original student profile, tasks, availability and plan" />
        <div className="p-5"><Button variant="danger" icon={RotateCcw} onClick={() => setConfirm(true)}>Reset demo data</Button></div>
      </Card>

      <ConfirmDialog open={confirm} danger title="Reset all demo data?" confirmLabel="Reset data" onClose={() => setConfirm(false)}
        text="Everything you added or changed will be replaced with the original demo data. This can’t be undone."
        onConfirm={() => { resetDemo(); toast({ title: 'Demo data reset', tone: 'info' }); }} />
    </div>
  );
}
