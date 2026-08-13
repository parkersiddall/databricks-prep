import { parseInlineCode } from "@/lib/format";

/**
 * Renders authored prose, turning `backticked` spans into inline code.
 *
 * Used for question prompts and explanations, which are written with Markdown
 * backticks around identifiers.
 */
export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const segments = parseInlineCode(text);

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <code
            key={index}
            className="rounded bg-surface px-1 py-0.5 font-mono text-[0.9em]"
          >
            {segment.value}
          </code>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  );
}
