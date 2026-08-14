import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllQuestionsPanel } from "@/components/exam/all-questions-panel";
import { PageContainer, Section } from "@/components/layout/page-container";
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
  title: "Practice all questions",
};

export default async function AllQuestionsPage({
  params,
}: PageProps<"/[category]/[test]/all-questions">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const testPath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title="Practice all questions"
      description={`Work through every question in ${test.title} at your own pace, with the answer revealed as you go.`}
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: testPath },
        { label: "Practice all questions" },
      ]}
    >
      <Section>
        <AllQuestionsPanel
          testId={test.id}
          sourceKey={allQuestionsSourceKey(test.id)}
          takeHref={`${testPath}/all-questions/take`}
          resultsHref={`${testPath}/all-questions/results`}
        />
      </Section>
    </PageContainer>
  );
}
