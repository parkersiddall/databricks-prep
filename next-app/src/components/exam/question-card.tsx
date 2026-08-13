"use client";

import { CodeBlock } from "@/components/exam/code-block";
import { OptionList } from "@/components/exam/option-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import type { Question } from "@/content/schema";
import { isAnswerCorrect, type AnswerValue } from "@/lib/grading";

export function QuestionCard({
  question,
  index,
  total,
  answer,
  flagged,
  studyMode,
  disabled,
  onAnswer,
  onToggleFlag,
}: {
  question: Question;
  index: number;
  total: number;
  answer: AnswerValue | undefined;
  flagged: boolean;
  studyMode: boolean;
  disabled: boolean;
  onAnswer: (value: AnswerValue) => void;
  onToggleFlag: () => void;
}) {
  // Study mode reveals as soon as an answer lands; exam mode reveals nothing
  // until the whole attempt is submitted.
  const revealed = (studyMode && answer !== undefined) || disabled;
  const correct = isAnswerCorrect(question, answer);

  return (
    <article className="rounded-lg border border-border bg-surface-raised p-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Question {index + 1} of {total}
          </span>
          {question.domain !== undefined && <Badge>{question.domain}</Badge>}
        </div>

        <Button
          size="sm"
          variant={flagged ? "primary" : "ghost"}
          onClick={onToggleFlag}
          aria-pressed={flagged}
        >
          {flagged ? "Flagged" : "Flag"}
        </Button>
      </header>

      <p className="mt-3 text-balance">
        <RichText text={question.prompt} />
      </p>

      {question.code !== undefined && <CodeBlock code={question.code} />}

      <OptionList
        question={question}
        answer={answer}
        disabled={revealed}
        revealCorrect={revealed}
        onAnswer={onAnswer}
      />

      {revealed && (
        <div
          className={`mt-4 rounded-md border p-3 text-sm ${
            correct
              ? "border-success/40 bg-success-surface"
              : "border-danger/40 bg-danger-surface"
          }`}
        >
          <p className="font-medium">
            {correct
              ? "Correct"
              : answer === undefined
                ? "Not answered"
                : "Incorrect"}
          </p>
          {question.explanation !== undefined && (
            <p className="mt-1 text-muted">
              <RichText text={question.explanation} />
            </p>
          )}
        </div>
      )}
    </article>
  );
}
