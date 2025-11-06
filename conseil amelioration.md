# Conseils d'amélioration pour l'intranet

## Expérience utilisateur
- Ajouter une authentification complète (email/mot de passe, magic link ou SSO) pour contrôler l'accès aux pages protégées et définir des profils (employé, manager, administrateur).
- Mettre en place une page de paramètres utilisateur permettant de modifier ses informations personnelles, préférences de notifications et photo de profil.
- Créer un mode sombre et clair avec sauvegarde du choix dans Supabase ou localStorage et bascule automatique selon les préférences système.
- Optimiser la navigation mobile : menus repliables, boutons plus grands, sections réorganisées pour l'affichage sur smartphones et raccourcis d'accès rapide aux modules critiques.
- Ajouter des notifications in-app et par email pour les annonces importantes, la validation de demandes et les rappels de tâches.

## Fonctionnalités métiers
- Implémenter un système de commentaires sur les actualités et documents pour favoriser les échanges internes (tables `news_comments`, `document_comments`, interface de modération, notifications des auteurs).
- Ajouter un module de messagerie ou chat interne en s'appuyant sur Supabase Realtime (rooms, conversations privées, présence en ligne, archives consultables).
- Permettre l'attachement de fichiers lors de la création de réservations ou de tâches, avec stockage dans Supabase Storage (bucket dédié, métadonnées liées dans la base, règles RLS adaptées).
- Intégrer un calendrier partagé synchronisé (iCal/Outlook) pour les plannings et les absences (flux ICS exportables, webhooks pour synchronisation bidirectionnelle, vues calendaires hebdo/mensuelles).
- Mettre en place des workflows de validation (ex : demandes de congés, réservations de salles) avec étapes d'approbation, notifications, relances et historique des décisions.

## Données et automatisations
- Créer des fonctions et triggers Supabase pour calculer automatiquement des indicateurs clés (retards, disponibilités, taux d'occupation des salles) et alimenter des vues dédiées.
- Ajouter des tâches planifiées (Edge Functions ou CRON) pour envoyer des rappels quotidiens aux employés (présences, échéances de tâches, validations en attente).
- Mettre en place des tableaux de bord analytiques supplémentaires en exploitant `dashboard_metrics` ou des vues dédiées, avec graphiques (D3.js/Chart.js) et filtres temporels.
- Assurer la sauvegarde et l'archivage régulier des documents via Supabase Storage versionné, avec politique de rétention et restauration.
- Documenter des scripts d'import/export CSV pour faciliter la migration de données historiques (CLI Supabase, scripts Node/TS, mapping des colonnes).

## Qualité logicielle
- Couvrir le front-end avec des tests end-to-end (Playwright/Cypress) pour garantir le bon fonctionnement des flux principaux (connexion, publication d'annonce, réservation, validation).
- Ajouter un linting automatisé (ESLint + Prettier) et une intégration continue (GitHub Actions) pour vérifier le code à chaque commit et appliquer un formatage homogène.
- Factoriser les composants UI récurrents (cards, modals, tables) via un framework (React/Vue) ou des Web Components pour réduire la duplication et faciliter l'évolution.
- Implémenter un service de gestion d'état (ex : Zustand, Pinia) pour simplifier la synchronisation des données Supabase et centraliser les règles métiers.
- Documenter un guide de contribution détaillé (CONTRIBUTING.md) pour faciliter l'onboarding des futurs développeurs, expliquer les conventions et le workflow Git.

## Sécurité
- Activer la journalisation (Audit Logs) et des alertes en cas d'accès suspect dans Supabase.
- Mettre en place une politique stricte de Row Level Security pour chaque table avec des rôles personnalisés.
- Chiffrer les données sensibles côté client avant l'envoi à Supabase lorsque nécessaire.
- Ajouter une rotation automatique des clés API et stocker les secrets dans un gestionnaire sécurisé (Vault, Doppler, etc.).
- Vérifier la conformité RGPD : droit d'accès, rectification et suppression des données des employés.

## Performance et déploiement
- Configurer un CDN (ex : Netlify, Vercel) et activer la compression des assets pour accélérer le chargement.
- Mettre en cache les requêtes Supabase fréquemment sollicitées avec SWR ou React Query.
- Implémenter un service worker pour activer le mode hors-ligne de base et les notifications push.
- Mettre en place des environnements de staging et production distincts avec synchronisation de la base.
- Surveiller les performances avec des outils comme Supabase Logs, Sentry ou Datadog.

## Pré-requis et éléments manquants pour mise en œuvre
- Accès administrateur Supabase (service_role sécurisé) pour créer les fonctions, triggers, policies et buckets de stockage supplémentaires.
- Clarification des règles métiers (processus d'approbation, rôles des collaborateurs) afin de configurer les workflows et la messagerie.
- Choix des outils tiers (service de messagerie email, solution de calendrier partagé, outil de monitoring) et fourniture des clés API associées.
- Budget temps/ressources pour introduire un framework front-end, refondre l'architecture et écrire les suites de tests end-to-end.
- Processus DevOps défini (environnements, pipeline CI/CD, gestion des secrets) pour automatiser les déploiements et la sauvegarde des données.

