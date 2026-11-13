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
    <div
      className={cn(
        "option-card rounded-xl border border-border bg-background transition-[color,background-color,border-color,transform] duration-150 ease-out has-checked:border-primary has-checked:bg-primary/10",
        // A small press while the card is held down, so a tap feels answered. Not while choosing a team count.
        disabled ? "opacity-70" : "hover:border-primary/60 has-[label:active]:scale-[0.985]",
      )}
    >
      <label className={cn("relative flex items-start gap-3", disabled ? "cursor-not-allowed" : "cursor-pointer", compact ? "p-3 pr-9" : "p-4 pr-11")}>
        <input
          type={type}
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="size-6 shrink-0 accent-primary"
        />
        <span className="min-w-0">
          <span className="block font-medium">{label}</span>
          {explanation && <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{explanation}</span>}
        </span>
        {/* Drawn in when chosen (see app/globals.css). The native control already says it's chosen. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={cn("option-check absolute size-5 text-primary", compact ? "top-3.5 right-3" : "top-4.5 right-4")}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
        </svg>
      </label>
      {children}
    </div>
  );
}
