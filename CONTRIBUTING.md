# Guide de contribution

Merci de contribuer à l'intranet Chromatotec ! Ce document résume les bonnes pratiques pour proposer une amélioration ou corriger un bug.

## Prérequis
- Node.js 20+
- npm 10+
- Navigateur Chromium (installé automatiquement par Playwright)
- Compte Supabase avec accès au projet (`service_role` à utiliser uniquement côté back-office)

## Installation
```bash
npm install
npx playwright install --with-deps
```

## Vérifications locales
Avant toute soumission, exécutez :
```bash
npm run lint
npm run format
npm run test:e2e
```
Les tests Playwright s'exécutent directement sur les fichiers statiques (`file://`).

## Style de code
- Respecter ESLint + Prettier (configuration fournie).
- Préférer les fonctions pures et les modules ES (`type: module`).
- Utiliser le store global (`js/state.js`) pour partager l'état entre composants.

## Flux Git
1. Créer une branche depuis `main` (`feature/...`, `fix/...`).
2. Commits atomiques avec message clair (impératif).
3. Ouvrir une Pull Request détaillant le contexte et les tests effectués.
4. S'assurer que la CI (lint + format + tests e2e) passe avant la revue.

## Accès Supabase
- Variables d'environnement attendues :
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- Les scripts SQL d'initialisation se trouvent dans `supabase/schema.sql`.
- Toute modification des policies ou triggers doit être validée avec l'équipe SRE.

## Rapport de bug
Merci de préciser :
- Le contexte (page, action réalisée)
- Les messages console / réseau
- La version du navigateur
- Le résultat attendu vs obtenu

Bon développement !
