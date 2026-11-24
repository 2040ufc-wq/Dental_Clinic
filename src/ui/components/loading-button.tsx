import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/ui/components/ui/button";

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean;
  /** Label shown while loading (e.g. "Signing in…"); defaults to children */
  loadingText?: string;
}

/** Button that shows a spinner and blocks double-clicks while work is in progress (docs/05 A7). */
export function LoadingButton({
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
