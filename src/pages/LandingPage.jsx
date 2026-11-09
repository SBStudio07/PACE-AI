import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, CalendarDays, FileUp, LifeBuoy, ListChecks, ShieldCheck } from 'lucide-react';
import { Badge, Button, cx } from '../components/ui/index.jsx';
import { Logo } from '../components/layout/MainLayout.jsx';
import { createInitialState } from '../data/demoData.js';
import { computeWorkload, hrs, STATUS_TONE } from '../utils/workloadUtils.js';

const section = 'mx-auto w-full max-w-6xl px-5 sm:px-8';

function HeroCard() {
  const w = useMemo(() => computeWorkload(createInitialState()), []);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-blue-900/5">
      <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold text-slate-900">This week’s workload</p><Badge tone="red">{w.overall}</Badge></div>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[['Required', hrs(w.requiredMin), 'text-slate-900'], ['Usable', hrs(w.usableMin), 'text-slate-900'], ['Gap', hrs(w.gapMin), 'text-red-600']].map(([k, v, c]) => (
          <div key={k} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{k}</p><p className={cx('text-xl font-semibold', c)}>{v}</p></div>))}
      </div>
      <ul className="mt-4 divide-y divide-slate-100 text-sm">
        {w.perTask.slice(0, 4).map((p) => (
          <li key={p.task.id} className="flex items-center justify-between gap-3 py-2"><span className="truncate text-slate-700">{p.task.title}</span><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></li>))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">Calculated live by the same engine the app uses, from the demo student’s data.</p>
    </div>
  );
}

function FeasibilityDemo() {
  const [need, setNeed] = useState(18);
  const [have, setHave] = useState(10);
  const usable = have * 0.85;
  const gap = Math.max(0, need - usable);
  const ratio = usable ? need / usable : 9;
  const verdict = ratio <= 0.85 ? ['Achievable', 'green', 'This fits with room to spare.'] : ratio <= 1 ? ['At risk', 'amber', 'It fits, but one missed session breaks it.'] : ['Overloaded', 'red', `About ${Math.round(gap * 10) / 10}h cannot fit. PACE shows what to defer, not a fake timetable.`];
  return (
    <div className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2 lg:p-8">
      <div className="space-y-6">
        <label className="block text-sm font-medium text-slate-700">Work remaining: {need}h<input type="range" min="2" max="40" value={need} onChange={(e) => setNeed(+e.target.value)} className="mt-2 w-full accent-blue-600" /></label>
        <label className="block text-sm font-medium text-slate-700">Study time before deadlines: {have}h<input type="range" min="2" max="40" value={have} onChange={(e) => setHave(+e.target.value)} className="mt-2 w-full accent-blue-600" /></label>
        <p className="text-xs text-slate-500">PACE holds back a 15% buffer, so {have}h of free time is {Math.round(usable * 10) / 10}h of usable time.</p>
      </div>
      <div>
        <div className="mb-2 flex items-center gap-2"><Badge tone={verdict[1]}>{verdict[0]}</Badge></div>
        <p className="mb-4 text-sm text-slate-700">{verdict[2]}</p>
        {[['Required', need, 'bg-slate-800'], ['Usable', usable, 'bg-blue-600']].map(([k, v, c]) => (
          <div key={k} className="mb-3"><div className="mb-1 flex justify-between text-xs text-slate-600"><span>{k}</span><span>{Math.round(v * 10) / 10}h</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={cx('h-full rounded-full transition-all', c)} style={{ width: `${Math.min(100, (v / Math.max(need, usable)) * 100)}%` }} /></div></div>))}
      </div>
    </div>
  );
}

const FEATURES = [
  [ListChecks, 'Task manager', 'Assignments, exams and projects with effort, difficulty, importance and subtasks.'],
  [FileUp, 'PDF import', 'Drop in an assignment sheet and review the suggested tasks before adding them (simulated in this prototype).'],
  [CalendarDays, 'Weekly planner', 'Sessions placed in your real free windows, most urgent first, never after a deadline.'],
  [BarChart3, 'Feasibility analysis', 'Required effort against usable capacity for every deadline, with the gap stated plainly.'],
  [LifeBuoy, 'Recovery assistant', 'Missed a session or got new work? See a revised plan and what changed.'],
  [ShieldCheck, 'You stay in control', 'Major schedule changes always wait for your approval.'],
];

export default function LandingPage() {
  return (
    <div className="min-h-full bg-white text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className={cx(section, 'flex h-16 items-center justify-between')}>
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex" aria-label="Sections">
            {[['how', 'How it works'], ['features', 'Features'], ['feasibility', 'Feasibility'], ['recovery', 'Recovery']].map(([id, l]) => <a key={id} href={`#${id}`} className="hover:text-slate-900">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2"><Link to="/app" className="hidden sm:block"><Button variant="ghost">Explore Demo</Button></Link><Link to="/onboarding"><Button>Get Started</Button></Link></div>
        </div>
      </header>

      <section className={cx(section, 'grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-24')}>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Your workload. Under control.</h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">PACE AI understands your academic workload, creates realistic study plans and helps you recover when life gets in the way.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/onboarding"><Button size="lg">Get Started</Button></Link><Link to="/app"><Button size="lg" variant="secondary">Explore Demo</Button></Link></div>
          <p className="mt-4 text-sm text-slate-500">Understand your workload. Plan realistically. Adapt continuously.</p>
        </div>
        <HeroCard />
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className={section}>
          <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Most study planners assume you have unlimited time.</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[['Timetables ignore capacity', 'A neat schedule for 18 hours of work means nothing when you only have 8.'], ['One missed session breaks everything', 'Static plans can’t absorb a bad day, so students abandon them.'], ['New work arrives constantly', 'A surprise quiz or assignment rarely comes with free time attached.']].map(([t, d]) => (
              <div key={t}><h3 className="font-semibold text-slate-900">{t}</h3><p className="mt-2 text-sm text-slate-600">{d}</p></div>))}
          </div>
        </div>
      </section>

      <section id="how" className={cx(section, 'py-16')}>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">How PACE works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-4">
          {[['Add your work', 'Enter tasks or import them from a PDF.'], ['Check feasibility', 'See whether the work fits before you plan.'], ['Get a realistic plan', 'Sessions are placed in your actual free time.'], ['Recover and adapt', 'Miss a session and approve a revised plan.']].map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-slate-200 p-5"><span className="mb-3 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-xs font-semibold text-white">{i + 1}</span><h3 className="font-semibold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></li>))}
        </ol>
      </section>

      <section id="features" className="bg-slate-50 py-16">
        <div className={section}>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Everything a student workload needs</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([Icon, t, d]) => (<div key={t} className="rounded-xl border border-slate-200 bg-white p-5"><Icon className="mb-3 h-5 w-5 text-blue-600" aria-hidden /><h3 className="font-semibold text-slate-900">{t}</h3><p className="mt-1 text-sm text-slate-600">{d}</p></div>))}
          </div>
        </div>
      </section>

      <section id="feasibility" className={cx(section, 'py-16')}>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Can it actually be done?</h2>
        <p className="mb-8 mt-2 max-w-2xl text-slate-600">Move the sliders. PACE tells you when the answer is no, and by how much.</p>
        <FeasibilityDemo />
      </section>

      <section id="recovery" className="bg-slate-50 py-16">
        <div className={cx(section, 'grid items-center gap-8 lg:grid-cols-2')}>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Recovery, not guilt</h2>
            <p className="mt-3 text-slate-600">When you miss a session, PACE keeps what you finished, recalculates your capacity and proposes a revised plan. You see what changed and what no longer fits, then you decide.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
            <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Before</p><p className="font-semibold">Physics, 45 min on Mon</p></div><div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-blue-700">After</p><p className="font-semibold">Moved to Tue, 45 min</p></div></div>
            <div className="mt-4 flex gap-2"><Badge tone="blue">Approve Revised Plan</Badge><Badge>Keep Existing Plan</Badge></div>
          </div>
        </div>
      </section>

      <section className={cx(section, 'py-16 text-center')}>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">See your workload clearly</h2>
        <div className="mt-6 flex justify-center gap-3"><Link to="/onboarding"><Button size="lg">Get Started <ArrowRight className="h-4 w-4" aria-hidden /></Button></Link><Link to="/app"><Button size="lg" variant="secondary">Explore Demo</Button></Link></div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className={cx(section, 'flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500')}>
          <Logo />
          <p>Prototype. AI features are simulated and no data leaves your browser.</p>
          <a href="#how" className="hover:text-slate-900">Back to top</a>
        </div>
      </footer>
    </div>
  );
}
