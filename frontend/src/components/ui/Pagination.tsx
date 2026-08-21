import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="flex size-8 items-center justify-center rounded-[10px] text-text-secondary hover:bg-surface-alt disabled:opacity-40"
        aria-label="Page précédente"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-text-secondary">…</span>}
          <button
            onClick={() => onChange(p)}
            className={cn(
              "flex size-8 items-center justify-center rounded-[10px] text-sm font-medium",
              p === page ? "bg-primary text-white" : "text-text-primary hover:bg-surface-alt",
            )}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="flex size-8 items-center justify-center rounded-[10px] text-text-secondary hover:bg-surface-alt disabled:opacity-40"
        aria-label="Page suivante"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
