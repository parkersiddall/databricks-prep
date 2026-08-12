import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageContainer, Section } from "@/components/layout/page-container";
import { CardLink } from "@/components/ui/card";
import {
  getCategoryBySlug,
  getPracticeExamsForTest,
  getTestsForCategory,
  listCategoryParams,
} from "@/content/queries";
import { formatMinutes, joinMeta, pluralize } from "@/lib/format";

export function generateStaticParams() {
  return listCategoryParams();
}

export async function generateMetadata({
  params,
}: PageProps<"/[category]">): Promise<Metadata> {
  const { category } = await params;
  const found = getCategoryBySlug(category);

  return { title: found?.title ?? "Not found" };
}

export default async function CategoryPage({
  params,
}: PageProps<"/[category]">) {
  const { category } = await params;

  const found = getCategoryBySlug(category);
  if (found === undefined) notFound();

  const tests = getTestsForCategory(category);

  return (
    <PageContainer
      title={found.title}
      description={found.description}
      crumbs={[{ label: "Home", href: "/" }, { label: found.title }]}
    >
      <Section heading="Certifications">
        {tests.map((test) => (
          <CardLink
            key={test.id}
            href={`/${found.slug}/${test.slug}`}
            title={test.title}
            description={test.description}
            meta={joinMeta(
              pluralize(getPracticeExamsForTest(test.id).length, "practice exam"),
              formatMinutes(test.defaultTimeLimitMinutes),
              `${test.passingScorePct}% to pass`,
            )}
          />
        ))}
      </Section>
    </PageContainer>
  );
}
