import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { ResultsView } from "@/components/results/results-view";
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
  title: "Practice results",
};

export default async function AllQuestionsResultsPage({
  params,
}: PageProps<"/[category]/[test]/all-questions/results">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const testPath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title="Practice results"
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: testPath },
        {
          label: "Practice all questions",
          href: `${testPath}/all-questions`,
        },
        { label: "Results" },
      ]}
    >
      <ResultsView
        sourceKey={allQuestionsSourceKey(test.id)}
        passingScorePct={test.passingScorePct}
        startHref={`${testPath}/all-questions`}
        startLabel="Practise again"
        backHref={testPath}
        backLabel="All practice exams"
      />
    </PageContainer>
  );
}
