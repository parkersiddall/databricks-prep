import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExamRunner } from "@/components/exam/exam-runner";
import {
  getCategoryBySlug,
  getTestBySlug,
  listTestParams,
} from "@/content/queries";
import { allQuestionsSourceKey } from "@/lib/session";

export function generateStaticParams() {
  return listTestParams();
}

export const metadata: Metadata = {
  title: "Practising all questions",
};

/**
 * The same runner as a practice exam, pointed at the `all:<testId>` slot.
 *
 * That slot is not persisted, so a reload here lands on the runner's "missing"
 * state and sends the user back to the start screen for a fresh run.
 */
export default async function AllQuestionsTakePage({
  params,
}: PageProps<"/[category]/[test]/all-questions/take">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const allQuestionsPath = `/${foundCategory.slug}/${test.slug}/all-questions`;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ExamRunner
        sourceKey={allQuestionsSourceKey(test.id)}
        title="All questions"
        startHref={allQuestionsPath}
        resultsHref={`${allQuestionsPath}/results`}
      />
    </main>
  );
}
