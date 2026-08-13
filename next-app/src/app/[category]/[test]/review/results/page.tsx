import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { ResultsView } from "@/components/results/results-view";
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
  title: "Review results",
};

export default async function ReviewResultsPage({
  params,
}: PageProps<"/[category]/[test]/review/results">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const testPath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title="Review results"
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: testPath },
        { label: "Missed questions", href: `${testPath}/review` },
        { label: "Results" },
      ]}
    >
      <ResultsView
        sourceKey={reviewSourceKey(test.id)}
        passingScorePct={test.passingScorePct}
        startHref={`${testPath}/review`}
        startLabel="Back to review list"
        backHref={testPath}
        backLabel="All practice exams"
      />
    </PageContainer>
  );
}
