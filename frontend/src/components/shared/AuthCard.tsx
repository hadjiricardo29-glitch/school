import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/shared/Logo";
import { GradientBackdrop } from "@/components/shared/GradientBackdrop";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-surface-alt px-4 py-10">
      <GradientBackdrop />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-text-secondary">{footer}</div>}
        <p className="mt-8 text-center text-xs text-text-secondary">
          <Link to="/" className="hover:text-text-primary">
            ← Retour à l'accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
