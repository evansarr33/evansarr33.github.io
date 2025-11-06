# Intranet

Ce dépôt contient la page d'accueil de l'intranet de la société.

## Pré-requis

- Un projet Supabase provisionné avec le script `supabase/schema.sql` (exécutez-le
  depuis l'éditeur SQL Supabase ou la CLI pour créer les tables, politiques RLS et
  données de démonstration).
- Les clés `anon` et `service_role` de l'instance Supabase. La clé `anon` est
  utilisée côté client dans `js/supabaseClient.js`. La clé `service_role` n'est
  jamais exposée dans le navigateur mais permet d'exécuter le script SQL complet
  en cas de besoin.

## Lancer le site en local

Le site repose sur des modules JavaScript (`type="module"`). Pour que les imports
fonctionnent correctement, il est recommandé d'utiliser un serveur HTTP local :

```bash
npm install --global serve
serve .
```

Ensuite, ouvrez [http://localhost:3000](http://localhost:3000) (ou le port indiqué
par `serve`) dans votre navigateur.

## Vérifications automatisées

Après `npm install`, vous pouvez exécuter les commandes suivantes :

```bash
npm run lint         # Vérifie la qualité du code avec ESLint
npm run format       # Vérifie le formatage Prettier
npm run test:e2e     # Lancement des tests Playwright (aucun serveur requis)
```

La CI GitHub Actions (`.github/workflows/ci.yml`) lance automatiquement ces commandes à chaque push
ou Pull Request.

## Structure

- `index.html` – tableau de bord principal connecté à Supabase (actualités,
  documents, réservations, tâches, etc.).
- `affichage.html`, `plannings.html`, `pointeuse.html`, `gestion.html` – pages
  complémentaires alimentées par Supabase.
- `js/` – scripts clients modulaires, dont `supabaseClient.js` qui centralise la
  configuration Supabase.
- `style.css` – feuille de style commune à toutes les pages.
