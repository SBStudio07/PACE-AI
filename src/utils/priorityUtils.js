/**
 * Lower key = higher priority.
 * Deadline slack (hours) is the main signal; importance (1-5) shifts it by up to 2 hours either way.
 */
export const priorityKey = (slackMin, importance = 3) => slackMin / 60 - (importance - 3);

export function priorityLabel(key) {
  if (key < 0) return { label: 'Critical', tone: 'red' };
  if (key < 3) return { label: 'High', tone: 'amber' };
  if (key < 8) return { label: 'Medium', tone: 'blue' };
  return { label: 'Low', tone: 'slate' };
}
