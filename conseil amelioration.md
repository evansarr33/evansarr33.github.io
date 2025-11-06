# Conseils d'amélioration pour l'intranet

## Expérience utilisateur
- Ajouter une authentification complète (email/mot de passe, magic link ou SSO) pour contrôler l'accès aux pages protégées et définir des profils (employé, manager, administrateur).
- Mettre en place une page de paramètres utilisateur permettant de modifier ses informations personnelles, préférences de notifications et photo de profil.
- Créer un mode sombre et clair avec sauvegarde du choix dans Supabase ou localStorage et bascule automatique selon les préférences système.
- Optimiser la navigation mobile : menus repliables, boutons plus grands, sections réorganisées pour l'affichage sur smartphones et raccourcis d'accès rapide aux modules critiques.
- Ajouter des notifications in-app et par email pour les annonces importantes, la validation de demandes et les rappels de tâches.

## Fonctionnalités métiers
- ✅ Commentaires sur les actualités et documents en place (table `comments`, modale dédiée, rafraîchissement temps réel). Reste à ajouter la modération fine (suppression, reporting) et les notifications des auteurs.
- ✅ Messagerie interne en temps réel (canaux Supabase Realtime, export métriques). À planifier : conversations privées, présence en ligne et archivage longue durée.
- ✅ Pièces jointes pour réservations et tâches (bucket `intranet-attachments`, politiques RLS). À compléter avec un module de prévisualisation et un quota d'espace par équipe.
- ✅ Export iCal pour plannings et absences. Prochaine étape : synchronisation bidirectionnelle (webhooks Outlook/Google) et vue calendrier mensuelle.
- ✅ Workflows d'approbation (triggers, tableau d'administration). À enrichir avec des relances automatiques, des étapes multiples et la possibilité d'ajouter des pièces jointes aux décisions.

## Données et automatisations
- ✅ Fonctions et triggers Supabase ajoutés (métriques ressources, ponctualité, workflows). À suivre : calcul du taux d'occupation par ressource et indicateurs de productivité.
- ✅ Tâche planifiée via `cron.schedule` pour journaliser les rappels quotidiens. Reste à connecter une Edge Function pour envoyer réellement emails/notifications.
- ✅ Tableau de bord analytique (vue `engagement_dashboard`, section analytics). Prochain jalon : graphiques interactifs et filtres temporels (Chart.js/D3).
- ✅ Bucket versionné `intranet-attachments` créé. À formaliser : politique de rétention, chiffrement côté client et procédure de restauration.
- ⏳ Scripts d'import/export CSV à écrire (liste des colonnes, gabarits, vérifications d'intégrité) et documentation associée.

## Qualité logicielle
- ✅ Socle de tests end-to-end (Playwright + smoke tests). À compléter avec des scénarios avancés (création de réservation, validation de congé).
- ✅ Linting + formatage + CI GitHub Actions. Prévoir un badge de statut dans le README et l'analyse automatique des PR.
- ⏳ Factoriser les composants UI (framework ou Web Components) pour réduire la duplication et mutualiser les modales.
- ✅ Service de gestion d'état maison (`js/state.js`). À surveiller : généraliser l'usage du store sur toutes les pages.
- ✅ Guide de contribution (`CONTRIBUTING.md`). Reste à détailler les règles de nommage Supabase et la stratégie de branches.

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

