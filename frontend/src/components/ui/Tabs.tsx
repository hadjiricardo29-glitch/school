import { cn } from "@/utils/cn";

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
}

export function Tabs({ tabs, value, onChange }: TabsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border no-scrollbar">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "text-primary" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" && (
              <span className={cn("ml-1.5 text-xs", active ? "text-primary" : "text-text-secondary")}>({tab.count})</span>
            )}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}
