# Base de données

Schéma complet dans `supabase/migrations/`, appliqué dans cet ordre :

| Fichier | Contenu |
|---|---|
| `0001_schema.sql` | Enums, tables, index |
| `0002_functions_triggers.sql` | Helpers (`current_role`, `get_setting_*`), trigger de création de profil à l'inscription, garde-fous |
| `0003_rpc_business_logic.sql` | Fonctions RPC financières atomiques |
| `0004_rls_policies.sql` | Row Level Security sur toutes les tables + policies Storage |
| `0005_default_settings.sql` | Valeurs par défaut de `system_settings` et `commission_rules` |

## Convention monétaire

Tous les montants sont des **`BIGINT`**, jamais des `FLOAT`/`NUMERIC` flottants. La devise par défaut est `XOF` (affichée "FCFA"). Le FCFA n'ayant pas de subdivision utilisée en pratique, les montants sont stockés en **unités entières de FCFA** (pas de multiplication par 100) — un `reward` de `1500` signifie 1500 FCFA, pas 15 FCFA. Ce choix est documenté ici plutôt que dans le code pour éviter toute ambiguïté lors d'une future intégration avec un fournisseur de paiement qui utiliserait des unités mineures différentes (à convertir explicitement à la frontière).

## Tables principales

- **`profiles`** — identité métier (1:1 avec `auth.users`), rôle, statut, `referral_code` unique, `referred_by` (auto-référence, immuable après création)
- **`wallets`** — `available_balance`, `pending_balance` (fonds réservés par une demande de retrait en attente), `total_earned`, `total_withdrawn`, `total_deposited`
- **`transactions`** — le **ledger** : chaque mouvement financier (positif = crédit, négatif = débit), avec `reference` unique et `metadata` jsonb. C'est la source de vérité auditable ; les colonnes de `wallets` sont des soldes dérivés maintenus en cohérence par les fonctions RPC
- **`tasks`** / **`task_submissions`** — missions et soumissions, avec `single_submission_per_user` et un trigger qui empêche toute double réclamation
- **`commission_rules`** — barème multi-niveaux (`level`, `percentage`, `fixed_amount`, `active`), **jamais codé en dur**, modifiable depuis `/admin/settings`
- **`commissions`** — trace de chaque commission versée (bénéficiaire, utilisateur source, niveau, montant)
- **`withdrawal_requests`** / **`deposits`** — files d'attente financières avec statut et traçabilité de l'agent qui a traité la demande
- **`notifications`**, **`audit_log`**, **`fraud_flags`**, **`system_settings`** — voir brief sections 19, 25, 26, 46-47

## Index

Alignés sur le brief (section 30) : `username`, `referral_code`, `referred_by` sur `profiles` ; `reference` (unique), `user_id`, `created_at`, `type` sur `transactions` ; `status`, `category`, `deadline` sur `tasks` ; `status`, `(task_id, user_id)` sur `task_submissions` ; `status`, `created_at` sur `withdrawal_requests`.

## Row Level Security

Activé sur **toutes** les tables métier. Principes :

- Un utilisateur ne lit/modifie que ses propres lignes (`auth.uid() = user_id`)
- Le staff (`ADMIN`/`MODERATOR`/`FINANCE_ADMIN`/`TASK_MANAGER`) a des policies élargies scoping son périmètre exact — jamais un accès total implicite
- Aucune policy `INSERT`/`UPDATE` n'existe pour les colonnes de solde (`wallets`) ou pour faire passer une soumission à `APPROVED` : ces mutations passent **uniquement** par les fonctions RPC `SECURITY DEFINER`, qui elles-mêmes revérifient le rôle de l'appelant

## Fonctions RPC (appelées depuis `src/services/*.ts` via `supabase.rpc(...)`)

| Fonction | Rôle requis | Effet |
|---|---|---|
| `approve_submission(submission_id, note)` | ADMIN / MODERATOR / TASK_MANAGER | Crédite la récompense, incrémente `completions_count`, déclenche la cascade de commissions multi-niveaux, notifie, audite |
| `reject_submission(submission_id, note)` | idem | Marque REJECTED, notifie, audite |
| `create_withdrawal_request(amount, method, destination)` | utilisateur lui-même | Vérifie solde/minimum/cooldown, réserve les fonds (`available → pending`) |
| `approve_withdrawal(id)` | ADMIN / FINANCE_ADMIN | Déduit `pending_balance`, incrémente `total_withdrawn`, transaction WITHDRAWAL |
| `reject_withdrawal(id, reason)` | ADMIN / FINANCE_ADMIN | Restitue les fonds réservés vers `available_balance` |
| `create_deposit_request(amount, method, provider)` | utilisateur lui-même | Crée le dépôt ; auto-complète si `provider = 'mock'` |
| `approve_deposit(id)` / `reject_deposit(id, reason)` | ADMIN / FINANCE_ADMIN (ou l'utilisateur pour son propre dépôt mock) | Crédite le wallet, transaction DEPOSIT |
| `admin_set_user_status(user_id, status)` | ADMIN / MODERATOR | Suspend/active un compte, audite |
| `admin_change_role(user_id, role)` | ADMIN uniquement | Change le rôle, audite |
| `admin_adjust_balance(user_id, amount, description)` | ADMIN / FINANCE_ADMIN | Ajustement manuel, **description obligatoire**, transaction ADJUSTMENT, audite |

## Trigger d'inscription

`handle_new_user()` se déclenche à l'insertion dans `auth.users` (donc juste après `supabase.auth.signUp()`) : il crée automatiquement la ligne `profiles` correspondante, génère un `referral_code` unique, résout le parrain à partir de `raw_user_meta_data->>'referral_code'` (accepte un code de parrainage ou un nom d'utilisateur), et crée le `wallet` à solde zéro. L'auto-parrainage est structurellement impossible (le nouvel utilisateur n'existe pas encore au moment de la résolution du parrain), et `referred_by` devient immuable après création (`trg_prevent_referred_by_change`), ce qui empêche toute boucle.
