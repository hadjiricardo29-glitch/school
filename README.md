# Motosu

Plateforme africaine de missions digitales rémunérées, récompenses et parrainage — mobile-first, branding blanc dominant avec accent `#820000`.

> Le nom "Motosu" est la valeur par défaut de `system_settings.platform_name`, modifiable depuis `/admin/settings` sans toucher au code (voir [`frontend/src/config/branding.ts`](frontend/src/config/branding.ts)).

Inspirée des **mécaniques fonctionnelles publiques** de plateformes de missions/récompenses/parrainage (inscription, upline, équipe, missions, wallet, dépôts/retraits, commissions, dashboard, administration) — design, textes et code entièrement originaux.

## Sommaire

- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Installation](#installation)
- [Base de données](#base-de-données)
- [Développement](#développement)
- [Build de production](#build-de-production)
- [Variables d'environnement](#variables-denvironnement)
- [Rôles & permissions](#rôles--permissions)
- [Paiements](#paiements)
- [Tests](#tests)
- [Documentation détaillée](#documentation-détaillée)

## Architecture

Le projet est composé de deux dossiers :

```
/frontend    React + TypeScript + Vite + Tailwind CSS — parle directement à Supabase
/supabase    Schéma SQL, RLS, fonctions RPC métier, Edge Functions
```

**Il n'y a pas de serveur Express/Node séparé.** Le backend est entièrement porté par Supabase :

- **Supabase Auth** gère inscription/connexion/sessions/refresh tokens (remplace un JWT maison)
- **PostgreSQL + Row Level Security** appliquent les permissions par rôle sur chaque table
- **Des fonctions Postgres `SECURITY DEFINER`** exécutent les opérations financières sensibles (approbation de mission, retrait, dépôt) de façon **atomique** — toute la logique tient dans une seule transaction Postgres implicite
- **Deux Edge Functions** (Deno) gèrent l'abstraction `PaymentProvider` (voir [docs/payments.md](docs/payments.md))

Détails complets : [docs/architecture.md](docs/architecture.md).

## Stack technique

| Domaine | Choix |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Routing | React Router v7 |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Charts | Recharts |
| Icônes | Lucide React |
| Animations | Framer Motion |
| Validation | Zod (frontend) + contraintes SQL (serveur, source de vérité) |
| Notifications UI | react-hot-toast |

## Installation

```bash
cd frontend
npm install
```

## Base de données

1. Créez (ou utilisez) un projet Supabase.
2. Appliquez les migrations dans l'ordre, depuis `supabase/migrations/`, via le [Supabase CLI](https://supabase.com/docs/guides/cli) :

   ```bash
   supabase link --project-ref <votre-project-ref>
   supabase db push
   ```

   ou en collant chaque fichier dans l'éditeur SQL du dashboard Supabase, dans l'ordre numérique (`0001_...` → `0005_...`).

3. (Optionnel, développement uniquement) Chargez les données de démonstration :

   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   ⚠️ **`supabase/seed.sql` est strictement DEV ONLY** — il crée des comptes avec des mots de passe connus. Ne jamais l'exécuter sur un projet de production.

   Identifiants créés par le seed :

   | Email | Mot de passe | Rôle |
   |---|---|---|
   | admin@example.com | MotosuDemo#2026 | ADMIN |
   | prince@example.com | MotosuDemo#2026 | USER (racine du réseau de parrainage) |
   | marie@example.com | MotosuDemo#2026 | USER (filleule de prince) |
   | koffi@example.com | MotosuDemo#2026 | USER (filleul de marie) |
   | aisha@example.com | MotosuDemo#2026 | USER (filleule de prince) |
   | fatou@example.com | MotosuDemo#2026 | USER (filleule de koffi) |

4. Déployez les Edge Functions :

   ```bash
   supabase functions deploy payments
   ```

Schéma détaillé, index et politiques RLS : [docs/database.md](docs/database.md).

## Développement

```bash
cd frontend
cp .env.example .env   # renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm run dev
```

L'application tourne sur `http://localhost:5173`.

## Build de production

```bash
cd frontend
npm run build     # tsc -b && vite build → dossier frontend/dist
npm run preview   # sert le build localement pour vérification
```

## Variables d'environnement

Voir [`frontend/.env.example`](frontend/.env.example) :

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Aucun secret côté frontend : la clé `anon` est publique par design, toute autorisation réelle est appliquée par RLS et par les fonctions RPC côté serveur. Les Edge Functions utilisent `SUPABASE_SERVICE_ROLE_KEY`, injectée automatiquement par Supabase à l'exécution (jamais commitée).

## Rôles & permissions

| Rôle | Périmètre |
|---|---|
| `USER` | Ses propres données uniquement |
| `TASK_MANAGER` | Missions + revue des soumissions |
| `MODERATOR` | Utilisateurs + missions + soumissions, pas les finances |
| `FINANCE_ADMIN` | Dépôts + retraits |
| `ADMIN` | Accès total, seul rôle pouvant changer les rôles et les paramètres |

Appliqué en profondeur : policies RLS par table **et** vérification du rôle à l'intérieur de chaque fonction RPC sensible (défense en profondeur — jamais uniquement côté frontend).

## Activation de compte

Palier optionnel (activé par défaut, désactivable depuis `/admin/settings`) : un nouveau compte doit avoir déposé au moins un montant minimum configurable (2000 FCFA par défaut) avant de pouvoir réclamer une mission ou demander un retrait. Contrairement à un mur bloquant tout le dashboard, l'utilisateur voit toujours ses missions, son équipe et ses statistiques — seules ces deux actions sont gated, avec un bandeau clair l'invitant à déposer. La règle est appliquée **côté serveur** (triggers/fonctions RPC, voir `is_account_activated()` dans `supabase/migrations/0006_account_activation.sql`), pas seulement dans l'interface.

## Engagement (bonus, classement, communauté)

Trois mécaniques additionnelles, configurables depuis `/admin/settings`, ajoutées après revue de la structure fonctionnelle d'une plateforme concurrente (design et textes 100% originaux) :

- **Bonus de bienvenue** : montant configurable (0 = désactivé) crédité automatiquement à l'inscription
- **Classement** (`/leaderboard`) : top gains, exposé via une fonction `get_leaderboard()` dédiée qui ne révèle que pseudo/avatar/total gagné — jamais la table `wallets` complète
- **Liens communauté** (Telegram/WhatsApp) : optionnels, affichés sur `/referrals` uniquement s'ils sont renseignés

## Paiements

Tous les paiements sont en **mode démonstration** (`MockPaymentProvider` / `ManualPaymentProvider`) tant qu'aucun fournisseur réel (Mobile Money, carte, virement) n'est branché. L'UI affiche toujours "Demo payment" pour ne jamais laisser croire qu'un paiement réel a eu lieu. Voir [docs/payments.md](docs/payments.md) pour l'abstraction `PaymentProvider` et comment brancher un fournisseur réel.

## Tests

Les scénarios financiers critiques sont couverts par des tests [pgTAP](https://pgtap.org/) dans `supabase/tests/database/`, exécutés directement contre le schéma :

```bash
supabase test db
```

Couverture actuelle : cascade de commissions multi-niveaux, anti auto-parrainage / immutabilité de `referred_by`, anti double-soumission, atomicité des retraits (échec propre si solde insuffisant). Suite plus large prévue en itération suivante — voir la note "Explicitement différé" dans le plan de développement.

## Documentation détaillée

- [docs/architecture.md](docs/architecture.md)
- [docs/database.md](docs/database.md)
- [docs/payments.md](docs/payments.md)

## Statut de cette version

Cette version livre un **noyau fonctionnel complet et bout en bout** : inscription/parrainage, missions, soumissions, wallet, commissions multi-niveaux, dépôts/retraits en mode démo, administration (utilisateurs, missions, soumissions, dépôts, retraits, paramètres, audit, anti-fraude), landing page et branding. Sont volontairement allégés dans cette passe (et documentés comme suite) : la suite de tests exhaustive, les 5 fichiers de documentation restants, l'anti-fraude automatisée avancée et l'envoi d'emails réel.
