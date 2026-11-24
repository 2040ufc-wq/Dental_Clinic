import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { Label } from "@/ui/components/ui/label";

/** Accessibility props the field passes to its input (label, hint and error are announced). */
export interface FieldA11yProps {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
}

interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Already-translated error text */
  error?: string;
  /** Optional element shown on the end side of the label row (e.g. "Forgot password?") */
  labelAction?: ReactNode;
  children: (a11y: FieldA11yProps) => ReactNode;
}

/**
 * Standard form row (docs/05 A7 "Forms"): label above, hint below, error in red with icon.
 * Uses a render prop so any input type receives the correct ids for screen readers.
 */
export function FormField({
  id,
  label,
  required,
  hint,
  error,
  labelAction,
  children,
}: FormFieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
          {required && (
            <span aria-hidden="true" className="text-danger">
              *
            </span>
          )}
        </Label>
        {labelAction}
      </div>

      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="text-xs text-text-secondary">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
