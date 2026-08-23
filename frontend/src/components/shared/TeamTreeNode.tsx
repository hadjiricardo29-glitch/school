import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import type { TeamNode } from "@/services/referrals";
import { useT } from "@/i18n/useT";
import { formatDate } from "@/utils/format";

export function TeamTreeNode({ node, depth = 0, isRoot = false }: { node: TeamNode; depth?: number; isRoot?: boolean }) {
  const t = useT().team;
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div className={depth > 0 ? "ml-5 border-l border-border pl-4" : ""}>
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button onClick={() => setOpen((v) => !v)} className="text-text-secondary hover:text-text-primary">
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <Avatar firstName={node.first_name} lastName={node.last_name} username={node.username} size="sm" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
            @{node.username}
            {isRoot && <Badge tone="primary">{t.you}</Badge>}
          </p>
          <p className="text-xs text-text-secondary">
            {node.children.length} {node.children.length !== 1 ? t.referralsPlural : t.referral} · {t.since} {formatDate(node.created_at)}
          </p>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TeamTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
