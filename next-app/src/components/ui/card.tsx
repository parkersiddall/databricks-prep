import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface-raised p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * A whole card that acts as a single link. Used for every level of the
 * category → test → practice exam drill-down.
 */
export function CardLink({
  href,
  title,
  description,
  meta,
  aside,
}: {
  href: string;
  title: string;
  description?: string;
  /** Small metadata line, e.g. "6 questions · 90 min". */
  meta?: string;
  /** Right-aligned slot for a status badge. */
  aside?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-border bg-surface-raised p-5 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium transition-colors group-hover:text-primary">
            {title}
          </h3>
          {description !== undefined && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {aside}
          <span
            aria-hidden="true"
            className="text-muted transition-colors group-hover:text-primary"
          >
            →
          </span>
        </div>
      </div>
      {meta !== undefined && meta !== "" && (
        <p className="mt-3 text-xs text-muted">{meta}</p>
      )}
    </Link>
  );
}
