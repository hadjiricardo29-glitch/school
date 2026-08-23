import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { TeamTreeNode } from "@/components/shared/TeamTreeNode";
import { getTeamTree, type TeamNode } from "@/services/referrals";
import { useT } from "@/i18n/useT";

export function TeamPage() {
  const { profile } = useAuth();
  const t = useT().team;
  const [tree, setTree] = useState<TeamNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getTeamTree(profile.id).then(setTree).finally(() => setLoading(false));
  }, [profile]);

  if (loading) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">{t.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.subtitle}</p>
      </div>

      <Card>
        {!tree || tree.children.length === 0 ? (
          <Alert tone="info">{t.empty}</Alert>
        ) : (
          <TeamTreeNode node={tree} isRoot />
        )}
      </Card>
    </div>
  );
}
