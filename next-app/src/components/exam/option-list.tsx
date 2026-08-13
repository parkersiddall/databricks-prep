"use client";

import { RichText } from "@/components/ui/rich-text";
import type { Question } from "@/content/schema";
import type { AnswerValue } from "@/lib/grading";

/**
 * Answer options for one question.
 *
 * Rendered as radio inputs so arrow keys and labels work natively. A new
 * question type gets a new branch here and a grader in lib/grading.ts.
 */
export function OptionList({
  question,
  answer,
  disabled = false,
  /** Study mode after answering: mark the key and the user's mistake. */
  revealCorrect = false,
  onAnswer,
}: {
  question: Question;
  answer: AnswerValue | undefined;
  disabled?: boolean;
  revealCorrect?: boolean;
  onAnswer: (value: AnswerValue) => void;
}) {
  const selectedId = answer?.type === "single" ? answer.optionId : undefined;

  return (
    <fieldset className="mt-5" disabled={disabled}>
      <legend className="sr-only">Answer options</legend>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => {
          const isSelected = selectedId === option.id;
          const isCorrect = option.id === question.correctOptionId;

          const state = !revealCorrect
            ? isSelected
              ? "selected"
              : "idle"
            : isCorrect
              ? "correct"
              : isSelected
                ? "incorrect"
                : "idle";

          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${stateClasses[state]} ${
                disabled ? "cursor-default" : ""
              }`}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={option.id}
                checked={isSelected}
                onChange={() => onAnswer({ type: "single", optionId: option.id })}
                className="mt-0.5 accent-primary"
              />
              <span className="min-w-0 flex-1">
                <RichText text={option.text} />
              </span>
              {revealCorrect && isCorrect && (
                <span className="shrink-0 text-xs font-medium text-success">
                  Correct
                </span>
              )}
              {revealCorrect && isSelected && !isCorrect && (
                <span className="shrink-0 text-xs font-medium text-danger">
                  Your answer
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const stateClasses = {
  idle: "border-border bg-surface-raised hover:border-primary/50",
  selected: "border-primary bg-surface",
  correct: "border-success/50 bg-success-surface",
  incorrect: "border-danger/50 bg-danger-surface",
} as const;
