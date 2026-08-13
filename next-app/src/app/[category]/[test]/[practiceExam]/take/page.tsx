import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExamRunner } from "@/components/exam/exam-runner";
import {
  getCategoryBySlug,
  getPracticeExamBySlug,
  getTestBySlug,
  listPracticeExamParams,
} from "@/content/queries";
import { practiceExamSourceKey } from "@/lib/session";

export function generateStaticParams() {
  return listPracticeExamParams();
}

export const metadata: Metadata = {
  title: "Sitting exam",
};

/**
 * Server shell: validates the route and hands the runner its source key. All
 * session state is client-side, so the page itself stays static.
 */
export default async function TakePage({
  params,
}: PageProps<"/[category]/[test]/[practiceExam]/take">) {
  const {
    category,
    test: testSlug,
    practiceExam: practiceExamSlug,
  } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const practiceExam = getPracticeExamBySlug(test.id, practiceExamSlug);
  if (practiceExam === undefined) notFound();

  const basePath = `/${foundCategory.slug}/${test.slug}/${practiceExam.slug}`;

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <ExamRunner
        sourceKey={practiceExamSourceKey(practiceExam.id)}
        title={practiceExam.title}
        startHref={basePath}
        resultsHref={`${basePath}/results`}
      />
    </main>
  );
}
