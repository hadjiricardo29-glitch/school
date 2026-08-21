import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";

const LINKS = [
  { label: "Missions", to: "/tasks" },
  { label: "Comment ça marche", to: "/#how-it-works" },
  { label: "Parrainage", to: "/#referral" },
  { label: "FAQ", to: "/#faq" },
];

export function PublicHeader() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-text-secondary hover:text-text-primary">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {session ? (
            <Button size="sm" onClick={() => (window.location.href = "/dashboard")}>
              Mon dashboard
            </Button>
          ) : (
            <>
              <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary">
                Connexion
              </Link>
              <Button size="sm" onClick={() => (window.location.href = "/register")}>
                Commencer
              </Button>
            </>
          )}
        </div>

        <button className="p-2 md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-surface px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm font-medium text-text-primary">
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {session ? (
                <Button onClick={() => (window.location.href = "/dashboard")}>Mon dashboard</Button>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="outline" fullWidth>
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button fullWidth>Commencer</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
