/** Normalizes a "YYYY-MM-DD" string (or now) to local midnight — must match on both the write path (task-completions actions) and the read path (daily/report pages), since SQLite stores the local-midnight instant, not the date string. */
export function dayKey(dateStr?: string): Date {
  const d = dateStr ? new Date(dateStr) : new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
