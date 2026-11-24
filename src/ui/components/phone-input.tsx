"use client";

import type { ComponentProps } from "react";
import { Input } from "@/ui/components/ui/input";

interface PhoneInputProps
  extends Omit<ComponentProps<typeof Input>, "type" | "onChange" | "value"> {
  /** Local part only: 9 digits starting with 5 (e.g. "501234567") */
  value: string;
  onChange: (localDigits: string) => void;
}

/** Keeps digits only and drops a leading 0 so "0501234567" becomes "501234567". */
export function normalizeLocalMobile(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0/, "").slice(0, 9);
}

/** "501234567" → "+966501234567" (E.164, as stored by the API). */
export function toE164(localDigits: string): string {
  return `+966${localDigits}`;
}

/**
 * Saudi mobile field with a fixed +966 prefix (docs/05 A7).
 * Always left-to-right, even inside Arabic pages, because phone numbers are read LTR.
 */
export function PhoneInput({ value, onChange, className, ...props }: PhoneInputProps) {
  return (
    <div dir="ltr" className="flex">
      <span
        aria-hidden="true"
        className="flex items-center rounded-s-lg border border-e-0 border-input bg-muted px-3 text-sm text-text-secondary tabular"
      >
        +966
      </span>
      <Input
        {...props}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        onChange={(e) => onChange(normalizeLocalMobile(e.target.value))}
        className={`rounded-s-none tabular ${className ?? ""}`}
      />
    </div>
  );
}
