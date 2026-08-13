import type { CodeSnippet } from "@/content/schema";

/**
 * Monospace snippet shown above a question's options. Deliberately not
 * syntax-highlighted — that would mean shipping a highlighter to the browser for
 * a handful of short snippets.
 *
 * `overflow-x-auto` keeps a long line scrolling inside the block rather than
 * widening the page.
 */
export function CodeBlock({ code }: { code: CodeSnippet }) {
  return (
    <figure className="mt-4 overflow-hidden rounded-md border border-border bg-surface">
      <figcaption className="border-b border-border px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-wide text-muted">
        {code.language}
      </figcaption>
      <pre className="overflow-x-auto p-3 text-sm leading-relaxed">
        <code className="font-mono">{code.source}</code>
      </pre>
    </figure>
  );
}
