import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  TrendingUp,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listPublishedTasks } from "@/services/tasks";
import type { Task } from "@/types/domain";
import { TASK_CATEGORY_LABELS } from "@/types/domain";
import { formatCurrency } from "@/utils/format";
import { useSettings } from "@/contexts/SettingsContext";
import { GradientBackdrop } from "@/components/shared/GradientBackdrop";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const WHY_MOTOSU = [
  { icon: Sparkles, title: "Missions variées", body: "Réseaux sociaux, contenu, sondages, tests d'applications et plus encore, mises à jour régulièrement." },
  { icon: TrendingUp, title: "Parrainage multi-niveaux", body: "Un barème de commissions transparent et configurable, visible directement depuis votre tableau de bord." },
  { icon: Clock, title: "Suivi en temps réel", body: "Statistiques de gains, historique des transactions et progression de votre équipe, toujours à jour." },
];

export function LandingPage() {
  const { settings } = useSettings();
  const [featured, setFeatured] = useState<Task[]>([]);

  useEffect(() => {
    listPublishedTasks()
      .then((tasks) => setFeatured(tasks.slice(0, 6)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <GradientBackdrop />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge tone="primary">Missions • Récompenses • Parrainage</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              Transformez votre temps en récompenses digitales.
            </h1>
            <p className="mt-4 max-w-lg text-base text-text-secondary sm:text-lg">
              Accomplissez des missions, développez votre réseau et suivez vos récompenses depuis une seule plateforme.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" fullWidth icon={<ArrowRight className="size-4" />}>
                  Commencer maintenant
                </Button>
              </Link>
              <Link to="/tasks">
                <Button size="lg" variant="outline" fullWidth>
                  Découvrir les missions
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <Card className="mx-auto max-w-sm shadow-md">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Solde disponible</p>
              <p className="mt-1 text-3xl font-semibold text-text-primary">{formatCurrency(125500, settings.currencyLabel)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[10px] bg-surface-alt p-3">
                  <p className="text-xs text-text-secondary">Gains du jour</p>
                  <p className="mt-1 text-sm font-semibold text-success">+{formatCurrency(5000, settings.currencyLabel)}</p>
                </div>
                <div className="rounded-[10px] bg-surface-alt p-3">
                  <p className="text-xs text-text-secondary">Équipe</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">24 membres</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">Comment ça marche</h2>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto mt-8 max-w-3xl text-center text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          <p>
            Créez votre compte en moins de deux minutes, avec ou sans lien de parrainage. Choisissez une mission
            parmi celles disponibles, réalisez-la et soumettez votre preuve : votre récompense est créditée
            automatiquement dès qu'elle est validée. Partagez ensuite votre lien pour faire grandir votre équipe et
            percevoir des commissions sur plusieurs niveaux de parrainage. Une fois votre solde disponible, demandez
            un retrait selon la méthode qui vous convient le mieux.
          </p>
        </motion.div>
      </section>

      {/* FEATURED TASKS */}
      {featured.length > 0 && (
        <section className="border-y border-border bg-surface py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">Missions en vedette</h2>
                <p className="mt-2 text-text-secondary">Un aperçu des missions disponibles dès aujourd'hui.</p>
              </div>
              <Link to="/tasks" className="hidden text-sm font-medium text-primary hover:underline sm:block">
                Voir toutes les missions →
              </Link>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((task) => (
                <Card key={task.id} className="flex flex-col">
                  <div className="flex items-center justify-between">
                    <Badge tone="neutral">{TASK_CATEGORY_LABELS[task.category]}</Badge>
                    <span className="text-sm font-semibold text-primary">{formatCurrency(task.reward, settings.currencyLabel)}</span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-text-primary">{task.title}</p>
                  <p className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{task.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY MOTOSU */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">Pourquoi {settings.platformName}</h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {WHY_MOTOSU.map((item) => (
            <Card key={item.title}>
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-text-primary">{item.title}</p>
              <p className="mt-1.5 text-sm text-text-secondary">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* SECURITY */}
      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:flex-row lg:text-left">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-8" />
          </span>
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">Sécurisé et transparent</h2>
            <p className="mt-2 max-w-2xl text-text-secondary">
              Chaque mouvement financier — récompense, commission, dépôt ou retrait — est enregistré dans un registre
              détaillé et vérifiable. Nos règles de parrainage empêchent l'auto-parrainage et les abus, pour un
              système équitable pour tous.
            </p>
          </div>
        </div>
      </section>

      {/* REFERRAL PROGRAM */}
      <section id="referral" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="size-6" />
            </span>
            <h2 className="mt-4 text-2xl font-semibold text-text-primary sm:text-3xl">Programme de parrainage</h2>
            <p className="mt-3 text-text-secondary">
              Partagez votre lien unique et percevez des commissions sur plusieurs niveaux de votre réseau, à chaque
              fois qu'un filleul complète une mission. Votre équipe grandit, vos revenus aussi.
            </p>
            <Link to="/register" className="mt-6 inline-block">
              <Button icon={<ArrowRight className="size-4" />}>Créer mon lien de parrainage</Button>
            </Link>
          </div>
          <Card>
            <p className="text-sm font-semibold text-text-primary">Exemple de commission</p>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {[
                ["Niveau 1 (filleul direct)", "10%"],
                ["Niveau 2", "5%"],
                ["Niveau 3", "2%"],
              ].map(([label, pct]) => (
                <div key={label} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-semibold text-primary">{pct}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">Barème configurable, consultable en temps réel depuis votre espace.</p>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-text-primary sm:text-3xl">Questions fréquentes</h2>
          <div className="mt-10 flex flex-col divide-y divide-border">
            {[
              ["L'inscription est-elle gratuite ?", "Oui, la création de compte est entièrement gratuite, avec ou sans lien de parrainage."],
              ["Quand suis-je payé pour une mission ?", "Dès que votre soumission est validée par notre équipe, la récompense est créditée immédiatement sur votre portefeuille."],
              ["Puis-je me parrainer moi-même ?", "Non, le système empêche techniquement l'auto-parrainage et toute tentative de contournement du réseau."],
              ["Comment fonctionnent les retraits ?", "Vous demandez un retrait depuis votre portefeuille ; le montant, les frais et le délai sont affichés avant confirmation."],
            ].map(([q, a]) => (
              <details key={q} className="group py-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-text-primary marker:content-none">
                  {q}
                </summary>
                <p className="mt-2 text-sm text-text-secondary">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
