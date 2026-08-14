import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  MissedCount,
  PracticeExamStatus,
} from "@/components/exam/practice-exam-status";
import { PageContainer, Section } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { CardLink } from "@/components/ui/card";
import {
  getCategoryBySlug,
  getPracticeExamsForTest,
  getQuestionsForTest,
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
  const questionCount = getQuestionsForTest(test.id).length;
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

      {/*
        Above the practice-exam list on purpose: drilling questions is the
        everyday use, and sitting a full timed simulation is the occasional one.
      */}
      <Section heading="Practise">
        <CardLink
          href={`${basePath}/all-questions`}
          title="Practice all questions"
          description="Work through every question in this certification at your own pace, in a random order, with the answer revealed as you go."
          meta={joinMeta(
            pluralize(questionCount, "question"),
            "untimed",
            "not saved between visits",
          )}
        />
        <CardLink
          href={`${basePath}/review`}
          title="Missed questions"
          description="Drill only the questions you have got wrong recently, across every practice exam in this certification."
          aside={<MissedCount testId={test.id} />}
        />
      </Section>

      <Section heading="Practice exams">
        {practiceExams.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-raised p-5 text-sm text-muted">
            No practice exams have been added for this certification yet.
          </p>
        ) : (
          practiceExams.map((practiceExam) => {
            const timeLimit = getTimeLimitMinutes(practiceExam.id);

            return (
              <CardLink
                key={practiceExam.id}
                href={`${basePath}/${practiceExam.slug}`}
                title={practiceExam.title}
                description={practiceExam.description}
                aside={<PracticeExamStatus practiceExamId={practiceExam.id} />}
                meta={joinMeta(
                  pluralize(practiceExam.questions.length, "question"),
                  timeLimit !== null && formatMinutes(timeLimit),
                )}
              />
            );
          })
        )}
      </Section>
    </PageContainer>
  );
}
