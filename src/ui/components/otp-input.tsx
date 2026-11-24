"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cn } from "@/shared/lib/utils";

interface OtpInputProps {
  /** Current code, up to `length` digits */
  value: string;
  onChange: (code: string) => void;
  /** Called once all digits are filled (used for auto-submit) */
  onComplete?: (code: string) => void;
  length?: number;
  /** id of the visible label that names the whole group */
  labelledBy: string;
  /** e.g. (i) => "Digit 1 of 6" — read by screen readers for each box */
  digitLabel: (index: number) => string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Six separate boxes for one-time / 2FA codes (docs/05 S1).
 * Auto-advances, supports Backspace/arrow keys and pasting the whole code.
 * Always LTR so digits read left-to-right in Arabic too.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  labelledBy,
  digitLabel,
  invalid,
  describedBy,
  disabled,
  autoFocus,
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  const focusBox = (i: number) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const commit = (next: string) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const setDigit = (index: number, digit: string) => {
    const chars = digits.slice();
    chars[index] = digit;
    // join only up to the first gap so the value stays a contiguous prefix
    const firstGap = chars.indexOf("");
    commit((firstGap === -1 ? chars : chars.slice(0, firstGap)).join(""));
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1);
    if (!digit) return;
    setDigit(index, digit);
    focusBox(index + 1);
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        commit(value.slice(0, index));
      } else if (index > 0) {
        commit(value.slice(0, index - 1));
        focusBox(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusBox(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusBox(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted);
    focusBox(pasted.length);
  };

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      dir="ltr"
      className="flex justify-center gap-2"
    >
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          aria-label={digitLabel(i + 1)}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          className={cn(
            "size-12 rounded-lg border border-input bg-card text-center text-xl font-semibold tabular outline-none transition-colors sm:size-11",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
            invalid && "border-danger",
            disabled && "opacity-50",
          )}
        />
      ))}
    </div>
  );
}
