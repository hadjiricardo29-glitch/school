import type { ReactNode } from "react";
import { Card, CardHeader } from "@/components/ui/Card";

export function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className="h-64 w-full">{children}</div>
    </Card>
  );
}
