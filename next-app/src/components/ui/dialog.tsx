"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Thin wrapper over the native `<dialog>` element, which brings focus trapping,
 * Escape-to-close, and inert background for free rather than hand-rolling them.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // `onClose` also covers Escape, which fires cancel then close.
      onClose={onClose}
      aria-labelledby="dialog-title"
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-raised p-6 text-foreground backdrop:bg-black/50"
    >
      <h2 id="dialog-title" className="text-lg font-semibold">
        {title}
      </h2>
      {description !== undefined && (
        <p className="mt-2 text-sm text-muted">{description}</p>
      )}
      {children !== undefined && <div className="mt-4">{children}</div>}
      {footer !== undefined && (
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      )}
    </dialog>
  );
}
