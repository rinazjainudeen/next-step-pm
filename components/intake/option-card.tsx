import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A native radio button or checkbox styled as a card. Staying native means the
 * keyboard and screen readers work without any extra code.
 */
export function OptionCard({
  type,
  name,
  value,
  label,
  explanation,
  checked,
  onChange,
  disabled = false,
  compact = false,
  children,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  explanation?: string;
  checked: boolean;
  onChange: () => void;
  /** For when a limit has been reached. */
  disabled?: boolean;
  /** Less padding, for lists of short names. */
  compact?: boolean;
  /** Extra controls. They sit outside the label, so using them doesn't untick the card. */
  children?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-background transition-colors has-checked:border-primary has-checked:bg-primary/10", disabled ? "opacity-70" : "hover:border-primary/60")}>
      <label className={cn("flex items-start gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer", compact ? "p-3" : "p-4")}>
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block font-medium">{label}</span>
          {explanation && <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{explanation}</span>}
        </span>
      </label>
      {children}
    </div>
  );
}
