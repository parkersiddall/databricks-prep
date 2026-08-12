import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer, Section } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import {
  getCategoryBySlug,
  getPracticeExamsForTest,
  getTestBySlug,
  getTimeLimitMinutes,
  listTestParams,
} from "@/content/queries";
import { formatMinutes, joinMeta, pluralize } from "@/lib/format";

export function generateStaticParams() {
  return listTestParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]/[test]">): Promise<Metadata> {
  const { category, test } = await params;
  const found = getTestBySlug(category, test);

  return { title: found?.title ?? "Not found" };
}

export default async function TestPage({
  params,
}: PageProps<"/[category]/[test]">) {
  const { category, test: testSlug } = await params;

  const foundCategory = getCategoryBySlug(category);
  const test = getTestBySlug(category, testSlug);
  if (foundCategory === undefined || test === undefined) notFound();

  const practiceExams = getPracticeExamsForTest(test.id);
  const basePath = `/${foundCategory.slug}/${test.slug}`;

  return (
    <PageContainer
      title={test.title}
      description={test.description}
      crumbs={[
        { label: "Home", href: "/" },
        { label: foundCategory.title, href: `/${foundCategory.slug}` },
        { label: test.title },
      ]}
    >
      <Section heading="Exam objectives">
        <div className="flex flex-wrap gap-2">
          {test.domains.map((domain) => (
            <Badge key={domain}>{domain}</Badge>
          ))}
        </div>
      </Section>

      <Section heading="Practice exams">
        {practiceExams.map((practiceExam) => {
          const timeLimit = getTimeLimitMinutes(practiceExam.id);

          return (
            <CardLink
              key={practiceExam.id}
              href={`${basePath}/${practiceExam.slug}`}
              title={practiceExam.title}
              description={practiceExam.description}
              meta={joinMeta(
                pluralize(practiceExam.questions.length, "question"),
                timeLimit !== null && formatMinutes(timeLimit),
              )}
            />
          );
        })}
      </Section>

      <Section heading="Review">
        <CardLink
          href={`${basePath}/review`}
          title="Missed questions"
          description="Drill only the questions you have got wrong recently, across every practice exam in this certification."
        />
      </Section>
    </PageContainer>
  );
}
