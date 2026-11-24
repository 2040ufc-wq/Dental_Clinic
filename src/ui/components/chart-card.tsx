"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChartColumn, Table2 } from "lucide-react";
import { Button } from "@/ui/components/ui/button";

interface LegendItem {
  label: string;
  color: string;
  /** "bar" draws a square swatch, "line" a short line key */
  kind?: "bar" | "line";
}

interface ChartCardProps {
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  /** The chart itself */
  chart: ReactNode;
  /** Same data as an accessible table (dataviz: every chart has a table twin) */
  table: ReactNode;
}

/** Card wrapper for every chart: title, legend, and a Chart ⇄ Table toggle. */
export function ChartCard({ title, subtitle, legend, chart, table }: ChartCardProps) {
  const t = useTranslations("dashboard.charts");
  const [showTable, setShowTable] = useState(false);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[0_1px_2px_rgba(15,30,46,0.06)]">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-navy-900">{title}</h2>
          {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTable((v) => !v)}
          aria-pressed={showTable}
          className="text-text-secondary"
        >
          {showTable ? <ChartColumn aria-hidden="true" /> : <Table2 aria-hidden="true" />}
          {showTable ? t("showChart") : t("showTable")}
        </Button>
      </header>

      {legend && legend.length > 1 && !showTable && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
          {legend.map((item) => (
            <li key={item.label} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={item.kind === "line" ? "h-0.5 w-4 rounded-full" : "size-2.5 rounded-sm"}
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </li>
          ))}
        </ul>
      )}

      {showTable ? <div className="overflow-x-auto">{table}</div> : chart}
    </section>
  );
}

/** Simple accessible data table used as the chart's table view. */
export function DataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr className="border-b border-border text-[13px] text-text-secondary">
          {columns.map((c, i) => (
            <th key={c} scope="col" className={i === 0 ? "py-2 text-start font-medium" : "py-2 text-end font-medium"}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, r) => (
          <tr key={r} className="border-b border-border last:border-0">
            {row.map((cell, i) =>
              i === 0 ? (
                <th key={i} scope="row" className="py-2 text-start font-normal">
                  {cell}
                </th>
              ) : (
                <td key={i} className="py-2 text-end tabular">
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
