// Dates are plain 'YYYY-MM-DD' strings; times are 'HH:MM'. No timezone maths needed.
const pad = (n) => String(n).padStart(2, '0');

export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s, n) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
/** Monday = 0 ... Sunday = 6 */
export const weekdayIndex = (s) => (parseISO(s).getDay() + 6) % 7;
export const startOfWeek = (s) => addDays(s, -weekdayIndex(s));
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);
export const dateRange = (a, b) => {
  const out = [];
  const n = diffDays(a, b);
  for (let i = 0; i <= n; i++) out.push(addDays(a, i));
  return out;
};

export const toMin = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
export const fromMin = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

export const fmtDate = (s, opts = { day: 'numeric', month: 'short' }) =>
  parseISO(s).toLocaleDateString('en-GB', opts);
export const fmtDateLong = (s) =>
  parseISO(s).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtWeekday = (s) => parseISO(s).toLocaleDateString('en-GB', { weekday: 'short' });
export const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? 'pm' : 'am'}`;
};
export const relativeDay = (date, today) => {
  const n = diffDays(today, date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  if (n < 0) return `${-n} days overdue`;
  return `In ${n} days`;
};
