"use client";

interface TooltipRow {
  label: string;
  value: string;
  color: string;
  kind?: "bar" | "line";
}

/** Tooltip body shared by dashboard charts: text in text colours, identity via a swatch. */
export function ChartTooltipBox({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-[0_12px_32px_rgba(15,30,46,0.16)]">
      <p className="mb-1 font-semibold text-foreground">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              <span
                aria-hidden="true"
                className={row.kind === "line" ? "h-0.5 w-3 rounded-full" : "size-2 rounded-sm"}
                style={{ backgroundColor: row.color }}
              />
              {row.label}
            </span>
            <span className="font-medium text-foreground tabular">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
