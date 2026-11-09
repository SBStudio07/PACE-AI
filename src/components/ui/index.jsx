import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

const BTN = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  subtle: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
};
const SIZE = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-9 px-3.5 text-sm gap-2', lg: 'h-11 px-5 text-sm gap-2' };

export function Button({ variant = 'primary', size = 'md', icon: Icon, loading, className, children, disabled, ...p }) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        BTN[variant], SIZE[size], className,
      )}
      {...p}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon && <Icon className="h-4 w-4" aria-hidden />}
      {children}
    </button>
  );
}

const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
};
export const Badge = ({ tone = 'slate', className, children }) => (
  <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
    {children}
  </span>
);

const BAR = { blue: 'bg-blue-600', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-slate-400' };
export function ProgressBar({ value, max = 100, tone = 'blue', label }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full transition-all duration-500', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const Card = ({ className, children, ...p }) => (
  <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)} {...p}>{children}</section>
);
export const CardHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
    <div className="min-w-0">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const PageHeader = ({ title, subtitle, actions }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      {subtitle && <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="flex flex-col items-center px-6 py-12 text-center">
    {Icon && <div className="mb-3 rounded-full bg-blue-50 p-3 text-blue-600"><Icon className="h-5 w-5" aria-hidden /></div>}
    <p className="text-sm font-medium text-slate-900">{title}</p>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const DemoAiBadge = () => (
  <span title="Simulated in the browser. No AI service is connected." className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[11px] font-medium text-violet-700">
    Demo AI
  </span>
);

/* ---------- Form fields ---------- */
export const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-2 focus:outline-blue-600/20 disabled:bg-slate-50';
export function Field({ label, error, hint, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
export const Input = ({ className, ...p }) => <input className={cx(inputCls, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx(inputCls, className)} {...p} />;
export const Select = ({ className, children, ...p }) => <select className={cx(inputCls, className)} {...p}>{children}</select>;

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const W = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title}
        className={cx('relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl outline-none sm:rounded-2xl', W)}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, text, confirmLabel = 'Confirm', danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
      </>}>
      <p className="text-sm text-slate-600">{text}</p>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(null);
const TOAST_ICON = { success: CheckCircle2, warning: AlertTriangle, info: Info };
const TOAST_COLOR = { success: 'text-emerald-600', warning: 'text-amber-600', info: 'text-blue-600' };

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const remove = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { tone: 'success', ...t, id }]);
    setTimeout(() => remove(id), t.duration || 4500);
  }, [remove]);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((t) => {
          const Icon = TOAST_ICON[t.tone] || Info;
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', TOAST_COLOR[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                {t.message && <p className="mt-0.5 text-xs text-slate-500">{t.message}</p>}
                {t.action && (
                  <button onClick={() => { t.action.onClick(); remove(t.id); }} className="mt-1.5 text-xs font-medium text-blue-600 hover:underline">
                    {t.action.label}
                  </button>
                )}
              </div>
              <button onClick={() => remove(t.id)} aria-label="Dismiss notification" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);
