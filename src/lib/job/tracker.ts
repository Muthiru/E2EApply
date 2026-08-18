export const GHOST_AFTER_DAYS = 14;

export function isLikelyGhosted(
  status: string,
  lastEventAt: Date | null,
  now: Date,
): boolean {
  if (!["PENDING", "APPLIED", "ASSESSMENT"].includes(status)) return false;
  if (!lastEventAt) return false;
  const days = (now.getTime() - lastEventAt.getTime()) / 86_400_000;
  return days >= GHOST_AFTER_DAYS;
}

export function daysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / 86_400_000);
}