import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StartPanel } from "@/components/exam/start-panel";
import { PageContainer, Section } from "@/components/layout/page-container";
import {
  getCategoryBySlug,
  getPracticeExamBySlug,
  getTestBySlug,
  getTimeLimitMinutes,
  listPracticeExamParams,
} from "@/content/queries";
import { practiceExamSourceKey } from "@/lib/session";

export function generateStaticParams() {
  return listPracticeExamParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]/[test]/[practiceExam]">): Promise<Metadata> {
  const { category, test, practiceExam } = await params;
  const foundTest = getTestBySlug(category, test);
  const found =
    foundTest === undefined
      ? undefined
      : getPracticeExamBySlug(foundTest.id, practiceExam);

  return { title: found?.title ?? "Not found" };
}

export default async function PracticeExamPage({
  params,
}: PageProps<"/[category]/[test]/[practiceExam]">) {
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
    <PageContainer
      title={practiceExam.title}
      description={practiceExam.description}
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title, href: `/${foundCategory.slug}/${test.slug}` },
        { label: practiceExam.title },
      ]}
    >
      <Section>
        <StartPanel
          sourceKey={practiceExamSourceKey(practiceExam.id)}
          testId={test.id}
          questionIds={practiceExam.questions.map((question) => question.id)}
          timeLimitMinutes={getTimeLimitMinutes(practiceExam.id)}
          takeHref={`${basePath}/take`}
          resultsHref={`${basePath}/results`}
        />
      </Section>
    </PageContainer>
  );
}
