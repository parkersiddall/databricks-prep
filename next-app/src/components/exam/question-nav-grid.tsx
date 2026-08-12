"use client";

/**
 * Jump-to-question grid. Each cell encodes its state visually *and* in its
 * accessible label, so the information is not carried by colour alone.
 */
export function QuestionNavGrid({
  questionIds,
  currentIndex,
  isAnswered,
  isFlagged,
  onSelect,
}: {
  questionIds: readonly string[];
  currentIndex: number;
  isAnswered: (questionId: string) => boolean;
  isFlagged: (questionId: string) => boolean;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Questions">
      <ul className="grid grid-cols-8 gap-1.5 sm:grid-cols-6">
        {questionIds.map((questionId, index) => {
          const current = index === currentIndex;
          const answered = isAnswered(questionId);
          const flagged = isFlagged(questionId);

          const labels = [
            answered ? "answered" : "not answered",
            flagged ? "flagged" : null,
            current ? "current" : null,
          ].filter((part): part is string => part !== null);

          return (
            <li key={questionId}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                aria-current={current ? "true" : undefined}
                aria-label={`Question ${index + 1}, ${labels.join(", ")}`}
                className={`relative flex h-9 w-full items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                  current
                    ? "border-primary bg-primary text-primary-foreground"
                    : answered
                      ? "border-border bg-surface text-foreground hover:border-primary"
                      : "border-border bg-surface-raised text-muted hover:border-primary"
                }`}
              >
                {index + 1}
                {flagged && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-warning"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm border border-border bg-surface"
          />
          <dt>Answered</dt>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full bg-warning"
          />
          <dt>Flagged</dt>
        </div>
      </dl>
    </nav>
  );
}
