"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { pluralize } from "@/lib/format";

export function SubmitDialog({
  open,
  unansweredCount,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  unansweredCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const hasBlanks = unansweredCount > 0;

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Submit this exam?"
      description={
        hasBlanks
          ? `${pluralize(unansweredCount, "question")} still unanswered. Unanswered questions are graded as incorrect.`
          : "Every question has an answer. You will see your score and a full review."
      }
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Keep working
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Submit
          </Button>
        </>
      }
    />
  );
}
