"use client";

import { useEffect, useRef } from "react";

interface StepHeadingProps {
  title: string;
  subtitle?: string;
  /** Move keyboard/screen-reader focus here when a new step appears (not on first page load). */
  focusOnMount?: boolean;
}

/** Title + subtitle at the top of every auth card. */
export function StepHeading({ title, subtitle, focusOnMount }: StepHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);

  return (
    <div className="mb-6">
      <h1
        ref={ref}
        tabIndex={-1}
        className="text-2xl font-semibold text-navy-900 outline-none"
      >
        {title}
      </h1>
      {subtitle && <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>}
    </div>
  );
}
