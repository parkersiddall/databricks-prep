import { PageContainer, Section } from "@/components/layout/page-container";
import { CardLink } from "@/components/ui/card";
import { getCategories, getTestsForCategory } from "@/content/queries";
import { pluralize } from "@/lib/format";

export default function HomePage() {
  const categories = getCategories();

  return (
    <PageContainer
      title="Practice exams"
      description="Pick a track, choose a certification, then sit a practice exam. Progress saves in this browser as you go."
    >
      <Section>
        {categories.map((category) => (
          <CardLink
            key={category.id}
            href={`/${category.slug}`}
            title={category.title}
            description={category.description}
            meta={pluralize(
              getTestsForCategory(category.slug).length,
              "certification",
            )}
          />
        ))}
      </Section>
    </PageContainer>
  );
}
