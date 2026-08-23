import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Users,
  TrendingUp,
  Sparkles,
  Clock,
  UserPlus,
  ListChecks,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSettings } from "@/contexts/SettingsContext";
import { useT } from "@/i18n/useT";
import { GradientBackdrop } from "@/components/shared/GradientBackdrop";
import { formatCurrency } from "@/utils/format";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function LandingPage() {
  const { settings } = useSettings();
  const t = useT().landing;

  const WHY_MOTOSU = [
    { icon: Sparkles, title: t.why1Title, body: t.why1Body },
    { icon: TrendingUp, title: t.why2Title, body: t.why2Body },
    { icon: Clock, title: t.why3Title, body: t.why3Body },
  ];

  const HOW_IT_WORKS = [
    { icon: UserPlus, step: "1", title: t.step1Title, body: t.step1Body },
    { icon: ListChecks, step: "2", title: t.step2Title, body: t.step2Body },
    { icon: Share2, step: "3", title: t.step3Title, body: t.step3Body },
  ];

  const FAQ: [string, string][] = [
    [t.faq1Q, t.faq1A],
    [t.faq2Q, t.faq2A],
    [t.faq3Q, t.faq3A],
    [t.faq4Q, t.faq4A],
  ];

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-surface">
        <GradientBackdrop />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <motion.div initial="hidden" animate="show" variants={fadeUp}>
            <Badge tone="primary">{t.badge}</Badge>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl">
              {t.heroTitle}
            </h1>
            <p className="mt-4 max-w-lg text-base text-text-secondary sm:text-lg">{t.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register">
                <Button size="lg" fullWidth icon={<ArrowRight className="size-4" />}>
                  {t.ctaStart}
                </Button>
              </Link>
              <Link to="/tasks">
                <Button size="lg" variant="outline" fullWidth>
                  {t.ctaDiscover}
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
            <Card className="mx-auto max-w-sm shadow-md ring-1 ring-accent/20">
              <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">{t.availableBalance}</p>
              <p className="mt-1 text-3xl font-semibold text-text-primary">{formatCurrency(125500, settings.currencyLabel)}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-md bg-surface-alt p-3">
                  <p className="text-xs text-text-secondary">{t.todayEarnings}</p>
                  <p className="mt-1 text-sm font-semibold text-success">+{formatCurrency(5000, settings.currencyLabel)}</p>
                </div>
                <div className="rounded-md bg-surface-alt p-3">
                  <p className="text-xs text-text-secondary">{t.team}</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{t.teamMembers}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.howItWorksTitle}</h2>
        </motion.div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <Card key={item.step} className="text-center sm:text-left">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <p className="mt-4 text-sm font-semibold text-text-primary">{item.step}. {item.title}</p>
              <p className="mt-1.5 text-sm text-text-secondary">{item.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY MOTOSU */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp} className="text-center">
          <h2 className="text-2xl font-semibold text-text-primary sm:text-3xl">{t.whyTitle.replace("{platform}", settings.platformName)}</h2>
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
            <h2 className="text-2xl font-semibold text-text-primary">{t.securityTitle}</h2>
            <p className="mt-2 max-w-2xl text-text-secondary">{t.securityBody}</p>
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
            <h2 className="mt-4 text-2xl font-semibold text-text-primary sm:text-3xl">{t.referralTitle}</h2>
            <p className="mt-3 text-text-secondary">{t.referralBody}</p>
            <Link to="/register" className="mt-6 inline-block">
              <Button icon={<ArrowRight className="size-4" />}>{t.referralCta}</Button>
            </Link>
          </div>
          <Card>
            <p className="text-sm font-semibold text-text-primary">{t.referralExampleTitle}</p>
            <div className="mt-4 flex flex-col divide-y divide-border">
              {[
                [t.level1, "10%"],
                [t.level2, "5%"],
                [t.level3, "2%"],
              ].map(([label, pct]) => (
                <div key={label} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-text-secondary">{label}</span>
                  <span className="font-semibold text-primary">{pct}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-text-secondary">{t.referralNote}</p>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-text-primary sm:text-3xl">{t.faqTitle}</h2>
          <div className="mt-10 flex flex-col divide-y divide-border">
            {FAQ.map(([q, a]) => (
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
