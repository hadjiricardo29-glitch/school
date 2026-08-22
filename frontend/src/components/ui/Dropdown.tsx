import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

interface DropdownItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  icon?: ReactNode;
}

export function Dropdown({ trigger, items }: { trigger: ReactNode; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm hover:bg-surface-alt",
                item.danger ? "text-error" : "text-text-primary",
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
