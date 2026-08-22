import { useSettings } from "@/contexts/SettingsContext";

const SECTIONS = [
  {
    title: "1. Données collectées",
    body: "Nous collectons les informations que vous fournissez à l'inscription (nom, email, téléphone, pays), les données liées à votre activité (tâches réalisées, transactions, parrainages) et des informations techniques limitées (adresse IP, journal de connexion) à des fins de sécurité.",
  },
  {
    title: "2. Utilisation des données",
    body: "Vos données servent à faire fonctionner votre compte, calculer vos récompenses et commissions, prévenir la fraude, et vous contacter au sujet de votre compte. Nous ne vendons pas vos données à des tiers.",
  },
  {
    title: "3. Sécurité",
    body: "Les mots de passe sont gérés de façon sécurisée par notre fournisseur d'authentification et ne sont jamais stockés en clair. L'accès aux données financières est restreint par des règles d'autorisation strictes selon le rôle de chaque utilisateur.",
  },
  {
    title: "4. Conservation",
    body: "Les données sont conservées tant que votre compte est actif, puis archivées conformément à nos obligations légales et comptables.",
  },
  {
    title: "5. Vos droits",
    body: "Vous pouvez à tout moment consulter et corriger vos informations depuis votre profil, ou nous contacter pour toute demande relative à vos données personnelles.",
  },
];

export function PrivacyPage() {
  const { settings } = useSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold text-text-primary">Politique de confidentialité</h1>
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
