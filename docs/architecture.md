# Architecture

## Vue d'ensemble

```
┌─────────────────────────┐
│   Frontend (React SPA)  │
│  Vite · TS · Tailwind   │
└────────────┬─────────────┘
             │ @supabase/supabase-js
             │ (clé publique "anon", jamais de secret)
             ▼
┌─────────────────────────────────────────────────────────┐
│                        Supabase                         │
│                                                           │
│  ┌───────────────┐   ┌────────────────┐   ┌───────────┐ │
│  │  Supabase Auth │   │  PostgreSQL     │   │  Edge     │ │
│  │  (sessions,    │──▶│  + Row Level    │◀──│  Functions│ │
│  │  refresh token)│   │  Security       │   │  (Deno)   │ │
│  └───────────────┘   │  + fonctions RPC │   └───────────┘ │
│                       │  SECURITY DEFINER│                │
│                       └────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

Pourquoi pas d'Express/Node séparé ? Le brief d'origine spécifiait un backend Node/Express/Prisma. Après discussion avec le porteur du projet, l'architecture a été volontairement déplacée vers une intégration Supabase profonde : moins de code d'infrastructure à maintenir (auth, rotation de tokens, hashing de mot de passe déjà gérés par Supabase Auth), et des opérations financières dont l'atomicité est garantie nativement par Postgres plutôt que par du code de transaction applicatif.

## Trois couches d'exécution

1. **Lectures** : le frontend interroge directement les tables via PostgREST (`supabase.from(...)`), filtrées par les policies RLS selon l'utilisateur connecté. Aucune donnée n'est jamais renvoyée en dehors du périmètre autorisé par RLS, même si le frontend est compromis.

2. **Écritures métier simples** (marquer une notification comme lue, démarrer une mission, mettre à jour son profil) : passent aussi par PostgREST, protégées par des policies RLS `INSERT`/`UPDATE` restrictives et par des triggers de garde-fou (ex : `check_submission_allowed`).

3. **Opérations financières sensibles** (approuver une mission, approuver/rejeter un retrait ou un dépôt, changer un rôle, suspendre un compte) : passent exclusivement par des **fonctions RPC Postgres `SECURITY DEFINER`** (`approve_submission`, `approve_withdrawal`, `admin_change_role`, etc.). Chaque fonction :
   - vérifie elle-même le rôle de l'appelant (`auth.uid()` → `profiles.role`) avant toute écriture
   - effectue toutes ses écritures (wallet, ledger, commissions, notifications, audit log) **dans une seule transaction Postgres implicite** — soit tout est appliqué, soit rien ne l'est
   - écrit systématiquement une ligne dans `audit_log` pour les actions sensibles

## Pourquoi des fonctions Postgres plutôt qu'un serveur applicatif

Le brief insiste (sections 9 et 23) sur le fait qu'aucune opération financière ne doit modifier un solde sans passer par une transaction explicite. Avec un serveur Express, cela nécessite du code de transaction manuel (`BEGIN`/`COMMIT`/`ROLLBACK`) autour de plusieurs requêtes. Avec une fonction Postgres `SECURITY DEFINER`, l'atomicité est **garantie par construction** : le corps entier de la fonction s'exécute dans la transaction englobante de l'appel, et toute exception (`raise exception`) annule automatiquement toutes les écritures déjà effectuées dans la fonction.

## Edge Functions

Deux usages justifient une Edge Function plutôt qu'une fonction SQL :

- **Abstraction `PaymentProvider`** (`supabase/functions/payments`) : la logique d'intégration à un vrai fournisseur de paiement (appel HTTP à une API Mobile Money, vérification de signature de webhook) ne peut pas raisonnablement vivre en PL/pgSQL. La Edge Function orchestre l'appel au fournisseur puis délègue la mutation atomique du wallet à la fonction RPC `create_deposit_request` / `approve_deposit`. Voir [payments.md](payments.md).

Une Edge Function `admin-action` pour enrichir `audit_log` avec l'IP et le user-agent de l'acteur est prévue en itération suivante (actuellement `audit_log.ip`/`user_agent` restent `null` pour les actions appelées directement en RPC depuis le frontend — voir la table `audit_log` dans [database.md](database.md)).

## Frontend

- `src/services/*.ts` — toute la logique d'accès aux données (Supabase queries + appels RPC), jamais appelée directement depuis les composants de page sans passer par cette couche
- `src/contexts/AuthContext.tsx` — session Supabase Auth + profil métier associé
- `src/contexts/SettingsContext.tsx` — charge `system_settings` (nom de plateforme, devise, frais, etc.) avec fallback sur `src/config/branding.ts` si la table n'est pas encore accessible
- `src/components/ui/*` — design system (voir brief section 32), tokens de couleur définis une seule fois dans `src/index.css` (`@theme`)
- `src/pages/{public,user,admin}/*` — une page par route, aucune logique métier dupliquée : tout passe par `services/`

## Rôles et sécurité en profondeur

La sécurité n'est **jamais** appliquée uniquement côté frontend : les boutons/pages sont masqués pour le confort d'usage, mais la policy RLS et/ou la vérification de rôle à l'intérieur de la fonction RPC sont la véritable barrière. Un appel RPC direct avec un rôle insuffisant échoue toujours, quelle que soit l'interface utilisée pour l'appeler.
