/** Small display helpers. Pure functions, no React. */

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

/** Joins non-empty parts with a middle dot, for card metadata lines. */
export function joinMeta(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}
