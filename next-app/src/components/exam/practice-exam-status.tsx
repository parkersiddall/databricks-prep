"use client";

import { Badge } from "@/components/ui/badge";
import { useHydrated } from "@/hooks/use-hydrated";
import { formatPercent } from "@/lib/format";
import { entriesForTest } from "@/lib/missed-pool";
import {
  answeredCount as countAnswered,
  practiceExamSourceKey,
  reviewSourceKey,
} from "@/lib/session";
import { useMissedStore } from "@/stores/missed";
import { selectSession, useSessionsStore } from "@/stores/sessions";

/**
 * Saved-progress badge for one practice exam, shown on the test page.
 *
 * Renders nothing until hydrated — the server cannot know what is in this
 * browser's storage, so anything else would mismatch.
 */
export function PracticeExamStatus({
  practiceExamId,
}: {
  practiceExamId: string;
}) {
  const hydrated = useHydrated(useSessionsStore);
  const session = useSessionsStore(
    selectSession(practiceExamSourceKey(practiceExamId)),
  );

  if (!hydrated || session === undefined) return null;

  if (session.status === "submitted" && session.result !== undefined) {
    return (
      <Badge tone={session.result.passed ? "success" : "danger"}>
        {formatPercent(session.result.scorePct)}
      </Badge>
    );
  }

  return (
    <Badge tone="warning">
      {countAnswered(session)}/{session.questionIds.length}
    </Badge>
  );
}

/** How many questions are waiting in the missed-question pool for a test. */
export function MissedCount({ testId }: { testId: string }) {
  const hydrated = useHydrated(useMissedStore);
  const pool = useMissedStore((state) => state.pool);
  const sessionsHydrated = useHydrated(useSessionsStore);
  const reviewSession = useSessionsStore(selectSession(reviewSourceKey(testId)));

  if (!hydrated) return null;

  const count = entriesForTest(pool, testId).length;

  if (count === 0) {
    return sessionsHydrated && reviewSession !== undefined ? (
      <Badge tone="success">Clear</Badge>
    ) : null;
  }

  return <Badge tone="warning">{count}</Badge>;
}
