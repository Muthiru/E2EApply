export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;

export const intOrNull = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;

export const strArray = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((item) => str(item))
        .filter((item): item is string => item !== null)
        .slice(0, 30)
    : [];

export function aiErrorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}