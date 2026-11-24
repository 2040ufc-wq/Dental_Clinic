/**
 * Chart colours — validated with the dataviz palette checker (lightness band, chroma floor,
 * colour-blind separation ΔE ≥ 8, contrast ≥ 3:1). Do not change without re-running it.
 *
 *  Status series:  completed · booked · cancelled · no-show  → ALL CHECKS PASS
 *  Revenue series: billed · collected                         → ALL CHECKS PASS
 *
 * Note: "cancelled" is a muted purple in charts (the badge grey #475569 fails the
 * chroma floor and would read as a gridline). Badges outside charts keep the grey.
 */
export const STATUS_SERIES = {
  completed: "#15803d",
  booked: "#1d4ed8",
  cancelled: "#8a5a9e",
  noShow: "#b91c1c",
} as const;

export const REVENUE_SERIES = {
  billed: "#0a8a9e",
  collected: "#1d4ed8",
} as const;

/** Recessive chart chrome: hairline solid grid, secondary-text ticks (dataviz marks spec). */
export const CHART_CHROME = {
  grid: "#e3e8ee",
  tick: "#52637a",
  surface: "#ffffff",
  cursor: "#e7f6f8",
} as const;
