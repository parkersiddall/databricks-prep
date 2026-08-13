import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { ResultsView } from "@/components/results/results-view";
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

export async function generateMetadata({
  params,
}: PageProps<"/[category]/[test]/[practiceExam]/results">): Promise<Metadata> {
  const { category, test, practiceExam } = await params;
  const foundTest = getTestBySlug(category, test);
  const found =
    foundTest === undefined
      ? undefined
      : getPracticeExamBySlug(foundTest.id, practiceExam);

  return {
    title: found === undefined ? "Not found" : `${found.title} results`,
  };
}

export default async function ResultsPage({
  params,
}: PageProps<"/[category]/[test]/[practiceExam]/results">) {
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

  const testPath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title={`${practiceExam.title} results`}
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: testPath },
        {
          label: practiceExam.title,
          href: `${testPath}/${practiceExam.slug}`,
        },
        { label: "Results" },
      ]}
    >
      <ResultsView
        sourceKey={practiceExamSourceKey(practiceExam.id)}
        passingScorePct={test.passingScorePct}
        startHref={`${testPath}/${practiceExam.slug}`}
        backHref={testPath}
        backLabel="All practice exams"
      />
    </PageContainer>
  );
}
