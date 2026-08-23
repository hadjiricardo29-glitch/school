import { useEffect, useRef, useState, type FormEvent } from "react";
import { LifeBuoy, MessageSquareReply, Headset } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { createSupportTicket, getMyTickets } from "@/services/support";
import type { SupportTicket } from "@/types/domain";
import { formatDateTime } from "@/utils/format";
import { notify } from "@/utils/toast";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "En attente",
  IN_PROGRESS: "En cours",
  RESOLVED: "Résolu",
};

const STATUS_TONES: Record<string, "warning" | "primary" | "success"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  RESOLVED: "success",
};

export function SupportPage() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const subjectRef = useRef<HTMLInputElement>(null);

  function goToForm() {
    subjectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    subjectRef.current?.focus();
  }

  async function load() {
    if (!profile) return;
    setTickets(await getMyTickets(profile.id));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await createSupportTicket(subject.trim(), message.trim());
      notify.success("Message envoyé — l'équipe vous répondra ici.");
      setSubject("");
      setMessage("");
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Support</h1>
        <p className="mt-1 text-sm text-text-secondary">Une question, un problème ? Écrivez-nous ici.</p>
      </div>

      <Card className="flex flex-col items-center gap-3 bg-primary/5 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Headset className="size-7" />
        </span>
        <div>
          <p className="text-base font-semibold text-text-primary">Nous sommes là pour toutes vos préoccupations</p>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Dépôt, retrait, tâche, compte bloqué... notre équipe vous répond directement ici, dans l'application.
          </p>
        </div>
        <Button onClick={goToForm}>Envoyer un message</Button>
      </Card>

      <Card>
        <CardHeader title="Nouveau message" />
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            ref={subjectRef}
            label="Sujet"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Dépôt bloqué"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Message</label>
            <textarea
              className="min-h-28 w-full rounded-md border border-border bg-surface p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez votre préoccupation en détail..."
            />
          </div>
          <Button type="submit" fullWidth loading={sending}>Envoyer</Button>
        </form>
      </Card>

      <Card padded={false}>
        <div className="px-5 pt-4">
          <CardHeader title="Mes messages" />
        </div>
        <div className="px-5 pb-5">
          {loading ? (
            <LoadingState />
          ) : tickets.length === 0 ? (
            <EmptyState icon={LifeBuoy} title="Aucun message envoyé" description="Vos échanges avec le support apparaîtront ici." />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {tickets.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text-primary">{t.subject}</span>
                    <Badge tone={STATUS_TONES[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{t.message}</p>
                  <span className="text-xs text-text-secondary">{formatDateTime(t.created_at)}</span>
                  {t.admin_reply && (
                    <div className="mt-1 flex items-start gap-2 rounded-md bg-primary/5 p-3">
                      <MessageSquareReply className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-xs font-medium text-primary">Réponse du support</p>
                        <p className="mt-0.5 text-sm text-text-primary">{t.admin_reply}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
