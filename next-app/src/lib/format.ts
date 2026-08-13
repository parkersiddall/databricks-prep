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

/**
 * Countdown display: `mm:ss`, widening to `h:mm:ss` past an hour. Negative
 * input clamps to zero so an overrun never renders as `-1:-1`.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/** Rounds a percentage for display. Grading keeps the exact value. */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export type RichSegment = { type: "text" | "code"; value: string };

/**
 * Splits `inline code` spans out of authored prose.
 *
 * Question prompts and explanations are written with Markdown-style backticks
 * around identifiers. This is the whole of the Markdown we support — enough to
 * render `_delta_log` as code without shipping a Markdown parser. An unmatched
 * backtick is left as literal text rather than swallowing the rest of the string.
 */
export function parseInlineCode(text: string): RichSegment[] {
  const segments: RichSegment[] = [];
  const pattern = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", value: match[1] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}

/** Joins non-empty parts with a middle dot, for card metadata lines. */
export function joinMeta(...parts: (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" · ");
}
