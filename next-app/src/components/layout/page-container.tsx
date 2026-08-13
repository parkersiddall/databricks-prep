import type { ReactNode } from "react";

import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

/** Shared page frame: width, breadcrumbs, heading, and body. */
export function PageContainer({
  title,
  description,
  crumbs,
  children,
}: {
  title: string;
  description?: string;
  crumbs?: Crumb[];
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      {crumbs !== undefined && <Breadcrumbs items={crumbs} />}

      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        {description !== undefined && (
          <p className="mt-2 text-muted">{description}</p>
        )}
      </header>

      {children}
    </main>
  );
}

/** A labelled group of cards. */
export function Section({
  heading,
  children,
}: {
  heading?: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-10 last:mb-0">
      {heading !== undefined && (
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
          {heading}
        </h2>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
