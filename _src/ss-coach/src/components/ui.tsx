import { useEffect, useRef, type ReactNode } from "react";
import type { Units } from "../lib/types";
import { BELL_SIZES, formatWeight } from "../lib/weights";

export function KettlebellIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2c2.6 0 4.7 1.6 4.7 3.9 0 .6-.15 1.2-.42 1.72a6.5 6.5 0 1 1-8.56 0A3.7 3.7 0 0 1 7.3 7.1c0-2.3 2.1-3.9 4.7-3.9Zm0 2.2c-1.5 0-2.5.8-2.5 1.7 0 .3.1.6.3.86a6.53 6.53 0 0 1 4.4 0c.2-.26.3-.56.3-.86 0-.9-1-1.7-2.5-1.7Z"
      />
    </svg>
  );
}

const TAB_ICONS: Record<string, ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  ),
  plan: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19V10M10 19V5M16 19v-8M22 19H2" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  learn: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
      <path d="M4 20.5V5.5M20 18v3H6.5" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </svg>
  ),
};

export function TabIcon({ name }: { name: string }) {
  return <>{TAB_ICONS[name]}</>;
}

/** Modal built on <dialog>, closes on backdrop tap and Escape. */
export function Sheet({
  open,
  onClose,
  children,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      className="sheet"
      ref={ref}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}

/** Snap-to-standard-sizes weight picker rendered as big chips. */
export function WeightPicker({
  value,
  onChange,
  units,
  allowNone = false,
  highlight = [],
  label,
}: {
  value: number;
  onChange: (kg: number) => void;
  units: Units;
  allowNone?: boolean;
  /** bells the user owns get a marker */
  highlight?: number[];
  label: string;
}) {
  const options: number[] = allowNone ? [0, ...BELL_SIZES] : [...BELL_SIZES];
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((kg) => (
        <button
          key={kg}
          type="button"
          className="chip num"
          aria-pressed={value === kg}
          onClick={() => onChange(kg)}
        >
          {kg === 0 ? "none" : formatWeight(kg, units)}
          {highlight.includes(kg) ? " •" : ""}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
