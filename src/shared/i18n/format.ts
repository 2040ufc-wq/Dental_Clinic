"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

export const CLINIC_TIME_ZONE = "Asia/Riyadh";

/**
 * Number/date formatters for the UI (docs/05 A3).
 * - Western digits (0–9) in BOTH languages (Q-26 default) → "-u-nu-latn"
 * - Gregorian calendar (Q-05 default) → "-ca-gregory"
 * - Always shown in Saudi time (PLT-02)
 */
export function useFormatters() {
  const locale = useLocale();
  return useMemo(() => {
    const tag = locale === "ar" ? "ar-u-nu-latn-ca-gregory" : "en-u-ca-gregory";
    const integer = new Intl.NumberFormat(tag);
    const compact = new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 });
    const percent = new Intl.NumberFormat(tag, { style: "percent", maximumFractionDigits: 0 });
    const money = new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const moneyCompact = new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "SAR",
      notation: "compact",
      maximumFractionDigits: 1,
    });
    const time = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit", timeZone: CLINIC_TIME_ZONE });
    const hour = new Intl.DateTimeFormat(tag, { hour: "numeric", timeZone: CLINIC_TIME_ZONE });
    const dayShort = new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", timeZone: CLINIC_TIME_ZONE });
    const dateLong = new Intl.DateTimeFormat(tag, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: CLINIC_TIME_ZONE,
    });
    const dayMonth = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: CLINIC_TIME_ZONE });

    return {
      number: (n: number) => integer.format(n),
      /** Axis ticks: 5,000 → "5K" */
      compact: (n: number) => compact.format(n),
      percent: (ratio: number) => percent.format(ratio),
      /** Money arrives from the API as a string ("150.00") to avoid rounding errors */
      money: (amount: string | number) => money.format(Number(amount)),
      moneyCompact: (amount: string | number) => moneyCompact.format(Number(amount)),
      time: (iso: string) => time.format(new Date(iso)),
      hour: (iso: string) => hour.format(new Date(iso)),
      dayShort: (iso: string) => dayShort.format(new Date(iso)),
      dayMonth: (iso: string) => dayMonth.format(new Date(iso)),
      dateLong: (iso: string) => dateLong.format(new Date(iso)),
    };
  }, [locale]);
}
