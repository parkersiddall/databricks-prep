import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewPanel } from "@/components/exam/review-panel";
import { PageContainer, Section } from "@/components/layout/page-container";
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
  title: "Missed questions",
};

export default async function ReviewPage({
  params,
}: PageProps<"/[category]/[test]/review">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const testPath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title="Missed questions"
      description={`Questions you have answered incorrectly across every practice exam in ${test.title}.`}
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: testPath },
        { label: "Missed questions" },
      ]}
    >
      <Section>
        <ReviewPanel
          testId={test.id}
          sourceKey={reviewSourceKey(test.id)}
          takeHref={`${testPath}/review/take`}
          resultsHref={`${testPath}/review/results`}
        />
      </Section>
    </PageContainer>
  );
}
