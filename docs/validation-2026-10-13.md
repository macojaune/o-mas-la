# Validation du premier socle — 13 octobre 2026

Branche `refonte-2027`, base `origin/main` `c0c3249`. Ce document décrit le premier incrément de développement et son complément suivant les réponses de Marvin. Les tableaux initiaux portent sur `fd14356` ; les preuves du complément figurent plus bas. Il ne vaut ni validation terrain, ni autorisation de bascule en production.

## Environnement et données

- Web Next/Auth.js : `http://localhost:3185` ; console `/admin`, consultation `/map`.
- Aperçu web Expo : `http://localhost:3186` ; backend Convex **anonyme local** sur `http://127.0.0.1:3210`.
- Auth : SQLite neuve dans `.cache/omasla-auth.db`, migrations `0000` et `0001` au premier incrément, puis `0002_email_auth` appliquée sur cette même base de fixtures. Cette base est recréable avec le setup et le smoke ; aucune donnée réelle. Clés RSA et secret Auth.js générés pour ce banc uniquement.
- Comptes `simulation-*`, groupes marqués `[SIMULATION LOCALE]` et seuils raccourcis de test. Aucune donnée réelle importée, aucune clé fournisseur ou de cartographie utilisée.
- Exécution locale avec Node 26.10.0, pnpm 9.14.2. La CI utilise Node 22 via `.nvmrc` ; [celle du premier socle `fd14356` est verte](https://github.com/macojaune/o-mas-la/actions/runs/38474843291).
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

1. Configurer puis vérifier Google, Apple et l’envoi e-mail réel. Ces modes ont été choisis par Marvin ; l’e-mail utilise un lien de connexion sans mot de passe. Aucun identifiant fournisseur réel ni message sortant vers un utilisateur n’a été utilisé.
2. Vérifier sur téléphone le formulaire décidé : position GPS actuelle + heure du relevé, sans placement ni heure manuels. Les modérateurs gèrent aussi les habilitations des référents et les réglages ; l’attribution des rôles d’équipe reste administrateur.
3. Fournir une cible HTTPS de développement accessible aux téléphones, la cartographie Android/web et les accès de signature EAS/Apple/Google. `eas whoami` répond actuellement **Not logged in**.
4. Finaliser la compilation iOS et installer les binaires iOS/Android, puis exercer connexion, carte, relais, permissions, suivi écran verrouillé, réseau faible, reprise, notifications et consommation batterie. Une notification locale n’est pas une infrastructure push distante.
5. Calibrer fraîcheur, rayon, durée, précision GPS, seuil et persistance de vitesse. Les chiffres de la fixture ne sont jamais des valeurs de production.
6. Finaliser conservation/suppression des données et textes de confidentialité, puis répéter la migration et préparer la mise à jour coordonnée des anciens clients dont les écritures anonymes sont fermées par ce socle.

Aucun build Docker local, déploiement Coolify/Convex cloud, merge, soumission de store ou migration réelle n’a été effectué pendant cette validation. Les tickets restent en cours jusqu’aux étapes de validation applicables ; aucun passage en `Done` par l’agent.

## Compilation Android du premier socle

Sur `fd143566b4ccb63919e99dc0c3af6a40b0ea315c`, `assembleDebug` arm64-v8a réussit (premier build 10 min 31 s puis incrémental 31 s). APK 96 Mio, application `com.marvinl.omasla` 2.0.0, minSdk24/targetSdk36, signature debug v2 vérifiée. SHA256 : `745b65e7d42976553d0808249110569689f1ca88d96ca62684aea1bd6b550237`.

Cet APK est un dev-client **sans JavaScript embarqué**, à connecter à Metro. Il précède le complément GPS/connexion décrit ci-dessous. Aucun émulateur ni appareil n’a été lancé et cette compilation n’atteste aucun GPS arrière-plan, OAuth ou notification physique.

## Complément des décisions pendant le développement

- Déclaration mobile et web : acquisition fraîche au geste, heure GPS non modifiable, refus de permission/GPS ancien/hors ligne ; confirmation `byRequest` isolée au compte avant nouvelle acquisition après perte de réponse.
- Modération : habilitations et réglages accessibles à moderator/admin côté serveur et dans la console. Promotions de rôles d’équipe réservées aux administrateurs.
- Google, Apple et e-mail : raccordement Auth.js et retour natif PKCE conservés ; fournisseurs seulement proposés quand leur configuration est complète. Le lien e-mail est à usage unique et expire. Le transport Brevo est simulé dans les tests, jamais dirigé vers une boîte réelle.
- Migration 0002 additive pour tokens e-mail et limite d’envoi, index unique insensible à la casse des adresses de compte. Le contrôle des doublons réels et une répétition de migration restent nécessaires avant bascule.

Le smoke HTTP étendu passe **40 scénarios** avec vrais JWT/JWKS et serveur Convex local : modérateur autorisé sur annuaire minimal/réglages/habilitations, spectateur refusé, promotion de rôle refusée au modérateur et reçus isolés par compte. Les gardes de cible locale sont inchangées.

Le navigateur intégré vérifie avec une session de simulation : habilitation/retrait d’un référent par un modérateur, enregistrement des réglages, absence de l’éditeur de rôles d’équipe ; login non configuré explicite ; formulaire sans champs point/heure. Géolocalisation explicitement simulée : permission refusée, mesure ancienne refusée, fermeture/réouverture pendant l’acquisition puis réponse tardive ignorée, nouvelle position publiée avec confirmation serveur. Aucun débordement constaté à 390 px et 1280 px.

Les revues ont identifié puis fait traiter les réponses tardives d’un ancien formulaire, le quota e-mail placé trop tard dans Auth.js et la configuration d’origine canonique en production. Ces contrôles ne remplacent ni les identifiants fournisseurs réels ni les essais physiques.

Contrôles globaux du complément : **118 tests passent** (Convex 39, identité 42, mobile 37), types et lint passent, `pnpm lint:ws` passe, build Next passe et exports Expo iOS/Android/web passent. Deux avertissements restent dans les fichiers générés Convex. La CI du commit du complément sera rattachée dans la PR, distinctement de la CI déjà verte du premier socle.

Les tests email exercent les vrais handlers Auth.js avec transport Brevo simulé : hash et consommation unique, expiration/rejeu/concurrence, refus CSRF/origine, quotas avant insertion, panne de transport, liaison du lien au grant PKCE depuis un autre navigateur et URL canonique en production malgré Host falsifié. Le bridge Apple POST est testé à sa frontière ; aucune signature Apple réelle n’est simulée comme une preuve fournisseur. Le retour natif froid/chaud et les courses de déconnexion, y compris pendant la génération PKCE, sont couverts par 9 tests client.
