import { useSettings } from "@/contexts/SettingsContext";

const SECTIONS = [
  {
    title: "1. Objet",
    body: "Ces conditions régissent l'utilisation de la plateforme, qui permet à ses membres d'accomplir des tâches journalières rémunérées, de développer un réseau de parrainage et de gérer un portefeuille de récompenses.",
  },
  {
    title: "2. Compte utilisateur",
    body: "Chaque personne ne peut créer qu'un seul compte. Les informations fournies à l'inscription doivent être exactes. Toute tentative de création de comptes multiples, d'auto-parrainage ou de fraude au parrainage entraîne la suspension du compte.",
  },
  {
    title: "3. Tâches journalières",
    body: "Les récompenses sont versées uniquement après vérification et approbation de la preuve de réalisation par notre équipe. Une tâche à participation unique ne peut être réclamée qu'une seule fois par utilisateur.",
  },
  {
    title: "4. Parrainage et commissions",
    body: "Les commissions de parrainage sont calculées automatiquement selon le barème multi-niveaux en vigueur, consultable depuis votre espace. Ce barème peut évoluer ; les commissions déjà versées ne sont pas rétroactivement modifiées.",
  },
  {
    title: "5. Retraits",
    body: "Les retraits sont soumis à un montant minimum, à des frais et à un délai de traitement affichés avant confirmation.",
  },
  {
    title: "6. Suspension et fraude",
    body: "Nous nous réservons le droit de suspendre tout compte présentant une activité frauduleuse (comptes multiples, tâches falsifiées, abus du système de parrainage) après examen par notre équipe.",
  },
  {
    title: "7. Modification des conditions",
    body: "Ces conditions peuvent être mises à jour. Les utilisateurs seront informés des changements substantiels via la plateforme.",
  },
];

export function TermsPage() {
  const { settings } = useSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold text-text-primary">Conditions d'utilisation</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Dernière mise à jour : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date())} — {settings.platformName}
      </p>
      <div className="mt-8 flex flex-col gap-6">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-base font-semibold text-text-primary">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
