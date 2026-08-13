import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExamRunner } from "@/components/exam/exam-runner";
import {
  getCategoryBySlug,
  getTestBySlug,
  listTestParams,
} from "@/content/queries";
import { reviewSourceKey } from "@/lib/session";

export function generateStaticParams() {
  return listTestParams();
}

export const metadata: Metadata = {
  title: "Reviewing missed questions",
};

/**
 * The same runner as a practice exam, pointed at the `review:<testId>` slot.
 */
export default async function ReviewTakePage({
  params,
}: PageProps<"/[category]/[test]/review/take">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const reviewPath = `/${foundCategory.slug}/${test.slug}/review`;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ExamRunner
        sourceKey={reviewSourceKey(test.id)}
        title="Missed questions"
        startHref={reviewPath}
        resultsHref={`${reviewPath}/results`}
      />
    </main>
  );
}
