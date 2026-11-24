import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface KpiCardProps {
  label: string;
  /** Already formatted value (e.g. "1,248" or "12,400.00 ر.س") */
  value: string;
  /** Numeric values used to compute the comparison with the previous period */
  current?: number;
  previous?: number;
  /** true when an increase is good (revenue), false when bad (cancellations), null = neutral */
  upIsGood?: boolean | null;
  /** Builds the translated comparison sentence from the formatted % change */
  describeChange?: (direction: "up" | "down" | "same", formattedPercent: string) => string;
  formatPercent?: (ratio: number) => string;
  icon?: ReactNode;
  /** Optional small line under the value (e.g. a breakdown) */
  footnote?: string;
}

/**
 * Stat tile (docs/05 S2 "KPI card"; dataviz stat-tile contract):
 * label · value (proportional figures) · signed change vs previous period, coloured by
 * whether the direction is good, and always with an arrow + words (never colour alone).
 */
export function KpiCard({
  label,
  value,
  current,
  previous,
  upIsGood = null,
  describeChange,
  formatPercent,
  icon,
  footnote,
}: KpiCardProps) {
  let change: { direction: "up" | "down" | "same"; text: string } | null = null;
  if (current !== undefined && previous !== undefined && describeChange && formatPercent && previous > 0) {
    const ratio = (current - previous) / previous;
    const direction = Math.abs(ratio) < 0.005 ? "same" : ratio > 0 ? "up" : "down";
    change = { direction, text: describeChange(direction, formatPercent(Math.abs(ratio))) };
  }

  const good =
    change && change.direction !== "same" && upIsGood !== null
      ? (change.direction === "up") === upIsGood
      : null;
  const ChangeIcon = change?.direction === "up" ? ArrowUpRight : change?.direction === "down" ? ArrowDownRight : Minus;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,30,46,0.06)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-text-secondary">{label}</span>
        {icon && <span aria-hidden="true" className="text-primary-600">{icon}</span>}
      </div>
      {/* Smaller on phones so money values ("3,244.00 ر.س") fit half-width cards */}
      <span className="text-xl leading-7 font-semibold break-words text-foreground sm:text-[28px] sm:leading-9">
        {value}
      </span>
      {change && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            good === true && "text-success",
            good === false && "text-danger",
            good === null && "text-text-secondary",
          )}
        >
          <ChangeIcon aria-hidden="true" className="size-3.5 shrink-0 rtl:-scale-x-100" />
          {change.text}
        </span>
      )}
      {footnote && <span className="text-xs text-text-secondary">{footnote}</span>}
    </div>
  );
}
