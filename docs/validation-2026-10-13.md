# Validation du premier socle — 13 octobre 2026

Branche `refonte-2027`, base `origin/main` `c0c3249`. Ce document décrit le premier incrément de développement. Il ne vaut ni validation terrain, ni autorisation de bascule en production.

## Environnement et données

- Web Next/Auth.js : `http://localhost:3185` ; console `/admin`, consultation `/map`.
- Aperçu web Expo : `http://localhost:3186` ; backend Convex **anonyme local** sur `http://127.0.0.1:3210`.
- Auth : SQLite neuve dans `.cache/omasla-auth.db`, migrations `0000` et `0001` appliquées. Clés RSA et secret Auth.js générés pour ce banc uniquement.
- Comptes `simulation-*`, groupes marqués `[SIMULATION LOCALE]` et seuils raccourcis de test. Aucune donnée réelle importée, aucune clé fournisseur ou de cartographie utilisée.
- Exécution locale avec Node 26.10.0, pnpm 9.14.2. La CI utilise Node 22 via `.nvmrc` ; son résultat est à vérifier sur le commit poussé.
- Le checkout de la homepage `feat/homepage-darse-image` et ses fichiers non versionnés sont conservés séparément.

## Contrôles automatisés

| Contrôle                          | Résultat local           | Portée                                                                        |
| --------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `pnpm check`                      | Passe                    | Types, lint et tests du monorepo                                              |
| Tests Convex                      | 34 passent               | Autorisation, sessions, fraîcheur, observations, arrêts et passation          |
| Tests identité                    | 27 passent               | Routes Auth.js, PKCE, JWT/JWKS, révocation et concurrence                     |
| Tests mobile                      | 26 passent               | Catalogue, cache, navigation, suivi et notifications vitesse/zone             |
| `pnpm lint:ws`                    | Passe                    | Cohérence des dépendances du workspace                                        |
| `pnpm --filter @oyo/nextjs build` | Passe                    | Compilation, types et génération des routes Next 16                           |
| `expo install --check`            | Passe                    | Dépendances alignées sur Expo 57                                              |
| Export Expo iOS / Android / web   | Passe                    | Bundles JS/Hermes et assets, **pas des binaires natifs**                      |
| `smoke-local.mjs`                 | 21 vérifications passent | Vrais HTTP Auth.js, signature RSA et vérification JWKS par le serveur Convex  |
| Garde de cible du smoke           | Passe                    | Les cinq overrides Convex sensibles synthétiques sont refusés avant appel CLI |
| `git diff --check`                | Passe                    | Absence d’erreurs d’espacement dans le diff                                   |

Deux avertissements lint restent dans les fichiers Convex générés : directives `eslint-disable` devenues inutiles. Le lint ne contient aucune erreur. React Doctor mobile atteint 80/100 ; ses trois avertissements de structure ne constituent pas une validation fonctionnelle native.

Le smoke exerce : consultation anonyme, refus des opérations privées, déclaration hors live et retrait, exclusivité du démarrage, réception GPS, priorité du live, passation, refus de l’ancien émetteur, arrêt terminal, révocation malgré un JWT encore valide, suppression de session et refus d’une origine étrangère. Il ne simule pas le moteur d’authentification de Convex ; seuls ses utilisateurs et positions sont des fixtures.

## Parcours exercés dans le navigateur intégré

| Parcours                     | Preuve obtenue                                                                                                                                   | Limite                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Catalogue Expo public        | Liste, recherche, fiche et groupe sans position consultables sans compte                                                                         | Aperçu web, pas le composant de carte natif                                             |
| État live puis arrêt         | Un live créé via l’API apparaît dans la fiche ; l’arrêt depuis la console est répercuté                                                          | GPS injecté par le banc de simulation                                                   |
| Vieillissement               | L’âge augmente ; une position périmée retire l’accès à l’itinéraire ; le groupe reste listé                                                      | Seuils de test raccourcis                                                               |
| Déclaration Expo anonyme     | Compte requis et groupe choisi conservé                                                                                                          | Retour OAuth externe non testé                                                          |
| Déclaration web authentifiée | Choix du groupe, position à la demande, publication confirmée et visible dans la console                                                         | Géolocalisation du navigateur remplacée explicitement par des coordonnées de simulation |
| Console admin                | Affichage des sessions, nom du référent, âge du point, retrait confirmé d’une observation, arrêt confirmé du live, sauvegarde d’un rayon de test | Compte Auth.js de simulation, pas de fournisseur externe                                |
| Déconnexion web              | Retour à `/map`, session HTTP devenue nulle, `/admin` redemande la connexion                                                                     | Le refus en cas de panne est couvert par les tests de routes/client                     |
| Accès anonyme à l’admin      | Écran de connexion, sans données privées                                                                                                         | Les autres refus de rôle sont aussi vérifiés côté serveur                               |
| Affichage web                | Carte/annuaire et console contrôlés à 1280 px et 390 px sans débordement horizontal                                                              | Le fond Mapbox reste indisponible sans token                                            |

Le navigateur partagé a produit des timeouts intermittents lors de captures/redimensionnements. Des onglets neufs ont permis de reprendre les interactions. Ces erreurs d’outillage ne sont pas comptées comme des tests réussis ; les exports, réponses HTTP et parcours listés ci-dessus constituent des preuves distinctes.

## Revue et correctifs

Les deux axes de revue ont été traités séparément : aucun écart matériel de standards restant dans le périmètre identité/backend/CI ; la revue de spécification a relevé l’alerte de sortie de zone, corrigée puis relue avec huit tests de notification et de concurrence.

La revue indépendante a conduit à corriger :

- une réponse GPS terminale tardive pouvant arrêter une nouvelle génération de suivi ;
- l’absence de notification locale de fin pour sortie de zone (Q17), désormais dédupliquée entre réponse GPS et réconciliation des sessions et refusée pour une ancienne génération ;
- une déconnexion Auth.js pouvant sembler réussie malgré l’échec de révocation Convex ;
- la restauration de l’authentification native après retour du réseau ;
- le risque de sélection d’une cible Convex différente par des variables héritées du shell ;
- l’absence du nom de l’émetteur dans la console de permanence.

Les tests de régression correspondants passent. Les huit tests de notifications couvrent notamment le refus de permission, la réponse GPS perdue et la réconciliation qui arrive en premier. Ils ne prouvent pas la réception physique d’une notification par iOS/Android. Le diff de migration Drizzle ajoute `native_auth_grant` et conserve les définitions des tables existantes. Les anciens identifiants et données Convex restent présents dans le schéma additif. Cette inspection ne remplace pas une répétition de migration sur une copie autorisée des données réelles.

## Conditions restant à remplir

Essai iOS local complémentaire : Xcode 26.6 et SDK iPhoneSimulator 26.5 présents, prébuild réussi et 123 pods installés avec CocoaPods 1.17/Ruby 4 isolés. Aucun runtime simulateur n’est installé (`simctl list runtimes` vide). Les deux formes de compilation échouent sur la destination manquante, dont la construction interne d’ExpoModulesJSI. Aucun binaire `.app` obtenu et aucune compilation iOS complète revendiquée. Installer ce runtime puis reprendre la compilation ; EAS n’est pas requis pour cet essai simulateur.

1. Confirmer le fournisseur public de connexion et configurer son environnement de développement. Discord existant est conservé conditionnellement ; aucun fournisseur supplémentaire n’a été créé.
2. Confirmer les hypothèses proposées : déclaration native avec point et heure ; administrateurs responsables des habilitations/paramètres, modérateurs responsables des arrêts/retraits.
3. Fournir une cible HTTPS de développement accessible aux téléphones, la cartographie Android/web et les accès de signature EAS/Apple/Google. `eas whoami` répond actuellement **Not logged in**.
4. Compiler et installer de vrais binaires iOS/Android, puis exercer connexion, carte, relais, permissions, suivi écran verrouillé, réseau faible, reprise, notifications et consommation batterie. Une notification locale n’est pas une infrastructure push distante.
5. Calibrer fraîcheur, rayon, durée, précision GPS, seuil et persistance de vitesse. Les chiffres de la fixture ne sont jamais des valeurs de production.
6. Finaliser conservation/suppression des données et textes de confidentialité, puis répéter la migration et préparer la mise à jour coordonnée des anciens clients dont les écritures anonymes sont fermées par ce socle.

Aucun build Docker local, déploiement Coolify/Convex cloud, merge, soumission de store ou migration réelle n’a été effectué pendant cette validation. Les tickets restent en cours jusqu’aux étapes de validation applicables ; aucun passage en `Done` par l’agent.
