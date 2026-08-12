"use client";

import { useState } from "react";

import { CodeBlock } from "@/components/exam/code-block";
import { OptionList } from "@/components/exam/option-list";
import { Badge } from "@/components/ui/badge";
import type { Question } from "@/content/schema";
import type { QuestionOutcome } from "@/lib/grading";

/**
 * Every question with the user's answer marked against the key.
 *
 * Reuses `OptionList` in its revealed, disabled state so a reviewed question
 * looks exactly like the one that was sat.
 */
export function AnswerReviewList({
  questions,
  outcomes,
}: {
  questions: readonly Question[];
  outcomes: QuestionOutcome[];
}) {
  const [onlyIncorrect, setOnlyIncorrect] = useState(false);

  const outcomeById = new Map(
    outcomes.map((outcome) => [outcome.questionId, outcome]),
  );
  const incorrectCount = outcomes.filter((outcome) => !outcome.correct).length;

  const visible = questions.filter((question) =>
    onlyIncorrect ? outcomeById.get(question.id)?.correct === false : true,
  );

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
          Answers
        </h2>

        {incorrectCount > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={onlyIncorrect}
              onChange={(event) => setOnlyIncorrect(event.target.checked)}
              className="accent-primary"
            />
            Only incorrect ({incorrectCount})
          </label>
        )}
      </div>

      <ol className="flex flex-col gap-4">
        {visible.map((question) => {
          const outcome = outcomeById.get(question.id);
          const correct = outcome?.correct ?? false;
          const answered = outcome?.answered ?? false;
          // Number by position in the exam, not in the filtered view.
          const number = questions.indexOf(question) + 1;

          return (
            <li
              key={question.id}
              className="rounded-lg border border-border bg-surface-raised p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Question {number}
                </span>
                <Badge tone={correct ? "success" : "danger"}>
                  {correct ? "Correct" : answered ? "Incorrect" : "Not answered"}
                </Badge>
                {question.domain !== undefined && <Badge>{question.domain}</Badge>}
              </div>

              <p className="mt-3 text-balance">{question.prompt}</p>

              {question.code !== undefined && <CodeBlock code={question.code} />}

              <OptionList
                question={question}
                answer={outcome?.answer}
                disabled
                revealCorrect
                onAnswer={() => {}}
              />

              {question.explanation !== undefined && (
                <p className="mt-4 rounded-md border border-border bg-surface p-3 text-sm text-muted">
                  {question.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {visible.length === 0 && (
        <p className="rounded-lg border border-border bg-surface-raised p-5 text-sm text-muted">
          Nothing to show with this filter.
        </p>
      )}
    </section>
  );
}
